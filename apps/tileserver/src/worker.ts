import { Router } from 'itty-router'

import { createWarpedTileResponse } from './warped-tile-response.js'
import { createJsonResponse, createErrorResponse } from './json-response.js'
import { mapFromParams, mapFromQuery} from './map-from-request.js'

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

router.get('/maps/:mapId/tiles.json', async (req, env, context) => {
  const mapId = req.params?.mapId

  const map = await mapFromParams(req.params, cache)

  // See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
  return createJsonResponse({
    tilejson: '3.0.0',
    id: `maps/${mapId}`,
    tiles: [`https://tiles.allmaps.org/maps/${mapId}/{z}/{x}/{y}.png`],
    fields: {}
    // bounds
    // center
    // maxzoom
    // minzoom
  })
})

// TODO: support retina tiles @2x
router.get('/maps/:mapId/:z/:x/:y.png', async (req, env, context) => {
  const map = await mapFromParams(req.params, cache)
  const { x, y, z } = xyzFromParams(req.params)

  return await createWarpedTileResponse(map, { x, y, z }, cache)
})

router.get('/:z/:x/:y', async (req, env, context) => {
  const map = mapFromQuery(req.query)
  const { x, y, z } = xyzFromParams(req.params)

  return await createWarpedTileResponse(map, { x, y, z }, cache)
})

router.get('/', () => {
  return createJsonResponse({
    name: 'Allmaps Tile Server'
  })
})

router.all('*', notFoundHandler)

export default {
  fetch: (request: Request, ...extra: any) =>
    router
      .handle(request, ...extra)
      .then((response) => {
        response.headers.set('Access-Control-Allow-Origin', '*')
        return response
      })
      .catch((err) => {
        return createErrorResponse(err.issues || err.message)
      })
}
