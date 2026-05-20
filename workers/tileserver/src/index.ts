import { AutoRouter, error, cors, json, IRequestStrict } from 'itty-router'

import { parseTileServerEnv } from '@allmaps/env/tileserver'

import { createWarpedTileResponseWasm } from './lib/warped-tile-response-wasm.js'
import { mapsFromParams, mapsFromQuery } from './lib/maps-from-request.js'
import { optionsFromQuery } from './lib/options.js'
import { generateTileJsonResponse as generateTileJsonResponse } from './lib/tilejson.js'
import { generateTilesHtml } from './lib/html.js'
import { match, put, headers } from './lib/cache.js'

import type { TileServerEnv } from '@allmaps/env/tileserver'

import type { XYZTile } from './lib/types.js'

type CFArgs = [TileServerEnv, ExecutionContext]

const { preflight, corsify } = cors()

const router = AutoRouter<IRequestStrict, CFArgs>({
  before: [preflight],
  finally: [corsify, headers, put]
})

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

// First, PNG tiles:

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D@2x.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/images/:imageId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/images/:imageId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get(
  '/manifests/:manifestId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.png',
  (req, env) => {
    const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
    return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
  }
)

router.get('/manifests/:manifestId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

// And WebP tiles:

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D@2x.webp', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/%7Bz%7D/%7Bx%7D/%7By%7D.webp', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.webp', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/maps/:mapId/%7Bz%7D/%7Bx%7D/%7By%7D.png', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get('/images/:imageId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.webp', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
})

router.get('/images/:imageId/%7Bz%7D/%7Bx%7D/%7By%7D.webp', (req, env) => {
  const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
  return generateTilesHtml(req, tileViewerBaseUrl)
})

router.get(
  '/manifests/:manifestId/%7Bz%7D/%7Bx%7D/%7By%7D@2x.webp',
  (req, env) => {
    const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
    return generateTilesHtml(req, tileViewerBaseUrl, 'retina')
  }
)

router.get(
  '/manifests/:manifestId/%7Bz%7D/%7Bx%7D/%7By%7D.webp',
  (req, env) => {
    const tileViewerBaseUrl = env.PUBLIC_TILE_VIEWER_BASE_URL
    return generateTilesHtml(req, tileViewerBaseUrl)
  }
)

// -------------------------------------------------------------------------------------------
// TileJSON
// -------------------------------------------------------------------------------------------

router.get('/tiles@2x.json', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/{z}/{x}/{y}@2x.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/{z}/{x}/{y}@2x.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/tiles.json', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/{z}/{x}/{y}.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/{z}/{x}/{y}.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/maps/:mapId/tiles@2x.json', async (req, env) => {
  const mapId = req.params?.mapId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}@2x.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}@2x.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/maps/:mapId/tiles.json', async (req, env) => {
  const mapId = req.params?.mapId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/maps/${mapId}/{z}/{x}/{y}.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/images/:imageId/tiles@2x.json', async (req, env) => {
  const imageId = req.params?.imageId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/images/${imageId}/{z}/{x}/{y}@2x.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/images/${imageId}/{z}/{x}/{y}@2x.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/images/:imageId/tiles.json', async (req, env) => {
  const imageId = req.params?.imageId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/images/${imageId}/{z}/{x}/{y}.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/images/${imageId}/{z}/{x}/{y}.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/manifests/:manifestId/tiles@2x.json', async (req, env) => {
  const manifestId = req.params?.manifestId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/manifests/${manifestId}/{z}/{x}/{y}@2x.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/manifests/${manifestId}/{z}/{x}/{y}@2x.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

router.get('/manifests/:manifestId/tiles.json', async (req, env) => {
  const manifestId = req.params?.manifestId
  const maps = await mapsFromParams(env, req)
  const options = optionsFromQuery(req)

  const url = new URL(req.url)
  const urlTemplates = [
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/manifests/${manifestId}/{z}/{x}/{y}.png${url.search}`,
    `${env.PUBLIC_TILE_SERVER_BASE_URL}/manifests/${manifestId}/{z}/{x}/{y}.webp${url.search}`
  ]

  return generateTileJsonResponse(env, maps, options, urlTemplates)
})

// -------------------------------------------------------------------------------------------
// PNG tiles
// -------------------------------------------------------------------------------------------

router.get('/:z/:x/:y@2x.png', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z }, 'retina')
})

router.get('/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z })
})

router.get('/maps/:mapId/:z/:x/:y@2x.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z }, 'retina')
})

router.get('/maps/:mapId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z })
})

router.get('/images/:imageId/:z/:x/:y@2x.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z }, 'retina')
})

router.get('/images/:imageId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z })
})

router.get('/manifests/:manifestId/:z/:x/:y@2x.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z }, 'retina')
})

router.get('/manifests/:manifestId/:z/:x/:y.png', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(env, maps, options, { x, y, z })
})

// -------------------------------------------------------------------------------------------
// WebP tiles
// -------------------------------------------------------------------------------------------

router.get('/:z/:x/:y@2x.webp', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'retina',
    'webp'
  )
})

router.get('/:z/:x/:y.webp', async (req, env) => {
  const maps = await mapsFromQuery(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'normal',
    'webp'
  )
})

router.get('/maps/:mapId/:z/:x/:y@2x.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'retina',
    'webp'
  )
})

router.get('/maps/:mapId/:z/:x/:y.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'normal',
    'webp'
  )
})

router.get('/images/:imageId/:z/:x/:y@2x.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'retina',
    'webp'
  )
})

router.get('/images/:imageId/:z/:x/:y.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'normal',
    'webp'
  )
})

router.get('/manifests/:manifestId/:z/:x/:y@2x.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'retina',
    'webp'
  )
})

router.get('/manifests/:manifestId/:z/:x/:y.webp', async (req, env) => {
  const maps = await mapsFromParams(env, req)
  const { x, y, z } = xyzFromParams(req.params)
  const options = optionsFromQuery(req)

  return createWarpedTileResponseWasm(
    env,
    maps,
    options,
    { x, y, z },
    'normal',
    'webp'
  )
})

// -------------------------------------------------------------------------------------------
// Router configuration
// -------------------------------------------------------------------------------------------

router.get('/', () => json({ name: 'Allmaps Tile Server' }))

export default {
  fetch: async (request: Request, env, ctx) => {
    const tileServerEnv = parseTileServerEnv(env)

    return (
      (tileServerEnv.USE_CACHE && (await match(request.url))) ||
      router.fetch(request, tileServerEnv, ctx).catch(error)
    )
  }
} satisfies ExportedHandler<TileServerEnv>
