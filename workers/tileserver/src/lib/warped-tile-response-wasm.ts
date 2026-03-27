import { png, webp } from 'itty-router'

import { Viewport } from '@allmaps/render'
import { WasmRenderer, type OutputFormat } from '@allmaps/render/wasm'

import { xyzTileToProjectedGeoBbox } from './geo.js'
import { cachedFetch } from './fetch.js'

import type { Bbox, FetchFn } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { XYZTile, TransformationOptions, TileResolution } from './types.js'
import { bboxToRectangle } from '@allmaps/stdlib'

// Import WASM initialization and module for Cloudflare Workers
import wasmInit, * as wasmModule from '@allmaps/render-wasm'

// THe worker wants the direct path to the WASM file, so we import it as a URL
import wasmFile from '../../../packages/render-wasm/pkg/allmaps_render_wasm_bg.wasm'

// Initialize WASM module (Cloudflare Workers support top-level await)
// Use new wasm-bindgen initialization API with module_or_path parameter
await wasmInit({ module_or_path: wasmFile })

const TILE_WIDTH = 256

export async function createWarpedTileResponseWasm(
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  { x, y, z }: XYZTile,
  resolution: TileResolution = 'normal',
  format: OutputFormat = 'png'
): Promise<Response> {
  if (!(x >= 0 && y >= 0 && z >= 0)) {
    throw new Error('x, y and z must be positive integers')
  }

  // TODO: simplify this when TilejsonOptions will be aligned with TransformationOptions from @allmaps/render
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const renderer = new WasmRenderer(wasmModule, {
    fetchFn: cachedFetch as FetchFn,
    createRTree: false,
    transformationType,
    outputFormat: format
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

  return format === 'webp' ? webp(imageBuffer) : png(imageBuffer)
}
