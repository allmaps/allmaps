import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import type { Browser } from 'playwright'
import { afterEach, expect, test, vi } from 'vitest'

import { defineScreenshot, screenshotKey } from '@allmaps/ui/screenshots'
import { captureScreenshot } from '../src/capture.ts'
import { writeScreenshotVariants } from '../src/variants.ts'

const directories: string[] = []
afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true }))
  )
})

async function fixture() {
  const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-variants-'))
  directories.push(directory)
  const definition = defineScreenshot({
    url: 'https://example.org',
    slug: 'responsive',
    viewport: { width: 160, height: 100, deviceScaleFactor: 2 },
    widths: [80, 160, 320]
  })
  const filename = path.join(directory, screenshotKey(definition))
  const image = await sharp({
    create: { width: 320, height: 200, channels: 3, background: '#ff0000' }
  })
    .webp({ quality: 90 })
    .toBuffer()
  await mkdir(path.dirname(filename), { recursive: true })
  await writeFile(filename, image)
  return { directory, definition, filename, image }
}

test('preserves the frame and original while resizing, and reuses unchanged variants', async () => {
  const { directory, definition, filename, image } = await fixture()
  const variants = await writeScreenshotVariants(definition, { directory })
  for (const [index, variant] of variants.entries()) {
    const metadata = await sharp(variant).metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(definition.widths![index])
    expect(metadata.height).toBe((definition.widths![index] * 200) / 320)
  }
  expect(await readFile(filename)).toEqual(image)
  expect(await readFile(variants[2])).toEqual(image)
  const before = await stat(variants[0])
  await writeScreenshotVariants(definition, { directory })
  expect((await stat(variants[0])).mtimeMs).toBe(before.mtimeMs)

  await writeFile(variants[0], 'broken image')
  await writeScreenshotVariants(definition, { directory })
  expect((await sharp(variants[0]).metadata()).width).toBe(80)

  const previous = await readFile(variants[0])
  const replacement = await sharp({
    create: { width: 320, height: 200, channels: 3, background: '#0000ff' }
  })
    .webp()
    .toBuffer()
  await writeFile(filename, replacement)
  await writeScreenshotVariants(definition, { directory })
  expect(await readFile(variants[0])).not.toEqual(previous)
})

test('rejects upscaling before writing any variants', async () => {
  const { directory, definition } = await fixture()
  await expect(
    writeScreenshotVariants({ ...definition, widths: [80, 640] }, { directory })
  ).rejects.toThrow('exceeds the captured width 320')
  await expect(
    stat(path.join(directory, screenshotKey(definition, 80)))
  ).rejects.toMatchObject({ code: 'ENOENT' })
})

test('adds delivery widths to a cached capture without opening a browser', async () => {
  const { directory, definition, filename } = await fixture()
  await writeFile(
    `${filename}.json`,
    JSON.stringify({ ...definition, widths: undefined })
  )
  const newContext = vi.fn(() => {
    throw new Error('Unexpected browser capture')
  })
  const browser = { newContext } as unknown as Browser
  const result = await captureScreenshot(browser, definition, {
    directory,
    timeout: 1000
  })
  expect(result.cached).toBe(true)
  expect(newContext).not.toHaveBeenCalled()
  expect(
    (
      await sharp(
        path.join(directory, screenshotKey(definition, 80))
      ).metadata()
    ).width
  ).toBe(80)
  await expect(
    captureScreenshot(
      browser,
      { ...definition, widths: [640] },
      { directory, timeout: 1000 }
    )
  ).rejects.toThrow('exceeds')
  expect(newContext).not.toHaveBeenCalled()
})
