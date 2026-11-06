import sharp from 'sharp'
import type { ImageSizeLimits } from '../src/lib/responsive-image.ts'

type Region = { left: number; top: number; width: number; height: number }

/** Assemble a native-resolution region while respecting each IIIF request limit. */
export async function downloadImageRegion(
  serviceUrl: string,
  region: Region,
  maximumWidth: number,
  limits: ImageSizeLimits,
  request: (url: string) => Promise<Response>
) {
  const width = Math.min(maximumWidth, region.width)
  const height = Math.max(1, Math.floor((width * region.height) / region.width))
  const divisions = Math.max(
    1,
    Math.ceil(width / (limits.maxWidth ?? Infinity)),
    Math.ceil(height / (limits.maxHeight ?? Infinity)),
    Math.ceil(Math.sqrt((width * height) / (limits.maxArea ?? Infinity)))
  )
  const tiles = []
  for (let row = 0; row < divisions; row++) {
    for (let column = 0; column < divisions; column++) {
      const left = Math.floor((column * width) / divisions)
      const top = Math.floor((row * height) / divisions)
      const tileWidth = Math.floor(((column + 1) * width) / divisions) - left
      const tileHeight = Math.floor(((row + 1) * height) / divisions) - top
      const sourceLeft = Math.floor((column * region.width) / divisions)
      const sourceTop = Math.floor((row * region.height) / divisions)
      const sourceWidth =
        Math.floor(((column + 1) * region.width) / divisions) - sourceLeft
      const sourceHeight =
        Math.floor(((row + 1) * region.height) / divisions) - sourceTop
      const response = await request(
        `${serviceUrl}/${region.left + sourceLeft},${region.top + sourceTop},${sourceWidth},${sourceHeight}/${tileWidth},/0/default.jpg`
      )
      const data = Buffer.from(await response.arrayBuffer())
      // IIIF servers can round dimensions by one pixel at tile boundaries.
      const input = await sharp(data)
        .resize(tileWidth, tileHeight, { fit: 'fill' })
        .png()
        .toBuffer()
      tiles.push({ input, left, top })
    }
  }
  return sharp({
    create: { width, height, channels: 3, background: '#ffffff' }
  })
    .composite(tiles)
    .png()
    .toBuffer()
}
