import { createServer } from 'node:http'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { expect, test } from 'vitest'
import { chromium } from 'playwright'
import { defineScreenshot } from '@allmaps/ui/screenshots'
import { captureScreenshot } from '../src/capture.ts'
import { loadScreenshotGeometry } from '../src/geometry.ts'
import { prepareScreenshot } from '../src/prepare.ts'

test.skipIf(process.env.ALLMAPS_SCREENSHOT_BROWSER_TEST !== '1')(
  'captures prepared UI and matching CSS-pixel geometry, detects stale cache, and preserves a failed refresh',
  async () => {
    const server = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'text/html' })
      response.end(`<html><body style="margin:0;background:white">
        <button id="open" style="position:fixed;left:20px;top:20px;width:80px;height:30px"
          onclick="document.querySelector('#panel').hidden=false">Settings</button>
        <div id="panel" hidden style="position:fixed;left:120px;top:70px;width:200px;height:100px;background:#eee">
          <input id="input"><select id="select"><option value="a">A</option><option value="b">B</option></select>
        </div>
        <div id="offscreen" style="position:absolute;top:1000px">Offscreen</div>
      </body></html>`)
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string')
      throw new Error('Missing address')
    const directory = await mkdtemp(path.join(tmpdir(), 'screenshot-geometry-'))
    const browser = await chromium.launch()
    try {
      const definition = defineScreenshot({
        slug: 'prepared',
        url: `http://127.0.0.1:${address.port}`,
        viewport: { width: 400, height: 250, deviceScaleFactor: 2 },
        delay: 0,
        steps: [
          { action: 'click', selector: '#open' },
          { action: 'waitFor', selector: '#panel' },
          { action: 'fill', selector: '#input', value: 'Hello' },
          { action: 'select', selector: '#select', value: 'b' },
          { action: 'press', selector: '#input', key: 'Tab' },
          { action: 'hover', selector: '#open' }
        ],
        targets: { button: '#open', panel: '#panel' }
      })
      const options = { directory, timeout: 1500 }
      const capture = await captureScreenshot(browser, definition, options)
      const original = await readFile(capture.filename)
      const geometry = await loadScreenshotGeometry(definition, options)
      expect(geometry.viewport).toEqual({ width: 400, height: 250 })
      expect(geometry.targets.panel).toEqual({
        x: 120,
        y: 70,
        width: 200,
        height: 100
      })
      expect(geometry.targets.button).toEqual({
        x: 20,
        y: 20,
        width: 80,
        height: 30
      })
      expect(JSON.stringify(geometry)).not.toContain('#panel')
      expect(
        (await captureScreenshot(browser, definition, options)).cached
      ).toBe(true)
      await writeFile(
        capture.geometryFilename!,
        JSON.stringify({ ...geometry, imageSha256: '0'.repeat(64) })
      )
      await expect(loadScreenshotGeometry(definition, options)).rejects.toThrow(
        'does not match'
      )
      expect(
        (await captureScreenshot(browser, definition, options)).cached
      ).toBe(false)
      const savedGeometry = await readFile(capture.geometryFilename!)
      for (const selector of ['#missing', 'button, input', '#offscreen']) {
        await expect(
          captureScreenshot(
            browser,
            { ...definition, targets: { bad: selector } },
            options
          )
        ).rejects.toThrow(/target|viewport/)
        expect(await readFile(capture.filename)).toEqual(original)
        expect(await readFile(capture.geometryFilename!)).toEqual(savedGeometry)
      }
      await expect(
        captureScreenshot(
          browser,
          { ...definition, steps: [{ action: 'click', selector: '#missing' }] },
          options
        )
      ).rejects.toThrow('step 1')
      const page = await browser.newPage()
      await page.goto(definition.url)
      await prepareScreenshot(page, definition)
      expect(await page.locator('#input').inputValue()).toBe('Hello')
      expect(await page.locator('#select').inputValue()).toBe('b')
      await page.close()
    } finally {
      await browser.close()
      await new Promise<void>((resolve) => server.close(() => resolve()))
      await rm(directory, { recursive: true, force: true })
    }
  },
  20000
)
