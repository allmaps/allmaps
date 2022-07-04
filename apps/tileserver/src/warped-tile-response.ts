import { decode as decodeJpeg } from 'jpeg-js'
import { encode as encodePng } from 'upng-js'

import { Image } from '@allmaps/iiif-parser'
import { createTransformer, toImage } from '@allmaps/transform'
import { computeIiifTilesForMapExtent } from '@allmaps/render'

import { cachedFetch } from './fetch.js'
import { xyzTileToGeoExtent, pointInPolygon } from './geo.js'

import type { Coord, XYZTile, Cache, Tile } from './types.js'
import type { Map } from '@allmaps/annotation'

const TILE_SIZE = 256
const CHANNELS = 4

export async function createWarpedTileResponse(
  map: Map,
  { x, y, z }: XYZTile,
  cache: Cache
): Promise<Response> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  let pixelMask
  if (map.pixelMask) {
    pixelMask = map.pixelMask
  } else {
    // TODO: create mask from full image
    throw new Error('Map does not have pixelMask')
  }

  const imageInfoResponse = await cachedFetch(
    cache,
    // context,
    `${map.image.uri}/info.json`
  )

  const imageInfo = await imageInfoResponse.json()
  const parsedImage: Image = Image.parse(imageInfo)

  const extent = xyzTileToGeoExtent({ x, y, z })

  const transformer = createTransformer(map.gcps)
  const iiifTiles = computeIiifTilesForMapExtent(
    transformer,
    parsedImage,
    [TILE_SIZE, TILE_SIZE],
    extent
  )

  const iiifTileUrls = iiifTiles.map((tile: Tile) => {
    const { region, size } = parsedImage.getIiifTile(
      tile.zoomLevel,
      tile.column,
      tile.row
    )
    return parsedImage.getImageUrl({ region, size })
  })

  const iiifTileResponses = await Promise.all(
    iiifTileUrls.map((url) => cachedFetch(cache, url))
  )
  const iiifTileImages: ArrayBuffer[] = await Promise.all(
    iiifTileResponses.map((response) => response.arrayBuffer())
  )

  // TODO: Rename
  const decodedJpegs = iiifTileImages.map((buffer) =>
    decodeJpeg(buffer, { useTArray: true })
  )

  const warpedTile = new Uint8Array(TILE_SIZE * TILE_SIZE * CHANNELS)
  // TODO: use spherical mercator instead of lat/lon
  const longitudeFrom = extent[0]
  const latitudeFrom = extent[1]
  const longitudeDiff = extent[2] - extent[0]
  const latitudeDiff = extent[3] - extent[1]
  const longitudeStep = longitudeDiff / TILE_SIZE
  const latitudeStep = latitudeDiff / TILE_SIZE

  // TODO: if there's nothing to render, send HTTP code? Or empty PNG?
  for (let x = 0; x < TILE_SIZE; x++) {
    for (let y = 0; y < TILE_SIZE; y++) {
      const world: Coord = [
        longitudeFrom + y * longitudeStep,
        latitudeFrom + x * latitudeStep
      ]
      const [pixelX, pixelY] = toImage(transformer, world)
      // TODO: improve efficiency
      // TODO: fix strange repeating error,
      //    remove pointInPolygon check and fix first
      const inside = pointInPolygon([pixelX, pixelY], pixelMask)
      if (!inside) {
        continue
      }

      let tileIndex: number | undefined
      let tile: Tile | undefined
      let tileXMin: number | undefined
      let tileYMin: number | undefined
      let foundTile = false
      for (tileIndex = 0; tileIndex < iiifTiles.length; tileIndex++) {
        tile = iiifTiles[tileIndex]
        tileXMin = tile.column * tile.zoomLevel.originalWidth
        tileYMin = tile.row * tile.zoomLevel.originalHeight
        if (
          pixelX >= tileXMin &&
          pixelX <= tileXMin + tile.zoomLevel.originalWidth &&
          pixelY >= tileYMin &&
          pixelY <= tileYMin + tile.zoomLevel.originalHeight
        ) {
          foundTile = true
          break
        }
      }

      if (
        foundTile &&
        tile &&
        tileXMin !== undefined &&
        tileYMin !== undefined
      ) {
        const decodedJpeg = decodedJpegs[tileIndex]
        if (decodedJpeg) {
          const pixelTileX = (pixelX - tileXMin) / tile.zoomLevel.scaleFactor
          const pixelTileY = (pixelY - tileYMin) / tile.zoomLevel.scaleFactor
          const warpedBufferIndex = (x * TILE_SIZE + y) * CHANNELS
          const bufferIndex =
            (Math.floor(pixelTileY) * decodedJpeg.width +
              Math.floor(pixelTileX)) *
            CHANNELS
          for (let color = 0; color < CHANNELS; color++) {
            // TODO: don't just copy single pixel, do proper image interpolating
            warpedTile[warpedBufferIndex + color] =
              decodedJpeg.data[bufferIndex + color]
          }
        }
      }
    }
  }

  const png = encodePng([warpedTile.buffer], TILE_SIZE, TILE_SIZE, 256)
  const tileResponse = new Response(png, {
    status: 200,
    headers: { 'content-type': 'image/png' }
  })
  tileResponse.headers.append('Cache-Control', 's-maxage=100')

  //   context.waitUntil(cache.put(cacheKey, tileResponse.clone()))
  // }

  return tileResponse
}
