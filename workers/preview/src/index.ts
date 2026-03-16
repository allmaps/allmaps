import { AutoRouter, error, cors, json, IRequestStrict } from 'itty-router'

import { parsePreviewEnv } from '@allmaps/env/preview'

import { optionsFromQuery } from './shared/options.js'
import { match, put, headers } from './shared/cache.js'
import {
  toJpgImageResponse,
  toWebPImageResponse
} from './shared/image-converter.js'

import type { Env, QueryOptions } from './shared/types.js'

import type { Size } from '@allmaps/types'

// Initialize WASM module at worker startup
import wasmInit from '@allmaps/render-wasm'
import wasmFile from '../../../packages/render-wasm/pkg/allmaps_render_wasm_bg.wasm'

// Top-level await (Cloudflare Workers supports this)
// Use new wasm-bindgen initialization API with module_or_path parameter
await wasmInit({ module_or_path: wasmFile })

// Cards

// Warped Map:
import { generateWarpedMapCard } from './cards/warped-map.js'

// Apps:
import { generateEditorCard } from './cards/editor.js'
import { generateHereCard } from './cards/here.js'
import { generateLatestCard } from './cards/latest.js'
import { generateViewerCard } from './cards/viewer.js'

type CFArgs = [Env, ExecutionContext]

const { preflight, corsify } = cors()

const router = AutoRouter<IRequestStrict, CFArgs>({
  before: [preflight],
  finally: [corsify, headers, put]
})

const ogImageSize: Size = [1200, 630]
const maxSize: Size = [1200, 1200]

function getSizeFromOptions(
  options: Partial<QueryOptions>,
  defaultSize: Size,
  maxSize: Size
): Size {
  const width = options.width
    ? Math.min(options.width, maxSize[0])
    : defaultSize[0]
  const height = options.height
    ? Math.min(options.height, maxSize[1])
    : defaultSize[1]
  return [width, height]
}

// ========================================
// /apps/latest - Latest georeferenced maps
// ========================================

router.get('/apps/latest.png', (req, env) => {
  return generateLatestCard(req, env, ogImageSize)
})

router.get('/apps/latest.jpg', (req, env) => {
  return toJpgImageResponse(generateLatestCard(req, env, ogImageSize))
})

router.get('/apps/latest.webp', (req, env) => {
  return toWebPImageResponse(generateLatestCard(req, env, ogImageSize))
})

// ========================================
// /apps/editor - Editor OG cards
// ========================================

router.get('/apps/editor/maps/:mapId.png', (req, env) => {
  const mapId = req.params.mapId
  const options = optionsFromQuery(req)

  return generateEditorCard(req, env, mapId, ogImageSize, options)
})

router.get('/apps/editor/maps/:mapId.jpg', (req, env) => {
  const mapId = req.params.mapId
  const options = optionsFromQuery(req)

  return toJpgImageResponse(
    generateEditorCard(req, env, mapId, ogImageSize, options)
  )
})

router.get('/apps/editor/maps/:mapId.webp', (req, env) => {
  const mapId = req.params.mapId
  const options = optionsFromQuery(req)

  return toWebPImageResponse(
    generateEditorCard(req, env, mapId, ogImageSize, options)
  )
})

// ========================================
// /apps/viewer - Viewer OG cards with warped maps
// ========================================

router.get('/apps/viewer/maps/:mapId.png', (req, env) => {
  const mapId = req.params.mapId
  const options = optionsFromQuery(req)

  return generateViewerCard(
    req,
    env,
    { type: 'map', id: mapId },
    ogImageSize,
    options
  )
})

router.get('/apps/viewer/maps/:mapId.jpg', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return toJpgImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'map', id: mapId },
      ogImageSize,
      options
    )
  )
})

router.get('/apps/viewer/maps/:mapId.webp', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return toWebPImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'map', id: mapId },
      ogImageSize,
      options
    )
  )
})

