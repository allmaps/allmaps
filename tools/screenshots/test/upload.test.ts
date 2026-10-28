import { expect, test, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { contentHash } from '../src/geometry.ts'

import {
  defineScreenshot,
  screenshotKey,
  screenshotGeometryKey
} from '@allmaps/ui/screenshots'
import { uploadArguments, publishScreenshot } from '../src/upload.ts'

test('uses the Assets exact-key file upload contract without implicit overwrite', () => {
  const definition = defineScreenshot({
    url: 'https://viewer.allmaps.org',
    slug: 'viewer',
    version: 2
  })
  const args = uploadArguments(
    '/a path/assets.ts',
    '/a path/viewer.webp',
    definition
  )
  expect(args).toEqual([
    '/a path/assets.ts',
    'upload',
    'file',
    '/a path/viewer.webp',
    '--key',
    'screenshots/viewer/v2.webp',
    '--content-type',
    'image/webp'
  ])
  expect(
    uploadArguments('/assets.ts', '/viewer.webp', definition, true).at(-1)
  ).toBe('--overwrite')
})

test('publishes geometry separately from private capture metadata', () => {
  const definition = defineScreenshot({
    url: 'https://example.org',
    slug: 'editor'
  })
  expect(
    uploadArguments(
      '/assets.ts',
      '/v1.geometry.json',
      definition,
      false,
      'geometry'
    )
  ).toEqual([
    '/assets.ts',
    'upload',
    'file',
    '/v1.geometry.json',
    '--key',
    'screenshots/editor/v1.geometry.json',
    '--content-type',
    'application/json'
  ])
})

test.each([false, true])(
  'publishes validated pairs (crop only: %s) and resumes partial uploads',
  async (cropOnly) => {
    const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-publish-'))
    const assetsCli = path.join(directory, 'assets.mjs')
    const definition = defineScreenshot({
      slug: 'editor',
      url: 'https://example.org',
      ...(cropOnly
        ? { crop: { selector: '#panel', padding: 10 } }
        : { targets: { panel: '#panel' } })
    })
    const filename = path.join(directory, screenshotKey(definition))
    const geometryFilename = path.join(
      directory,
      screenshotGeometryKey(definition)
    )
    const image = Buffer.from('fixture image bytes')
    const geometry = {
      schemaVersion: 1,
      slug: definition.slug,
      version: definition.version,
      imageSha256: contentHash(image),
      viewport: { width: 1440, height: 900 },
      targets: cropOnly
        ? {}
        : { panel: { x: 10, y: 10, width: 100, height: 100 } },
      ...(cropOnly ? { crop: { x: 0, y: 0, width: 120, height: 120 } } : {})
    }
    const callsFilename = path.join(directory, 'calls.jsonl')
    const failureFilename = path.join(directory, 'fail-geometry')
    async function calls() {
      return (await readFile(callsFilename, 'utf8'))
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line))
    }
    try {
      await mkdir(path.dirname(filename), { recursive: true })
      await writeFile(filename, image)
      await writeFile(geometryFilename, JSON.stringify(geometry))
      await writeFile(
        assetsCli,
        `
      import { appendFileSync, existsSync } from 'node:fs'
      const args = process.argv.slice(2)
      const key = args[args.indexOf('--key') + 1]
      appendFileSync(${JSON.stringify(callsFilename)}, JSON.stringify(args) + '\\n')
      if (key.endsWith('.geometry.json') && existsSync(${JSON.stringify(failureFilename)})) {
        console.log(JSON.stringify({ error: { message: 'Fixture upload failure' } }))
        process.exit(1)
      }
      console.log(JSON.stringify({ ok: true, status: 'complete', publicUrl: 'https://files.example.org/' + key }))
    `
      )
      await writeFile(failureFilename, '')
      const options = { directory, assetsCli }
      await expect(publishScreenshot(definition, options)).rejects.toThrow(
        'Fixture upload failure'
      )
      expect(await calls()).toHaveLength(2)
      await rm(failureFilename)
      const published = await publishScreenshot(definition, options)
      expect(published).toEqual({
        publicUrl: `https://files.example.org/${screenshotKey(definition)}`,
        geometryPublicUrl: `https://files.example.org/${screenshotGeometryKey(definition)}`
      })
      expect(await calls()).toHaveLength(3) // Retry only the failed geometry.
      expect(await publishScreenshot(definition, options)).toEqual(published)
      expect(await calls()).toHaveLength(3)

      await publishScreenshot(definition, { ...options, overwrite: true })
      expect(
        (await calls()).slice(-2).every((args) => args.includes('--overwrite'))
      ).toBe(true)
      expect(await calls()).toHaveLength(5)
      vi.stubEnv('ALLMAPS_ASSETS_BASE_URL', 'https://other-assets.example.org')
      await publishScreenshot(definition, options)
      expect(await calls()).toHaveLength(7)

      await writeFile(filename, 'changed image')
      await expect(publishScreenshot(definition, options)).rejects.toThrow(
        'does not match'
      )
      expect(await calls()).toHaveLength(7) // Validate both assets before uploading either.
      await writeFile(
        geometryFilename,
        JSON.stringify({
          ...geometry,
          imageSha256: contentHash(Buffer.from('changed image'))
        })
      )
      await publishScreenshot(definition, options)
      expect(await calls()).toHaveLength(9)
    } finally {
      vi.unstubAllEnvs()
      await rm(directory, { recursive: true, force: true })
    }
  }
)
