import { png, webp } from 'itty-router'

import { Viewport } from '@allmaps/render'
import { WasmRenderer } from '@allmaps/render/wasm'
import { bboxToRectangle } from '@allmaps/stdlib'

import { xyzTileToProjectedGeoBbox } from './geo.js'
import { createCachedFetch } from './fetch.js'

import type { Bbox } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { WorkerEnv } from '@allmaps/env/worker'
import type { XYZTile, TransformationOptions, TileResolution } from './types.js'

// Import WASM initialization and module for Cloudflare Workers
import wasmInit, * as wasmModule from '@allmaps/render-wasm'

// THe worker wants the direct path to the WASM file, so we import it as a URL
import wasmFile from '../../../../packages/render-wasm/pkg/allmaps_render_wasm_bg.wasm'

// Initialize WASM module (Cloudflare Workers support top-level await)
// Use new wasm-bindgen initialization API with module_or_path parameter
await wasmInit({ module_or_path: wasmFile })

const TILE_WIDTH = 256
type TileOutputFormat = 'png' | 'webp'

export async function createWarpedTileResponseWasm(
  env: WorkerEnv,
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  { x, y, z }: XYZTile,
  resolution: TileResolution = 'normal',
  format: TileOutputFormat = 'png'
): Promise<Response> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  // TODO: simplify this when TilejsonOptions will be aligned with TransformationOptions from @allmaps/render
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const cachedFetch = createCachedFetch(env)

  const renderer = new WasmRenderer(wasmModule, {
    fetchFn: cachedFetch,
    createRTree: false,
    transformationType,
    outputFormat: format,
    interpolation: 'cubic'
  })

  for (const georeferencedMap of georeferencedMaps) {
    await renderer.addGeoreferencedMap(georeferencedMap)
  }

  const projectedGeoBbox: Bbox = xyzTileToProjectedGeoBbox({ x, y, z })
  const projectedGeoRectangle = bboxToRectangle(projectedGeoBbox)

  const viewport = Viewport.fromSizeAndProjectedGeoPolygon(
    [TILE_WIDTH, TILE_WIDTH],
    [projectedGeoRectangle],
    { devicePixelRatio: resolution === 'retina' ? 2 : 1 }
  )

  const imageBuffer = await renderer.render(viewport)

  if (format === 'webp') {
    return webp(imageBuffer)
  } else if (format === 'png') {
    return png(imageBuffer)
  }

  throw new Error(`Unsupported tile output format: ${format}`)
}