router.get('/apps/viewer/images/:imageId.png', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateViewerCard(
    req,
    env,
    { type: 'image', id: imageId },
    size,
    options
  )
})

router.get('/apps/viewer/images/:imageId.jpg', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)

  return toJpgImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'image', id: imageId },
      ogImageSize,
      options
    )
  )
})

router.get('/apps/viewer/images/:imageId.webp', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)

  return toWebPImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'image', id: imageId },
      ogImageSize,
      options
    )
  )
})

router.get('/apps/viewer/manifests/:manifestId.png', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateViewerCard(
    req,
    env,
    { type: 'manifest', id: manifestId },
    size,
    options
  )
})

router.get('/apps/viewer/manifests/:manifestId.jpg', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)

  return toJpgImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'manifest', id: manifestId },
      ogImageSize,
      options
    )
  )
})

router.get('/apps/viewer/manifests/:manifestId.webp', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)

  return toWebPImageResponse(
    generateViewerCard(
      req,
      env,
      { type: 'manifest', id: manifestId },
      ogImageSize,
      options
    )
  )
})

// ========================================
// /apps/here - "Here" location cards
// ========================================

router.get('/apps/here/maps/:mapId.png', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return generateHereCard(req, env, mapId, ogImageSize, options)
})

router.get('/apps/here/maps/:mapId.jpg', async (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return toJpgImageResponse(
    generateHereCard(req, env, mapId, ogImageSize, options)
  )
})

router.get('/apps/here/maps/:mapId.webp', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)

  return toWebPImageResponse(
    generateHereCard(req, env, mapId, ogImageSize, options)
  )
})

// ========================================
// /maps - Direct warped map images (WASM-rendered)
// Format extracted from URL automatically via options parser
// ========================================

router.get('/maps/:mapId.png', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'map', id: mapId },
    size,
    options
  )
})

router.get('/maps/:mapId.jpg', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'map', id: mapId },
    size,
    options
  )
})

router.get('/maps/:mapId.webp', (req, env) => {
  const mapId = req.params?.mapId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'map', id: mapId },
    size,
    options
  )
})

// ========================================
// /images - Direct warped map images by IIIF image ID
// Format extracted from URL automatically via options parser
// ========================================

router.get('/images/:imageId.png', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'image', id: imageId },
    size,
    options
  )
})

router.get('/images/:imageId.jpg', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'image', id: imageId },
    size,
    options
  )
})

router.get('/images/:imageId.webp', (req, env) => {
  const imageId = req.params?.imageId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'image', id: imageId },
    size,
    options
  )
})

// ========================================
// /manifests - Direct warped map images by IIIF manifest ID
// Format extracted from URL automatically via options parser
// ========================================

router.get('/manifests/:manifestId.png', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'manifest', id: manifestId },
    size,
    options
  )
})

router.get('/manifests/:manifestId.jpg', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'manifest', id: manifestId },
    size,
    options
  )
})

router.get('/manifests/:manifestId.webp', (req, env) => {
  const manifestId = req.params?.manifestId
  const options = optionsFromQuery(req)
  const size = getSizeFromOptions(options, ogImageSize, maxSize)

  return generateWarpedMapCard(
    req,
    env,
    { type: 'manifest', id: manifestId },
    size,
    options
  )
})

// ========================================
// Root
// ========================================

router.get('/', () => json({ name: 'Allmaps Preview' }))

export default {
  fetch: async (request: Request, env, ctx) => {
    const parsedEnv = parsePreviewEnv(env)

    if (!env.ASSETS) {
      throw new Error('ASSETS binding is not configured')
    }

    const previewEnv: Env = {
      ...parsedEnv,
      ASSETS: env.ASSETS
    }

    return (
      (previewEnv.USE_CACHE && (await match(request.url))) ||
      router.fetch(request, previewEnv, ctx).catch(error)
    )
  }
} satisfies ExportedHandler<Env>
