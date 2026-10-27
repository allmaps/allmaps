import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Worker } from 'node:worker_threads'

import { afterEach, describe, expect, test } from 'vitest'

import { defineScreenshot, screenshotUrl } from '@allmaps/ui/screenshots'
import { createManifest, readManifest, writeManifest } from '../src/manifest.ts'
import { registrationModule } from '../src/vite.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function temporaryDirectory() {
  const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-test-'))
  directories.push(directory)
  return directory
}

const options = {
  slug: 'viewer-rotterdam',
  url: 'https://viewer.allmaps.org/?url=example#map'
}

describe('screenshot definitions', () => {
  test('normalizes defaults and keeps URL query and hash', () => {
    const definition = defineScreenshot(options)
    expect(definition.url).toBe(options.url)
    expect(definition.viewport).toEqual({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2
    })
    expect(screenshotUrl(definition)).toBe(
      'https://files.allmaps.org/screenshots/viewer-rotterdam/v1.webp'
    )
  })

  test('retains opt-in render readiness and rejects invalid values', () => {
    expect(
      defineScreenshot({ ...options, waitForRender: true }).waitForRender
    ).toBe(true)
    expect(defineScreenshot({ ...options, waitForRender: false })).toEqual(
      defineScreenshot(options)
    )
    expect(() =>
      defineScreenshot({
        ...options,
        waitForRender: 'yes' as unknown as boolean
      })
    ).toThrow('waitForRender must be a boolean')
  })

  test('deduplicates normalized definitions and supports published versions', () => {
    const manifest = createManifest([
      { ...options, version: 2 },
      { ...options, viewport: { width: 1440 } },
      options
    ])
    expect(
      manifest.screenshots.map((definition) => definition.version)
    ).toEqual([1, 2])
  })

  test('rejects conflicting definitions for the same destination', () => {
    expect(() =>
      createManifest([
        options,
        { ...options, url: 'https://editor.allmaps.org' }
      ])
    ).toThrow('Conflicting screenshot')
  })

  test.each(['../escape', 'foo/bar', '', 'UPPERCASE', undefined])(
    'rejects unsafe slug %s',
    (slug) => {
      expect(() =>
        defineScreenshot({ ...options, slug: slug as string })
      ).toThrow('slug')
    }
  )

  test.each(['file:///etc/passwd', 'https://user:password@example.org'])(
    'rejects unsupported capture URL %s',
    (url) => {
      expect(() => defineScreenshot({ ...options, url })).toThrow('HTTP(S)')
    }
  )
})

test('collects registrations across independent prerender workers', async () => {
  const directory = await temporaryDirectory()
  const definitions = [
    defineScreenshot(options),
    defineScreenshot({ ...options, slug: 'editor' })
  ]
  const registration = registrationModule(directory)
    .replace(
      "import { building } from '$app/environment'",
      'const building = true'
    )
    .replace('export function', 'function')
  await Promise.all(
    [...definitions, definitions[0]].map(
      (definition) =>
        new Promise<void>((resolve, reject) => {
          const worker = new Worker(
            `${registration}\nregisterScreenshot(${JSON.stringify(definition)})`,
            { eval: true }
          )
          worker.on('error', reject)
          worker.on('exit', (code) =>
            code ? reject(new Error(`Worker exited ${code}`)) : resolve()
          )
        })
    )
  )
  const filename = path.join(directory, 'output/manifest.json')
  const manifest = await writeManifest(directory, filename)
  expect(manifest.screenshots.map((definition) => definition.slug)).toEqual([
    'editor',
    'viewer-rotterdam'
  ])
  expect(await readManifest(filename)).toEqual(manifest)
})

test('registration is inert outside the build', async () => {
  const directory = path.join(await temporaryDirectory(), 'does-not-exist')
  const registration = registrationModule(directory)
    .replace(
      "import { building } from '$app/environment'",
      'const building = false'
    )
    .replace('export function', 'function')
  const run = new Function(`${registration}; return registerScreenshot`)
  expect(run()(defineScreenshot(options))).toEqual(defineScreenshot(options))
})

test('reports a missing manifest with the next step', async () => {
  await expect(
    readManifest(path.join(await temporaryDirectory(), 'missing.json'))
  ).rejects.toThrow('Build the app first')
})

test('normalizes preparation steps and sorted capture targets through JSON manifests', () => {
  const definition = defineScreenshot({
    ...options,
    steps: [
      { action: 'click', selector: '#settings' },
      { action: 'waitFor', selector: '#panel' }
    ],
    targets: { panel: '#panel', button: '#settings' }
  })
  expect(definition.steps?.[1]).toEqual({
    action: 'waitFor',
    selector: '#panel',
    state: 'visible'
  })
  expect(Object.keys(definition.targets!)).toEqual(['button', 'panel'])
  expect(
    createManifest([definition, JSON.parse(JSON.stringify(definition))])
      .screenshots
  ).toHaveLength(1)
  expect(() =>
    createManifest([
      definition,
      { ...definition, targets: { panel: '#different' } }
    ])
  ).toThrow('Conflicting screenshot')
})

test.each([
  { steps: 'click' },
  { steps: [{ action: 'evaluate', selector: '#button' }] },
  { steps: [{ action: 'click', selector: '' }] },
  { steps: [{ action: 'fill', selector: '#input', value: 1 }] },
  { steps: [{ action: 'press', selector: '#input', key: '' }] },
  { steps: [{ action: 'waitFor', selector: '#input', state: 'detached' }] },
  { targets: [] },
  { targets: { 'bad name': '#button' } },
  { targets: { button: '' } }
])('rejects invalid preparation options %j', (invalid) => {
  expect(() =>
    defineScreenshot({ ...options, ...invalid } as Parameters<
      typeof defineScreenshot
    >[0])
  ).toThrow()
})
