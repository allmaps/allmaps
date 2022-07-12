import { Router } from 'itty-router'

import { createWarpedTileResponse } from './warped-tile-response.js'
import { createJsonResponse, createErrorResponse } from './json-response.js'
import { mapFromParams, mapsFromQuery } from './map-from-request.js'
import { generateTileJson } from './tilejson.js'

import type { XYZTile, Caches } from './types.js'

const router = Router()

declare let caches: Caches
const cache = caches.default

function xyzFromParams(params: unknown): XYZTile {
  if (
    typeof params === 'object' &&
    params !== null &&
    'x' in params &&
    'y' in params &&
    'z' in params
  ) {
    const x = parseInt((params as { x: string }).x)
    const y = parseInt((params as { y: string }).y)
    const z = parseInt((params as { z: string }).z)

    return { x, y, z }
  } else {
    throw new Error('No valid x, y and z parameters found in URL')
  }
}

const notFoundHandler = () => createErrorResponse('Not found', 404, 'Not found')

router.get(
  '/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D.png',
  async (req, env, context) => {
    return createErrorResponse(
      'Encountered unprocessed template URL. Please read documentation.',
      400,
      'Bad Request'
    )
  }
)

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D.png', async (req, env, context) => {
  return createErrorResponse(
    'Encountered unprocessed template URL. Please read documentation.',
    400,
    'Bad Request'
  )
})

router.get('/tiles.json', async (req, env, context) => {
  const maps = await mapsFromQuery(cache, req.query)

  if (maps.length !== 1) {
    throw new Error('Annotation must contain exactly one map')
  }
  const map = maps[0]

  const url = new URL(req.url)
  const templateUrl: string = `${env.TILE_SERVER_BASE_URL}/{z}/{x}/{y}.png${url.search}`

  return createJsonResponse(generateTileJson(templateUrl, map))
})

router.get('/maps/:mapId/tiles.json', async (req, env, context) => {
  const mapId = req.params?.mapId
  const map = await mapFromParams(cache, env, req.params)

  const urlTemplate = `${env.TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}.png`

  return createJsonResponse(generateTileJson(urlTemplate, map))
})

// TODO: support retina tiles @2x
router.get('/maps/:mapId/:z/:x/:y.png', async (req, env, context) => {
  const map = await mapFromParams(cache, env, req.params)
  const { x, y, z } = xyzFromParams(req.params)

  return await createWarpedTileResponse(map, { x, y, z }, cache)
})

router.get('/:z/:x/:y.png', async (req, env, context) => {
  const maps = await mapsFromQuery(cache, req.query)
  const { x, y, z } = xyzFromParams(req.params)

  if (maps.length !== 1) {
    throw new Error('Annotation must contain exactly one map')
  }
  const map = maps[0]

  return await createWarpedTileResponse(map, { x, y, z }, cache)
})

router.get('/', () => {
  return createJsonResponse({
    name: 'Allmaps Tile Server'
  })
})

router.all('*', notFoundHandler)

export default {
  fetch: async (req: Request, ...extra: any) => {
    const url = req.url

    const cacheResponse = await cache.match(req.url)

    if (cacheResponse) {
      console.log('Found in cache:', req.url)
      return cacheResponse
    } else {
      console.log('Not found in cache:', req.url)

      return router
        .handle(req, ...extra)
        .then(async (res) => {
          // Set CORS headers
          res.headers.set('Access-Control-Allow-Origin', '*')

          // Set Cache TTL
          const ttlSeconds = 5 * 60
          res.headers.set('Cache-Control', `s-maxage=${ttlSeconds}`)

          // await cache.put(url, res)
          await cache.put(url, res.clone())

          return res
        })
        .catch((err) => {
          console.error(err)
          return createErrorResponse(err.issues || err.message)
        })
    }
  }
}
