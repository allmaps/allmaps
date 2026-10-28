import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'

import { screenshots } from '../src/vite.ts'
import { readManifest } from '../src/manifest.ts'
import { defineScreenshot } from '@allmaps/ui/screenshots'
import {
  registerScreenshot,
  screenshotImageUrl
} from '@allmaps/ui/screenshots/integration'

test('the default integration renders without a collector', () => {
  const definition = defineScreenshot({
    slug: 'editor',
    url: 'https://editor.allmaps.org'
  })
  expect(registerScreenshot(definition)).toBe(definition)
  expect(
    screenshotImageUrl(
      'screenshots/editor/v1.webp',
      'https://example.org/image.webp'
    )
  ).toBe('https://example.org/image.webp')
})

test('the explicit integration works from any importer and isolates build registration from clients', async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'screenshot-integration-')
  )
  const plugin = screenshots()
  const context = {
    environment: {
      config: {
        command: 'build',
        build: { ssr: true },
        root: directory,
        base: '/'
      },
      logger: { info() {} }
    }
  }
  function call(name: keyof typeof plugin, ...args: unknown[]) {
    const hook = plugin[name]
    const handler =
      typeof hook === 'function'
        ? hook
        : (hook as { handler: (...args: unknown[]) => unknown }).handler
    return Reflect.apply(handler, context, args)
  }
  try {
    await call('buildStart')
    const serverId = call(
      'resolveId',
      '@allmaps/ui/screenshots/integration',
      '/renamed/Component.svelte',
      { ssr: true }
    )
    const clientId = call(
      'resolveId',
      '@allmaps/ui/screenshots/integration',
      '/another/location.ts',
      { ssr: false }
    )
    expect(serverId).not.toBe(clientId)
    expect(
      call(
        'resolveId',
        '../shared/register-screenshot.js',
        '/ui/dist/components/Screenshot.svelte',
        { ssr: true }
      )
    ).toBeUndefined()
    const server = String(call('load', serverId))
    const client = String(call('load', clientId))
    expect(client).not.toContain('$app/environment')
    expect(client).not.toContain('node:fs')
    expect(client).not.toContain(directory)
    const load = (source: string) =>
      new Function(
        source
          .replace(
            "import { building } from '$app/environment'",
            'const building = true'
          )
          .replaceAll('export function', 'function') +
          '; return { registerScreenshot, screenshotImageUrl }'
      )()
    const definition = defineScreenshot({
      slug: 'editor',
      url: 'https://editor.allmaps.org'
    })
    expect(load(server).registerScreenshot(definition)).toEqual(definition)
    load(client).registerScreenshot({ ...definition, slug: 'client-only' })
    await call('writeBundle')
    expect(
      (await readManifest(path.join(directory, '.screenshots/manifest.json')))
        .screenshots
    ).toEqual([definition])
    expect(
      load(server).screenshotImageUrl('key', 'https://example.org/image.webp')
    ).toBe('https://example.org/image.webp')

    context.environment.config.command = 'serve'
    context.environment.config.base = '/docs/'
    const preview = load(String(call('load', clientId)))
    expect(
      preview.screenshotImageUrl(
        'screenshots/editor/v1.webp',
        'https://example.org/image.webp'
      )
    ).toBe(
      '/docs/__allmaps/screenshots/editor/v1.webp?fallback=https%3A%2F%2Fexample.org%2Fimage.webp'
    )
  } finally {
    await call('closeBundle')
    await rm(directory, { recursive: true, force: true })
  }
})
