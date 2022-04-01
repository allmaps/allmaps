import jpeg from 'jpeg-js'
import UPNG from 'upng-js'

import { createTransformer, toImage } from '@allmaps/transform'
import { parseIiif, getIiifTile, getImageUrl } from '@allmaps/iiif-parser'
import { iiifTilesForMapExtent } from '@allmaps/render'

import { xyzTileToGeoExtent, pointInPolygon } from './src/geo.js'

const TILE_SIZE = 256
const CHANNELS = 4

function errorResponse(message, status) {
  return new Response(
    JSON.stringify(
      {
        error: message
      },
      null,
      2
    ),
    {
      status,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  )
}

async function cachedFetch(cache, context, url) {
  // const cacheUrl = new URL(request.url)
  // const cacheKey = new Request(cacheUrl.toString(), request)

  console.log('Fetching:', url)
  const cacheResponse = await cache.match(url)

  if (!cacheResponse) {
    console.log('  Not found in cache. Downloading.')
    const fetchResponse = await fetch(url)

    if (fetchResponse.status !== 200) {
      throw new Error(`Failed to fetch ${url}`)
    }

    // TODO: ttl from config
    // fetchResponse.headers.append('Cache-Control', 's-maxage=120')
    context.waitUntil(cache.put(url, fetchResponse.clone()))

    return fetchResponse
  } else {
    console.log('  Found in cache.')
    return cacheResponse
  }
}

export default {
  async fetch(request, environment, context) {
    const url = new URL(request.url)
    const match =
      /\/(?<type>\w+)\/(?<id>\w+)\/(?<z>\d+)\/(?<x>\d+)\/(?<y>\d+).png/.exec(
        url.pathname
      )

    if (!match || !match.groups) {
      return errorResponse('Not found', 404)
    }

    const { type, id } = match.groups

    if (type !== 'maps') {
      return errorResponse('Not found', 404)
    }

    const x = parseInt(match.groups.x)
    const y = parseInt(match.groups.y)
    const z = parseInt(match.groups.z)

    const params = {
      type,
      id,
      x,
      y,
      z
    }

    const cache = caches.default

    const cacheUrl = new URL(request.url)
    const cacheKey = new Request(cacheUrl.toString(), request)

    let tileResponse = await cache.match(cacheKey)

    if (!tileResponse) {
      const mapId = id

      let map
      try {
        const mapResponse = await cachedFetch(
          cache,
          context,
          `https://api.allmaps.org/maps/${mapId}`
        )

        map = await mapResponse.json()
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      let pixelMask
      if (map.pixelMask) {
        pixelMask = map.pixelMask
      } else {
        // TODO: create mask from full image
        return errorResponse(`Map ${id} does not have pixelMask`, 500)
      }

      let imageInfo
      try {
        const imageInfoResponse = await cachedFetch(
          cache,
          context,
          `${map.image.uri}/info.json`
        )
        imageInfo = await imageInfoResponse.json()
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      let parsedImage
      try {
        parsedImage = parseIiif(imageInfo)
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      const extent = xyzTileToGeoExtent({ x, y, z })

      let transformer
      try {
        transformer = createTransformer(map.gcps)
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      const iiifTiles = iiifTilesForMapExtent(
        transformer,
        parsedImage,
        [TILE_SIZE, TILE_SIZE],
        extent
      )
      const iiifTileUrls = iiifTiles.map((tile) => {
        const { region, size } = getIiifTile(parsedImage, tile, tile.x, tile.y)
        return getImageUrl(parsedImage, { region, size })
      })

      let iiifTileImages
      try {
        const iiifTileResponses = await Promise.all(
          iiifTileUrls.map((url) => cachedFetch(cache, context, url))
        )
        iiifTileImages = await Promise.all(
          iiifTileResponses.map((response) => response.arrayBuffer())
        )
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      // TODO: Rename
      let decodedJpegs
      try {
        decodedJpegs = iiifTileImages.map((buffer) =>
          jpeg.decode(buffer, { useTArray: true })
        )
      } catch (err) {
        return errorResponse(err.message, 500)
      }

      // const { width, height, data: imageData } = decodedJpeg

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
          const world = [
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
          let tileIndex
          let tile
          let tileXMin
          let tileYMin
          let foundTile = false

          for (tileIndex in iiifTiles) {
            tile = iiifTiles[tileIndex]
            tileXMin = tile.x * tile.originalWidth
            tileYMin = tile.y * tile.originalHeight
            if (
              pixelX >= tileXMin &&
              pixelX <= tileXMin + tile.originalWidth &&
              pixelY >= tileYMin &&
              pixelY <= tileYMin + tile.originalHeight
            ) {
              foundTile = true
              break
            }
          }
          if (tileIndex !== undefined && foundTile) {
            const decodedJpeg = decodedJpegs[tileIndex]
            if (decodedJpeg) {
              const pixelTileX = (pixelX - tileXMin) / tile.scaleFactor
              const pixelTileY = (pixelY - tileYMin) / tile.scaleFactor
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

      const png = UPNG.encode([warpedTile.buffer], TILE_SIZE, TILE_SIZE, 256)

      tileResponse = new Response(png, {
        status: 200,
        headers: { 'content-type': 'image/png' }
      })

      tileResponse.headers.append('Cache-Control', 's-maxage=100')

      context.waitUntil(cache.put(cacheKey, tileResponse.clone()))
    }

    return tileResponse
  }
}
