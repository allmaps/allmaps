import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
  access
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Worker } from 'node:worker_threads'
import { afterEach, expect, test, vi } from 'vitest'
import type { Plugin } from 'vite'

import { screenshots } from '../src/astro.ts'
import { defineScreenshot } from '@allmaps/ui/screenshots'
import { readManifest } from '../src/manifest.ts'

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

async function fixture(options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'screenshots-astro-test-'))
  const integration = screenshots(options)
  const logger = { info: vi.fn() }
  let plugin: Plugin
  async function hook(name: keyof typeof integration.hooks, options = {}) {
    const handler = integration.hooks[name]
    if (typeof handler !== 'function')
      throw new Error(`Missing Astro hook: ${name}`)
    return Reflect.apply(handler, undefined, [options])
  }
  await hook('astro:config:setup', {
    updateConfig(config: { vite: { plugins: Plugin[] } }) {
      plugin = config.vite.plugins[0]
    }
  })
  await hook('astro:config:done', {
    config: { root: pathToFileURL(root + '/') }
  })
  function call(
    name: keyof Plugin,
    environment: string,
    args: unknown[] = [],
    command = 'build'
  ) {
    const value = plugin[name]
    if (!value) return undefined
    const handler =
      typeof value === 'function'
        ? value
        : (value as { handler: (...args: unknown[]) => unknown }).handler
    return Reflect.apply(
      handler,
      {
        environment: {
          name: environment,
          config: { root, base: '/docs/', command }
        }
      },
      args
    )
  }
  function source(environment: string, command = 'build') {
    const id = call(
      'resolveId',
      environment,
      [
        '@allmaps/ui/screenshots/integration',
        '/docs/Guide.svelte',
        { ssr: environment !== 'client' }
      ],
      command
    )
    return String(call('load', environment, [id], command))
  }
  cleanups.push(async () => {
    await call('buildEnd', 'prerender', [new Error('Test cleanup')])
    await rm(root, { recursive: true, force: true })
  })
  return { root, hook, call, source, logger }
}

function load(source: string) {
  return new Function(
    source.replaceAll('export function', 'function') +
      '; return { registerScreenshot, screenshotImageUrl }'
  )()
}

async function registerInWorker(
  source: string,
  slug: string,
  url = 'https://editor.allmaps.org'
) {
  const definition = defineScreenshot({ slug, url })
  await new Promise<void>((resolve, reject) => {
    const worker = new Worker(
      `${source.replaceAll('export function', 'function')}\nregisterScreenshot(${JSON.stringify(definition)})`,
      { eval: true }
    )
    worker.on('error', reject)
    worker.on('exit', (code) =>
      code ? reject(new Error(`Worker exited ${code}`)) : resolve()
    )
  })
  return definition
}

test('collects prerender workers after bundling and writes a manifest only when Astro finishes', async () => {
  const { root, hook, call, source, logger } = await fixture({
    manifest: 'captures/manifest.json'
  })
  const filename = path.join(root, 'captures/manifest.json')
  await mkdir(path.dirname(filename), { recursive: true })
  await writeFile(filename, 'stale manifest')
  const listeners = process.listenerCount('exit')
  await hook('astro:build:start')
  await expect(access(filename)).rejects.toThrow()

  const prerender = source('prerender')
  expect(prerender).not.toContain('$app/environment')
  for (const environment of ['client', 'ssr']) {
    const inert = source(environment)
    expect(inert).not.toContain('node:fs')
    expect(inert).not.toContain('allmaps-screenshots-astro-')
    load(inert).registerScreenshot(
      defineScreenshot({ slug: 'not-prerendered', url: 'https://example.org' })
    )
  }
  // Astro generates pages after Vite has finished individual environment bundles.
  await call('buildEnd', 'prerender')
  await call('closeBundle', 'prerender')
  await call('writeBundle', 'client')
  await expect(access(filename)).rejects.toThrow()
  const definitions = await Promise.all([
    registerInWorker(prerender, 'editor'),
    registerInWorker(prerender, 'viewer'),
    registerInWorker(prerender, 'editor')
  ])
  await hook('astro:build:done', { logger })
  expect((await readManifest(filename)).screenshots).toEqual(
    definitions.slice(0, 2)
  )
  expect(logger.info).toHaveBeenCalledWith(
    expect.stringContaining('Collected 2 screenshots')
  )
  expect(process.listenerCount('exit')).toBe(listeners)
  expect(source('prerender')).not.toContain('node:fs')
})

test('conflicts fail the build, invalidate stale output, and do not contaminate another build', async () => {
  const { root, hook, source, logger } = await fixture()
  const filename = path.join(root, '.screenshots/manifest.json')
  await hook('astro:build:start')
  await registerInWorker(source('prerender'), 'editor')
  await registerInWorker(
    source('prerender'),
    'editor',
    'https://example.org/different'
  )
  await expect(hook('astro:build:done', { logger })).rejects.toThrow(
    'Conflicting screenshot'
  )
  await expect(access(filename)).rejects.toThrow()
  expect(source('prerender')).not.toContain('node:fs')

  await hook('astro:build:start')
  await registerInWorker(source('prerender'), 'fresh')
  await hook('astro:build:done', { logger })
  expect(
    (await readManifest(filename)).screenshots.map(({ slug }) => slug)
  ).toEqual(['fresh'])
})

test('bundling errors clean up collection and leave no current manifest', async () => {
  const { root, hook, call, source, logger } = await fixture()
  await hook('astro:build:start')
  await registerInWorker(source('prerender'), 'editor')
  await call('buildEnd', 'client', [new Error('Fixture bundling failure')])
  expect(source('prerender')).not.toContain('node:fs')
  await hook('astro:build:done', { logger })
  await expect(
    access(path.join(root, '.screenshots/manifest.json'))
  ).rejects.toThrow()
})

test('dev previews local images without collecting, and empty builds replace old manifests', async () => {
  const { root, hook, source, logger } = await fixture()
  const preview = source('astro', 'serve')
  expect(preview).not.toContain('node:fs')
  expect(
    load(preview).screenshotImageUrl(
      'screenshots/editor/v1.webp',
      'https://example.org/editor.webp'
    )
  ).toBe(
    '/docs/__allmaps/screenshots/editor/v1.webp?fallback=https%3A%2F%2Fexample.org%2Feditor.webp'
  )
  await hook('astro:build:start')
  await hook('astro:build:done', { logger })
  expect(
    JSON.parse(
      await readFile(path.join(root, '.screenshots/manifest.json'), 'utf8')
    )
  ).toEqual({ version: 1, screenshots: [] })
})
