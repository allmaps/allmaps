import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import sharp from 'sharp'

import {
  observeRenderEvents,
  readRenderState,
  renderSettled,
  SETTLE_TIME
} from './render-readiness.ts'

import { screenshotKey, screenshotGeometryKey } from '@allmaps/ui/screenshots'
import type {
  ScreenshotDefinition,
  ScreenshotGeometry
} from '@allmaps/ui/screenshots'
import type { Browser, Page } from 'playwright'
import { contentHash, loadScreenshotGeometry } from './geometry.ts'
import { measureCapture, prepareScreenshot } from './prepare.ts'

export async function captureScreenshot(
  browser: Browser,
  definition: ScreenshotDefinition,
  options: { directory: string; refresh?: boolean; timeout: number }
) {
  const filename = path.join(options.directory, screenshotKey(definition))
  const geometryFilename = path.join(
    options.directory,
    screenshotGeometryKey(definition)
  )
  const metadataFilename = `${filename}.json`
  const signature = JSON.stringify(definition)
  if (!options.refresh) {
    try {
      if ((await readFile(metadataFilename, 'utf8')) === signature) {
        const cached = await sharp(filename).metadata()
        if (cached.format === 'webp') {
          if (definition.targets || definition.crop)
            await loadScreenshotGeometry(definition, options)
          return {
            filename,
            geometryFilename:
              definition.targets || definition.crop
                ? geometryFilename
                : undefined,
            cached: true
          }
        }
      }
    } catch {
      // A missing, incomplete or unreadable capture is regenerated.
    }
  }

  const context = await browser.newContext({
    viewport: {
      width: definition.viewport.width,
      height: definition.viewport.height
    },
    deviceScaleFactor: definition.viewport.deviceScaleFactor,
    colorScheme: 'light',
    reducedMotion: 'reduce',
    locale: 'en-US',
    timezoneId: 'UTC'
  })
  try {
    const page = await context.newPage()
    if (definition.waitForRender) await observeRenderEvents(page)
    page.setDefaultTimeout(options.timeout)
    page.setDefaultNavigationTimeout(options.timeout)
    const response = await page.goto(definition.url, { waitUntil: 'load' })
    if (!response || !response.ok()) {
      throw new Error(
        `Screenshot ${definition.slug}: HTTP ${response?.status() ?? 'no response'}`
      )
    }
    await prepareScreenshot(page, definition)
    if (definition.waitForSelector) {
      await page
        .locator(definition.waitForSelector)
        .first()
        .waitFor({ state: 'visible' })
    }
    await page.waitForFunction(
      () =>
        document.fonts.status === 'loaded' &&
        [...document.images].every(
          (image) => image.loading === 'lazy' || image.complete
        )
    )
    if (definition.delay) await page.waitForTimeout(definition.delay)
    // Readiness can be revoked while fonts load or during the settling delay
    // (for example when the Viewer moves and requests a new set of tiles).
    if (definition.waitForSelector) {
      await page
        .locator(definition.waitForSelector)
        .first()
        .waitFor({ state: 'visible' })
    }
    const { image, bounds, crop } = await captureStableFrame(
      page,
      definition,
      options.timeout
    )
    const webp = await sharp(image).webp({ quality: 90 }).toBuffer()
    await mkdir(path.dirname(filename), { recursive: true })
    const temporaryFilename = `${filename}.${randomUUID()}.tmp`
    await writeFile(temporaryFilename, webp)
    // The cache signature is committed last. A partial write cannot be reused.
    if (definition.targets || definition.crop) {
      const geometry: ScreenshotGeometry = {
        schemaVersion: 1,
        slug: definition.slug,
        version: definition.version,
        imageSha256: contentHash(webp),
        viewport: {
          width: definition.viewport.width,
          height: definition.viewport.height
        },
        targets: bounds,
        ...(crop ? { crop } : {})
      }
      const temporaryGeometry = `${geometryFilename}.${randomUUID()}.tmp`
      await writeFile(
        temporaryGeometry,
        `${JSON.stringify(geometry, null, 2)}\n`
      )
      await rename(temporaryGeometry, geometryFilename)
    }
    await rename(temporaryFilename, filename)
    await writeFile(metadataFilename, signature)
    return {
      filename,
      geometryFilename:
        definition.targets || definition.crop ? geometryFilename : undefined,
      cached: false
    }
  } finally {
    await context.close()
  }
}

/** One deadline and retry loop for render activity, pixels and target bounds. */
export async function captureStableFrame(
  page: Page,
  definition: ScreenshotDefinition,
  timeout: number
) {
  const deadline = Date.now() + timeout
  let previous:
    | { image: Buffer; bounds: string; revision: number; since: number }
    | undefined

  while (Date.now() < deadline) {
    const before = definition.waitForRender
      ? await readRenderState(page)
      : undefined
    if (!before || renderSettled(before)) {
      const initial = await measureCapture(page, definition, deadline)
      const image = await page.screenshot({
        animations: 'disabled',
        ...(initial.crop ? { clip: initial.crop } : {}),
        fullPage: false,
        timeout: Math.max(1, deadline - Date.now())
      })
      const measurement = await measureCapture(page, definition, deadline)
      const after = definition.waitForRender
        ? await readRenderState(page)
        : undefined
      const serializedBounds = JSON.stringify(measurement)
      const valid =
        Date.now() < deadline &&
        JSON.stringify(initial) === serializedBounds &&
        (!after ||
          (renderSettled(after) && before?.revision === after.revision))

      if (valid) {
        if (!after)
          return { image, bounds: measurement.bounds, crop: measurement.crop }
        if (
          previous?.revision === after.revision &&
          previous.bounds === serializedBounds &&
          previous.image.equals(image)
        ) {
          if (Date.now() - previous.since >= SETTLE_TIME)
            return { image, bounds: measurement.bounds, crop: measurement.crop }
        } else {
          previous = {
            image,
            bounds: serializedBounds,
            revision: after.revision,
            since: Date.now()
          }
        }
      } else {
        previous = undefined
      }
    } else {
      previous = undefined
    }
    await page.waitForTimeout(Math.min(250, Math.max(1, deadline - Date.now())))
  }

  if (definition.waitForRender) {
    const state = await readRenderState(page)
    throw new Error(
      `Screenshot ${definition.slug}: render readiness timed out: ${state.observedLoading ? 'observed loading' : 'no Allmaps loading events observed'}, ${state.loadedTiles} loaded tile events, ${state.pendingCaches} pending caches; no stable rendered image and target bounds`
    )
  }
  throw new Error(`Screenshot ${definition.slug}: target bounds did not settle`)
}
