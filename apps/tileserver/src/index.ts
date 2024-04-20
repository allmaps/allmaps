import { Router } from 'itty-router'

import { createWarpedTileResponse } from './warped-tile-response.js'
import { createJsonResponse, createErrorResponse } from './json-response.js'
import { mapsFromParams, mapsFromQuery } from './maps-from-request.js'
import { optionsFromQuery } from './options.js'
import { generateTileJson } from './tilejson.js'
import { generateTilesHtml } from './html.js'
import { ONE_HOUR } from './fetch.js'

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

// -------------------------------------------------------------------------------------------
// Direct template URL requests - redirect to tiles.allmaps.org
// -------------------------------------------------------------------------------------------

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/images/:imageId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/manifests/:manifestId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

// -------------------------------------------------------------------------------------------
// TileJSON
// -------------------------------------------------------------------------------------------

router.get('/tiles.json', async (req, env) => {
  const maps = await mapsFromQuery(req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const templateUrl = `${env.TILE_SERVER_BASE_URL}/{z}/{x}/{y}.png${url.search}`

  return createJsonResponse(generateTileJson(templateUrl, maps, options))
})

router.get('/maps/:mapId/tiles.json', async (req, env) => {
  const mapId = req.params?.mapId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplate = `${env.TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}.png${url.search}`

  return createJsonResponse(generateTileJson(urlTemplate, maps, options))
})

router.get('/images/:imageId/tiles.json', async (req, env) => {
  const imageId = req.params?.imageId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplate = `${env.TILE_SERVER_BASE_URL}/images/${imageId}/{z}/{x}/{y}.png${url.search}`

  return createJsonResponse(generateTileJson(urlTemplate, maps, options))
})

router.get('/manifests/:manifestId/tiles.json', async (req, env) => {
  const manifestId = req.params?.manifestId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplate = `${env.TILE_SERVER_BASE_URL}/manifests/${manifestId}/{z}/{x}/{y}.png${url.search}`

  return createJsonResponse(generateTileJson(urlTemplate, maps, options))
})

// -------------------------------------------------------------------------------------------
// PNG tiles
// -------------------------------------------------------------------------------------------

// TODO: support retina tiles @2x
router.get('/:z/:x/:y.png', async (req) => {
  const maps = await mapsFromQuery(req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return await createWarpedTileResponse(maps, { x, y, z }, options)
})

router.get('/maps/:mapId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return await createWarpedTileResponse(maps, { x, y, z }, options)
})

router.get('/images/:imageId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return await createWarpedTileResponse(maps, { x, y, z }, options)
})

router.get('/manifests/:manifestId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return await createWarpedTileResponse(maps, { x, y, z }, options)
})

// -------------------------------------------------------------------------------------------
// Root and wildcard routes
// -------------------------------------------------------------------------------------------

router.get('/', () => createJsonResponse({ name: 'Allmaps Tile Server' }))

router.all('*', () =>
  createJsonResponse({ error: 'Not found' }, 404, 'Not found')
)

export default {
  fetch: async (request: Request, ...extra: []) => {
    const url = request.url

    const cacheResponse = await cache.match(request.url)

    if (cacheResponse) {
      return cacheResponse
    } else {
      return router
        .handle(request, ...extra)
        .then((response) => {
          if (response.status !== 200) {
            throw new Error(`Failed to fetch ${url}`)
          }

          // Set CORS and Cache headers
          response.headers.set('Access-Control-Allow-Origin', '*')
          response.headers.append('Cache-Control', `s-maxage=${ONE_HOUR}`)

          cache.put(url, response.clone())

          return response
        })
        .catch((err) => {
          return createErrorResponse(err)
        })
    }
  }
}
