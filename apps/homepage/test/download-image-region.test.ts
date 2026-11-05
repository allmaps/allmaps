import { expect, test } from 'vitest'
import sharp from 'sharp'
import { downloadImageRegion } from '../scripts/download-image-region.ts'

test('assembles a high-resolution crop without exceeding a service pixel limit', async () => {
  const requests: string[] = []
  const data = await downloadImageRegion(
    'https://example.org/iiif/map',
    { left: 100, top: 200, width: 2400, height: 1200 },
    1280,
    { maxArea: 270000 },
    async (url) => {
      requests.push(url)
      const match = url.match(
        /\/(\d+),(\d+),(\d+),(\d+)\/(\d+),\/0\/default.jpg$/
      )!
      const width = Number(match[5]),
        height = Math.ceil((width * Number(match[4])) / Number(match[3]))
      expect(width * height).toBeLessThanOrEqual(270000)
      const bytes = await sharp({
        create: {
          width,
          height,
          channels: 3,
          background: Number(match[1]) === 100 ? '#ff0000' : '#0000ff'
        }
      })
        .jpeg()
        .toBuffer()
      return new Response(new Uint8Array(bytes))
    }
  )
  expect(requests).toHaveLength(4)
  expect(await sharp(data).metadata()).toMatchObject({
    width: 1280,
    height: 640
  })
  const { data: pixels, info } = await sharp(data)
    .raw()
    .toBuffer({ resolveWithObject: true })
  expect(pixels[0]).toBeGreaterThan(240)
  expect(pixels[(info.width - 1) * info.channels + 2]).toBeGreaterThan(240)
})
