import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { expect, test } from 'vitest'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import sharp from 'sharp'

import { defineScreenshot } from '@allmaps/ui/screenshots'
import { captureScreenshot } from '../src/capture.ts'

// Explicit opt-in: unit tests do not require downloading a browser.
test.skipIf(process.env.ALLMAPS_SCREENSHOT_BROWSER_TEST !== '1')(
  'captures a ready page as WebP and preserves the image after a failed refresh',
  async () => {
    let fail = false
    const server = createServer((_request, response) => {
      response.writeHead(fail ? 503 : 200, { 'content-type': 'text/html' })
      response.end(
        `<html><body style="background:#ff0000"><h1>Allmaps</h1><script>
          setTimeout(() => { document.body.dataset.ready = "true" }, 50)
          setTimeout(() => { delete document.body.dataset.ready }, 80)
          setTimeout(() => {
            document.body.style.background = "#e8eee0"
            document.body.dataset.ready = "true"
          }, 500)
        </script></body></html>`
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing server address')
    const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-capture-'))
    let browser: Browser | undefined
    try {
      browser = await chromium.launch()
      const definition = defineScreenshot({
        slug: 'local-test',
        url: `http://127.0.0.1:${address.port}`,
        viewport: { width: 400, height: 250, deviceScaleFactor: 1 },
        waitForSelector: '[data-ready="true"]',
        delay: 150
      })
      const options = { directory, timeout: 5000 }
      const first = await captureScreenshot(browser, definition, options)
      const before = await readFile(first.filename)
      expect(first.cached).toBe(false)
      const metadata = await sharp(before).metadata()
      expect(metadata.format).toBe('webp')
      expect([metadata.width, metadata.height]).toEqual([400, 250])
      // The ready marker disappeared during the delay. The capture must wait
      // for it to return, when the pending red background becomes green.
      const pixels = await sharp(before).removeAlpha().raw().toBuffer()
      expect(pixels[1]).toBeGreaterThan(200)
      expect(
        (await captureScreenshot(browser, definition, options)).cached
      ).toBe(true)
      fail = true
      await expect(
        captureScreenshot(browser, definition, { ...options, refresh: true })
      ).rejects.toThrow('HTTP 503')
      expect(await readFile(first.filename)).toEqual(before)
    } finally {
      await browser?.close()
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      )
      await rm(directory, { recursive: true, force: true })
    }
  },
  20_000
)
