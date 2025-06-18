import { ImageResponse } from '@cloudflare/pages-plugin-vercel-og/api'

import tinycolor from 'tinycolor2'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import { GcpTransformer } from '@allmaps/transform'
import { Image } from '@allmaps/iiif-parser'
import { computeBbox } from '@allmaps/stdlib'
import { pink } from '@allmaps/tailwind'

import { cachedFetch } from '../shared/fetch.js'
import { getLocalFont } from '../shared/fonts.js'
import { loadImage } from '../shared/image.js'
import { computeCrop, computeMaxSize } from '../shared/crop.js'
import { arrayBufferToBase64 } from '../shared/base64.js'

import { Pin } from '../components/Pin.js'
import { Dots } from '../components/Dots.js'

import type { IRequestStrict } from 'itty-router'

import type { ImageRequest } from '@allmaps/iiif-parser'

import type { QueryOptions, Env, Crop } from '../shared/types.js'

import type { Size, Point } from '@allmaps/types'

const padding = 40

const pinSize = [182.4, 315]
const pinShadowSize = [825, 260]
const stampSize = [300.8, 147.4]

async function getImageSource(imageUrl: string): Promise<string> {
  const imageResponse = await cachedFetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error('Failed to load IIIF Image')
  }

  const imageArrayBuffer = await imageResponse.arrayBuffer()
  const base64Image = arrayBufferToBase64(imageArrayBuffer)
  const imageSource = `data:image/jpeg;base64,${base64Image}`
  return imageSource
}

async function renderTiledImage(
  parsedImage: Image,
  crop: Crop,
  tiles: ImageRequest[][],
  scaleFactor: number,
  scale: number
) {
  // TODO: something's not completely right for this image:
  // http://localhost:5514/apps/here/maps/8596ac3d0e4cba98.jpg?from=52.36745,4.925613

  const firstTile = tiles[0][0]
  const firstTileWidth = firstTile.size?.width || 0
  const firstTileHeight = firstTile.size?.height || 0

  const firstTileOriginalWidth = firstTileWidth * scaleFactor
  const firstTileOriginalHeight = firstTileHeight * scaleFactor

  const scaledTileWidth = firstTileWidth * scale
  const scaledTileHeight = firstTileHeight * scale

  const offsetLeft =
    ((crop.region.x % firstTileOriginalWidth) / scaleFactor) * scale
  const offsetTop =
    ((crop.region.y % firstTileOriginalHeight) / scaleFactor) * scale

  let imageSources: string[][] = []
  for (const row of tiles) {
    const imageRow: string[] = []
    for (const tile of row) {
      const imageUrl = parsedImage.getImageUrl(tile)
      const imageSource = await getImageSource(imageUrl)
      imageRow.push(imageSource)
    }
    imageSources.push(imageRow)
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        top: 0,
        position: 'absolute',
        overflow: 'hidden',
        borderRadius: '16px'
      }}
    >
      {imageSources.map((row, rowIndex) =>
        row.map((imageSource, columnIndex) => (
          <img
            key={`${rowIndex}-${columnIndex}`}
            style={{
              position: 'absolute',
              left: `${scaledTileWidth * columnIndex - offsetLeft}px`,
              top: `${scaledTileHeight * rowIndex - offsetTop}px`,
              width: `${scaledTileWidth}px`
              // Turn this on when debugging tiles:
              // filter: `hue-rotate(${Math.random() * 360}deg)`
            }}
            src={imageSource}
            alt={`Thumbnail for ${parsedImage.uri} (${rowIndex}, ${columnIndex})`}
          />
        ))
      )}
    </div>
  )
}

