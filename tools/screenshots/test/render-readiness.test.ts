import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest'
import { chromium } from 'playwright'
import type { Browser } from 'playwright'
import sharp from 'sharp'
import { WarpedMapEventType } from '@allmaps/render'
import { defineScreenshot } from '@allmaps/ui/screenshots'

import { captureScreenshot, captureStableFrame } from '../src/capture.ts'
import {
  observeRenderEvents,
  readRenderState
} from '../src/render-readiness.ts'

describe.skipIf(process.env.ALLMAPS_SCREENSHOT_BROWSER_TEST !== '1')(
  'injected render readiness',
  () => {
    let browser: Browser
    let directory: string
    let origin: string
    const server = createServer((request, response) => {
      const mode =
        new URL(request.url!, origin).searchParams.get('mode') ?? 'ready'
      response.setHeader('content-type', 'text/html')
      response.end(`<!doctype html><style>body { margin:0; background:red } canvas { display:block }</style>
        <canvas width="400" height="250"></canvas><button id="reload">Reload</button><script>
          const events = ${JSON.stringify(WarpedMapEventType)}
          const mode = ${JSON.stringify(mode)}
          const canvas = document.querySelector('canvas')
          const drawing = canvas.getContext('2d')
          function paint(color) { drawing.fillStyle = color; drawing.fillRect(0,0,400,250) }
          class Cache extends EventTarget {
            finished = true
            start() { this.finished = false; this.dispatchEvent(new Event(events.REQUESTEDTILESLOADING)) }
            finish() {
              this.finished = true
              this.dispatchEvent(new Event(events.ALLREQUESTEDTILESLOADED))
              this.dispatchEvent(new Event(events.MAPTILELOADED))
            }
          }
          function fail(type) {
            const event = new Event(type)
            event.error = new Error('Fixture load failure')
            new EventTarget().dispatchEvent(event)
          }
          const first = new Cache()
          const second = new Cache()
          if (mode === 'ready') {
            first.start(); second.start()
            setTimeout(() => first.finish(), 50)
            setTimeout(() => second.finish(), 1100)
            setTimeout(() => paint('blue'), 1400)
            // Draw after the observer has already begun its pixel samples.
            setTimeout(() => paint('#00ff00'), 2600)
          } else if (mode === 'reload') {
            first.start(); first.finish(); paint('blue')
            document.querySelector('#reload').onclick = () => {
              first.start()
              setTimeout(() => { first.finish(); paint('#00ff00') }, 600)
            }
          } else if (mode === 'cleared') {
            first.start(); second.start(); second.finish(); paint('#00ff00')
            // Mirrors TileCache.clear(): no completion event is dispatched.
            setTimeout(() => first.finished = true, 100)
          } else if (mode === 'tile-error') {
            first.start(); first.finish(); fail(events.TILEFETCHERROR)
          } else if (mode === 'metadata-error') {
            fail(events.IMAGEINFOFETCHERROR)
          } else if (mode === 'pending') {
            first.start(); second.start(); first.finish()
          } else if (mode === 'empty-completion') {
            first.dispatchEvent(new Event(events.ALLREQUESTEDTILESLOADED))
          } else if (mode === 'changing') {
            first.start(); first.finish()
            let tick = 0
            setInterval(() => paint(++tick % 2 ? 'blue' : 'green'), 100)
          }
        </script>`)
    })

    beforeAll(async () => {
      directory = await mkdtemp(path.join(tmpdir(), 'screenshot-render-'))
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(0, '127.0.0.1', resolve)
      })
      const address = server.address()
      if (!address || typeof address === 'string')
        throw new Error('Missing server address')
      origin = `http://127.0.0.1:${address.port}`
      browser = await chromium.launch()
    })

    afterAll(async () => {
      await browser?.close()
      if (server.listening)
        await new Promise<void>((resolve) => server.close(() => resolve()))
      if (directory) await rm(directory, { recursive: true, force: true })
    })

    function definition(mode: string) {
      return defineScreenshot({
        slug: mode,
        url: `${origin}/?mode=${mode}`,
        viewport: { width: 400, height: 250, deviceScaleFactor: 1 },
        waitForRender: true,
        delay: 0
      })
    }

    async function expectGreen(filename: string) {
      const pixels = await sharp(filename).removeAlpha().raw().toBuffer()
      expect(pixels[0]).toBeLessThan(10)
      expect(pixels[1]).toBeGreaterThan(240)
      expect(pixels[2]).toBeLessThan(10)
    }

    test('observes inline initialization, waits for both caches and delayed canvas painting', async () => {
      const capture = await captureScreenshot(browser, definition('ready'), {
        directory,
        timeout: 7000
      })
      await expectGreen(capture.filename)
    }, 10000)

    test('waits for a fresh loading cycle triggered by preparation steps', async () => {
      const capture = await captureScreenshot(
        browser,
        {
          ...definition('reload'),
          steps: [{ action: 'click', selector: '#reload' }]
        },
        { directory, timeout: 5000 }
      )
      await expectGreen(capture.filename)
    }, 8000)

    test('handles cleared caches without waiting forever for a completion event', async () => {
      const capture = await captureScreenshot(browser, definition('cleared'), {
        directory,
        timeout: 5000
      })
      await expectGreen(capture.filename)
    }, 8000)

    test.each([
      ['tile-error', 'tilefetcherror'],
      ['metadata-error', 'imageinfofetcherror'],
      ['pending', '1 pending caches'],
      ['no-events', 'no Allmaps loading events observed'],
      ['empty-completion', 'no Allmaps loading events observed'],
      ['changing', 'no stable rendered image']
    ])(
      'fails safely for %s',
      async (mode, message) => {
        // Seed the destination with a normal capture, then test a failed refresh.
        const failedDefinition = definition(mode)
        const capture = await captureScreenshot(
          browser,
          { ...failedDefinition, waitForRender: false },
          { directory, timeout: 3000 }
        )
        const imageBefore = await readFile(capture.filename)
        const metadataBefore = await readFile(`${capture.filename}.json`)
        await expect(
          captureScreenshot(browser, failedDefinition, {
            directory,
            timeout: 2200,
            refresh: true
          })
        ).rejects.toThrow(message)
        expect(await readFile(capture.filename)).toEqual(imageBefore)
        expect(await readFile(`${capture.filename}.json`)).toEqual(
          metadataBefore
        )
      },
      6000
    )

    test('preserves event identity, receiver, cancellation and nested dispatch ordering', async () => {
      const page = await browser.newPage()
      try {
        await observeRenderEvents(page)
        await page.goto(`${origin}/?mode=no-events`)
        const result = await page.evaluate((events) => {
          const target = new EventTarget()
          const event = new Event('probe', { cancelable: true })
          let sameReceiver = false
          let sameEvent = false
          let calls = 0
          target.addEventListener(
            'probe',
            function (this: EventTarget, received) {
              sameReceiver = this === target
              sameEvent = received === event
              calls++
              received.preventDefault()
            }
          )
          const returned = target.dispatchEvent(event)
          target.addEventListener(events.REQUESTEDTILESLOADING, () => {
            target.dispatchEvent(new Event(events.ALLREQUESTEDTILESLOADED))
            target.dispatchEvent(new Event(events.MAPTILELOADED))
          })
          target.dispatchEvent(new Event(events.REQUESTEDTILESLOADING))
          return { sameReceiver, sameEvent, calls, returned }
        }, WarpedMapEventType)
        expect(result).toEqual({
          sameReceiver: true,
          sameEvent: true,
          calls: 1,
          returned: false
        })
        expect(await readRenderState(page)).toMatchObject({
          observedLoading: true,
          pendingCaches: 0,
          loadedTiles: 1
        })
        await page.reload()
        expect(await readRenderState(page)).toMatchObject({
          observedLoading: false,
          loadedTiles: 0
        })
        const untouched = await browser.newPage()
        try {
          await untouched.goto(`${origin}/?mode=no-events`)
          await expect(readRenderState(untouched)).rejects.toThrow(
            'not installed'
          )
        } finally {
          await untouched.close()
        }
      } finally {
        await page.close()
      }
    })

    test('retries moving highlight bounds within the same capture deadline', async () => {
      const page = await browser.newPage({
        viewport: { width: 400, height: 250 }
      })
      try {
        await page.setContent(
          '<div id="target" style="position:fixed;left:10px;top:10px;width:30px;height:30px;background:green"></div>'
        )
        const takeScreenshot = page.screenshot.bind(page)
        const capture = vi
          .spyOn(page, 'screenshot')
          .mockImplementation(async (options) => {
            const bytes = await takeScreenshot(options)
            await page.locator('#target').evaluate((element) => {
              ;(element as HTMLElement).style.left = '80px'
            })
            return bytes
          })
        const options = {
          ...definition('no-events'),
          waitForRender: false,
          targets: { target: '#target' }
        }
        const frame = await captureStableFrame(page, options, 2000)
        expect(capture).toHaveBeenCalledTimes(2)
        expect(frame.bounds.target.x).toBe(80)

        capture.mockImplementation(async (options) => {
          const bytes = await takeScreenshot(options)
          await page.locator('#target').evaluate((element) => {
            const style = (element as HTMLElement).style
            style.left = style.left === '80px' ? '10px' : '80px'
          })
          return bytes
        })
        await expect(captureStableFrame(page, options, 700)).rejects.toThrow(
          'target bounds did not settle'
        )
      } finally {
        await page.close()
      }
    }, 5000)

    test('invalidates a candidate if new loading starts during the screenshot', async () => {
      const page = await browser.newPage()
      try {
        await observeRenderEvents(page)
        await page.goto(`${origin}/?mode=no-events`)
        await page.evaluate((events) => {
          const target = new EventTarget()
          target.dispatchEvent(new Event(events.REQUESTEDTILESLOADING))
          target.dispatchEvent(new Event(events.ALLREQUESTEDTILESLOADED))
          target.dispatchEvent(new Event(events.MAPTILELOADED))
        }, WarpedMapEventType)
        const capture = vi
          .spyOn(page, 'screenshot')
          .mockImplementation(async () => {
            await page.evaluate(
              (event) => new EventTarget().dispatchEvent(new Event(event)),
              WarpedMapEventType.REQUESTEDTILESLOADING
            )
            return Buffer.from('unchanged pixels')
          })
        await expect(
          captureStableFrame(page, definition('no-events'), 1800)
        ).rejects.toThrow('1 pending caches')
        expect(capture).toHaveBeenCalledTimes(1)
      } finally {
        await page.close()
      }
    }, 5000)
  }
)
