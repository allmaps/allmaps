import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { chromium } from 'playwright'
import sharp from 'sharp'
import { defineScreenshot } from '@allmaps/ui/screenshots'
import type { ScreenshotCrop } from '@allmaps/ui/screenshots'
import { captureScreenshot, captureStableFrame } from '../src/capture.ts'
import { loadScreenshotGeometry } from '../src/geometry.ts'

const options = { slug: 'crop', url: 'https://example.org' }

test('normalizes rectangle and element crops', () => {
  expect(
    defineScreenshot({ ...options, crop: { selector: '#panel' } }).crop
  ).toEqual({ selector: '#panel', padding: 0 })
  expect(
    defineScreenshot({
      ...options,
      crop: { x: 10.2, y: 20.8, width: 100.1, height: 50.5 }
    }).crop
  ).toEqual({ x: 10, y: 20, width: 101, height: 52 })
})

test.each([
  null,
  {},
  { selector: '' },
  { selector: '#panel', padding: -1 },
  { selector: '#panel', padding: Infinity },
  { selector: '#panel', x: 1 },
  { x: -1, y: 0, width: 100, height: 100 },
  { x: 1400, y: 0, width: 100, height: 100 },
  { x: 0, y: 0, width: 0, height: 100 },
  { x: NaN, y: 0, width: 100, height: 100 }
])('rejects invalid crops %j', (crop) => {
  expect(() =>
    defineScreenshot({ ...options, crop: crop as ScreenshotCrop })
  ).toThrow(/crop/)
})

test.skipIf(process.env.ALLMAPS_SCREENSHOT_BROWSER_TEST !== '1')(
  'captures crops at both pixel densities, rebases highlights, and handles scroll, padding and moving elements',
  async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(`<body style="margin:0;height:2000px;background:white">
      <div id="panel" style="position:fixed;left:100px;top:60px;width:120px;height:80px;background:rgb(255,0,0)"></div>
      <div id="edge" style="position:fixed;left:0;top:0;width:20px;height:20px"></div>
      <div id="offscreen" style="position:absolute;top:1500px;width:20px;height:20px"></div>
      <button id="scroll" style="position:fixed;left:300px;top:200px" onclick="window.scrollTo(0,500)">Scroll</button>
    </body>`)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing address')
    const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-crop-'))
    const browser = await chromium.launch()
    try {
      for (const deviceScaleFactor of [1, 2]) {
        const base = defineScreenshot({
          ...options,
          url: `http://127.0.0.1:${address.port}`,
          viewport: { width: 400, height: 250, deviceScaleFactor },
          delay: 0
        })
        for (const crop of [
          { x: 100, y: 60, width: 120, height: 80 },
          { selector: '#panel', padding: 12 }
        ]) {
          const definition = defineScreenshot({
            ...base,
            crop,
            targets: { panel: '#panel' },
            steps: [{ action: 'click', selector: '#scroll' }]
          })
          const capture = await captureScreenshot(browser, definition, {
            directory,
            timeout: 2000
          })
          const geometry = await loadScreenshotGeometry(definition, {
            directory
          })
          const padding = 'selector' in crop ? 12 : 0
          expect(geometry.crop).toEqual({
            x: 100 - padding,
            y: 60 - padding,
            width: 120 + padding * 2,
            height: 80 + padding * 2
          })
          expect(geometry.targets.panel).toEqual({
            x: padding,
            y: padding,
            width: 120,
            height: 80
          })
          const bytes = await readFile(capture.filename)
          const metadata = await sharp(bytes).metadata()
          expect(metadata.width).toBe((120 + padding * 2) * deviceScaleFactor)
          expect(metadata.height).toBe((80 + padding * 2) * deviceScaleFactor)
          const { data } = await sharp(bytes)
            .removeAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true })
          const center =
            (Math.floor(metadata.height! / 2) * metadata.width! +
              Math.floor(metadata.width! / 2)) *
            3
          expect(data[center]).toBeGreaterThan(240)
          expect(data[center + 1]).toBeLessThan(10)
        }
        const cropOnly = defineScreenshot({
          ...base,
          crop: { selector: '#edge', padding: 12 }
        })
        const capture = await captureScreenshot(browser, cropOnly, {
          directory,
          timeout: 2000
        })
        expect(capture.geometryFilename).toBeDefined()
        expect(
          (await loadScreenshotGeometry(cropOnly, { directory })).crop
        ).toEqual({ x: 0, y: 0, width: 32, height: 32 })
        expect(
          (
            await captureScreenshot(browser, cropOnly, {
              directory,
              timeout: 2000
            })
          ).cached
        ).toBe(true)
        await rm(capture.geometryFilename!)
        expect(
          (
            await captureScreenshot(browser, cropOnly, {
              directory,
              timeout: 2000
            })
          ).cached
        ).toBe(false)
      }
      const definition = defineScreenshot({
        ...options,
        url: `http://127.0.0.1:${address.port}`,
        viewport: { width: 400, height: 250 },
        crop: { selector: '#panel', padding: 10 },
        delay: 0
      })
      for (const selector of ['#missing', '#panel, #edge', '#offscreen']) {
        await expect(
          captureScreenshot(
            browser,
            { ...definition, crop: { selector } },
            { directory, timeout: 500 }
          )
        ).rejects.toThrow(/crop/)
      }
      await expect(
        captureScreenshot(
          browser,
          { ...definition, targets: { outside: '#edge' } },
          { directory, timeout: 1000 }
        )
      ).rejects.toThrow(/inside the crop/)
      const page = await browser.newPage({
        viewport: { width: 400, height: 250 }
      })
      await page.goto(definition.url)
      const screenshot = page.screenshot.bind(page)
      let calls = 0
      page.screenshot = async (options) => {
        const image = await screenshot(options)
        if (++calls === 1)
          await page.locator('#panel').evaluate((element) => {
            ;(element as HTMLElement).style.left = '150px'
          })
        return image
      }
      const frame = await captureStableFrame(page, definition, 2000)
      expect(calls).toBe(2)
      expect(frame.crop?.x).toBe(140)
      await page.close()
    } finally {
      await browser.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(directory, { recursive: true, force: true })
    }
  },
  20000
)
