import dotenv from 'dotenv'
import sharp from 'sharp'
import express from 'express'

import { createTransformer, toImage } from '@allmaps/transform'
import { parseIiif, getIiifTile, getImageUrl } from '@allmaps/iiif-parser'
import { iiifTilesForMapExtent } from '@allmaps/render'

import { xyzTileToGeoExtent, pointInPolygon } from './geo.js'
import { fetchJson, fetchImage } from './fetch.js'
import Cache from './cache.js'

const cache = Cache()

dotenv.config()

const TILE_SIZE = 256
const CHANNELS = 4

const app = express()

const port = process.env.PORT || 3000

function sendFetchError (res, err) {
  // TODO: send error description in HTTP headers
  console.error('Fetch error:', err.message)

  if (!err.response) {
    res.status(500).send({
      error: 'Internal server error'
    })
    return
  }

  const response = err.response

  if (response.status === 404) {
    res.status(400).send({
      error: 'Not found'
    })
  } else {
    res.status(500).send({
      error: 'Internal server error'
    })
  }
}

function sendError (res, err) {
  res.status(500).send({
    error: err.message || 'Internal server error'
  })
}

app.get('/', async (req, res) => {
  res.send({
    name: 'Allmaps Tile Server'
  })
})

// TODO:
// app.get('/maps/:mapId/tiles.json', async (req, res) => {
//   // See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
// })

// TODO: support retina tiles @2x
app.get('/maps/:mapId/:z/:x/:y.png', async (req, res) => {
  res.set({ 'Content-Type': 'image/png' })

  // TODO: implement cancelled request
  // req.on('close', (err) => {
  //   cancelRequest = true
  // })

  let useCache = true
  if ('nocache' in req.query) {
    useCache = false
  }

  const xyzTileUrl = `https://tiles.allmaps.org/${req.originalUrl}`

  let cached
  // TODO: also use useCache in fetchImage and fetchJson
  if (useCache) {
    cached = await cache.get(xyzTileUrl)
  }

  if (cached) {
    res.send(cached)
    return
  }

  const mapId = req.params.mapId

  const z = parseInt(req.params.z)
  const x = parseInt(req.params.x)
  const y = parseInt(req.params.y)

  let map
  try {
    map = await fetchJson(cache, `https://api.allmaps.org/maps/${mapId}`)
  } catch (err) {
    sendFetchError(res, err)
    return
  }

  let pixelMask
  if (map.pixelMask) {
    pixelMask = map.pixelMask
  } else {
    // TODO: create mask from full image
  }

  let image
  try {
    image = await fetchJson(cache, `${map.image.uri}/info.json`)
  } catch (err) {
    sendFetchError(res, err)
    return
  }

  let parsedImage
  try {
    parsedImage = parseIiif(image)
  } catch (err) {
    sendError(res, err)
    return
  }

  const extent = xyzTileToGeoExtent({x, y, z})

  let transformer
  try {
    transformer = createTransformer(map.gcps)
  } catch (err) {
    sendError(res, err)
    return
  }

  const iiifTiles = iiifTilesForMapExtent(transformer, parsedImage, [TILE_SIZE, TILE_SIZE], extent)
  const iiifTileUrls = iiifTiles
    .map((tile) => {
      const { region, size } = getIiifTile(parsedImage, tile, tile.x, tile.y)
      return getImageUrl(parsedImage, { region, size })
    })

  let iiifTileImages
  try {
    iiifTileImages = await Promise.all(iiifTileUrls.map((url) => fetchImage(cache, url)))
  } catch (err) {
    sendError(res, err)
    return
  }

  const buffers = await Promise.all(iiifTileImages
    .map((image) => image.length ? sharp(image)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true }) : null))

  const warpedTile = Buffer.alloc(TILE_SIZE * TILE_SIZE * CHANNELS)

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
      //  remove pointInPolygon check and fix first
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

        if (pixelX >= tileXMin && pixelX <= tileXMin + tile.originalWidth &&
          pixelY >= tileYMin && pixelY <= tileYMin + tile.originalHeight) {
          foundTile = true
          break
        }
      }

      if (tileIndex !== undefined && foundTile) {
        const buffer = buffers[tileIndex]

        if (buffer) {
          const pixelTileX = (pixelX - tileXMin) / tile.scaleFactor
          const pixelTileY = (pixelY - tileYMin) / tile.scaleFactor

          const warpedBufferIndex = (x * TILE_SIZE + y) * CHANNELS
          const bufferIndex = (Math.floor(pixelTileY) * buffer.info.width + Math.floor(pixelTileX)) * buffer.info.channels

          for (let color = 0; color < CHANNELS; color++) {
            // TODO: don't just copy single pixel, do proper image interpolating
            warpedTile[warpedBufferIndex + color] = buffer.data[bufferIndex + color]
          }
        }
      }
    }
  }

  const warpedTileJpg = await sharp(warpedTile, {
    raw: {
      width: TILE_SIZE,
      height: TILE_SIZE,
      channels: CHANNELS
    }
  })
    .toFormat('png')
    .toBuffer()

  res.send(warpedTileJpg)

  cache.set(xyzTileUrl, warpedTileJpg)
})

app.listen(port, () => {
  console.log(`Allmaps Tile Server listening at http://localhost:${port}`)
})