export async function generateHereCard(
  req: IRequestStrict,
  env: Env,
  mapId: string,
  size: Size,
  options: Partial<QueryOptions>
): Promise<ImageResponse> {
  const color = options.color || tinycolor(pink).toRgb()

  const font = await getLocalFont(req, env, {
    path: 'geograph-bold.woff',
    weight: 500
  })

  const pinShadow = await loadImage(req, env, 'pin-shadow.svg')
  const stamp = await loadImage(req, env, 'stamp-texture.svg')

  if (!options.from) {
    throw new Error('No coordinates provided')
  }

  const cardResourceSize: Size = [
    Math.round(size[0] - 2 * padding),
    Math.round(size[1] - 2 * padding)
  ]

  const stampWidth = 275

  const pinWidth = 120
  const pinHeight = (pinSize[1] / pinSize[0]) * pinWidth

  const pinShadowWidth = 200
  const pinShadowHeight = (pinShadowSize[1] / pinShadowSize[0]) * pinShadowWidth

  const mapUrl = `https://api.allmaps.org/maps/${mapId}`

  const map = await cachedFetch(mapUrl).then((response) => response.json())
  const parsedMap = validateGeoreferencedMap(map)

  if (Array.isArray(parsedMap)) {
    throw new Error('Multiple maps found')
  }

  const transformer = new GcpTransformer(
    parsedMap.gcps,
    parsedMap.transformation?.type
  )

  const resourceCoords = transformer.transformToResource([
    options.from[1],
    options.from[0]
  ])

  const imageId = parsedMap.resource.id

  const image = await cachedFetch(`${imageId}/info.json`).then((response) =>
    response.json()
  )
  const parsedImage = Image.parse(image)

  const bbox = computeBbox(parsedMap.resourceMask)

  const targetPoint: Point = [
    cardResourceSize[0] / 2,
    cardResourceSize[1] / 2 + pinHeight / 2
  ]

  const crop = computeCrop(
    cardResourceSize,
    [parsedImage.width, parsedImage.height],
    resourceCoords,
    bbox,
    targetPoint
  )

  const maxSize = computeMaxSize(crop.size, {
    maxArea: parsedImage.maxArea,
    maxWidth: parsedImage.maxWidth,
    maxHeight: parsedImage.maxHeight
  })

  let imageSource: string | undefined
  let scale = 1
  let scaleFactor = 1
  let tiles: ImageRequest[][] = []

  if (parsedImage.supportsAnyRegionAndSize) {
    const imageUrl = parsedImage.getImageUrl({
      region: crop.region,
      size: maxSize
    })
    imageSource = await getImageSource(imageUrl)
  } else {
    const { tileZoomLevels } = parsedImage
    const bestScaleFactor = crop.region.width / crop.size.width
    const bestZoomLevel = tileZoomLevels.reduce((prev, curr) => {
      // Find the zoom level with the closest scale factor to bestScaleFactor,
      // without being larger
      const prevDiff = Math.abs(prev.scaleFactor - bestScaleFactor)
      const currDiff = Math.abs(curr.scaleFactor - bestScaleFactor)
      return curr.scaleFactor <= bestScaleFactor && currDiff < prevDiff
        ? curr
        : prev
    })

    scale = bestZoomLevel.scaleFactor / bestScaleFactor
    scaleFactor = bestZoomLevel.scaleFactor

    const neededRegion = crop.region

    for (let row = 0; row < bestZoomLevel.rows; row++) {
      let tilesRow: ImageRequest[] = []

      for (let column = 0; column < bestZoomLevel.columns; column++) {
        const tileRegion = {
          x: column * bestZoomLevel.originalWidth,
          y: row * bestZoomLevel.originalHeight,
          width: bestZoomLevel.originalWidth,
          height: bestZoomLevel.originalHeight
        }

        // Check if tileRegion overlaps with neededRegion
        if (
          tileRegion.x < neededRegion.x + neededRegion.width &&
          tileRegion.x + tileRegion.width > neededRegion.x &&
          tileRegion.y < neededRegion.y + neededRegion.height &&
          tileRegion.y + tileRegion.height > neededRegion.y
        ) {
          const imageRequest = parsedImage.getTileImageRequest(
            bestZoomLevel,
            column,
            row
          )
          tilesRow.push(imageRequest)
        }
      }

      if (tilesRow.length > 0) {
        tiles.push(tilesRow)
      }
    }
  }

  const pinLeft = crop.coordinates[0] - pinWidth / 2
  const pinTop = crop.coordinates[1] - pinHeight

  const pinShadowLeft = crop.coordinates[0]
  const pinShadowTop =
    crop.coordinates[1] -
    (pinShadowSize[1] / pinShadowSize[0]) * pinShadowWidth +
    pinShadowHeight / 2

  const pinRotation = (Math.random() * 10 + 5) * (Math.random() > 0.5 ? 1 : -1)

  const jsx = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: `${padding}px`,
        width: '100vw',
        height: '100vh',
        background: tinycolor(color).lighten(20).toString()
      }}
    >
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          position: 'absolute',
          top: 0
        }}
      >
        {Dots(color)}
      </div>

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%'
        }}
      >
        {imageSource ? (
          <img
            src={imageSource}
            width={cardResourceSize[0]}
            height={cardResourceSize[1]}
            style={{ position: 'absolute', top: 0, borderRadius: '16px' }}
          />
        ) : (
          await renderTiledImage(parsedImage, crop, tiles, scaleFactor, scale)
        )}

        <img
          src={pinShadow}
          width={pinShadowWidth}
          height={pinShadowHeight}
          style={{
            position: 'absolute',
            left: `${pinShadowLeft}px`,
            top: `${pinShadowTop}px`
          }}
        />

        {Pin(color, pinWidth, pinHeight, {
          position: 'absolute',
          left: `${pinLeft}px`,
          top: `${pinTop}px`,
          transformOrigin: 'bottom center',
          transform: `rotate(${pinRotation}deg)`
        })}
      </div>
      <img
        src={stamp}
        width={stampWidth}
        height={(stampSize[1] / stampSize[0]) * stampWidth}
        style={{
          position: 'absolute',
          top: '6px',
          right: '6px',
          transform: 'rotate(10deg)',
          opacity: 1
        }}
      />
    </div>
  )

  return new ImageResponse(jsx, {
    width: size[0],
    height: size[1],
    fonts: [font]
  })
}
