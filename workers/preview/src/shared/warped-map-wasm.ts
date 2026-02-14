import { png, webp } from 'itty-router'

import { decode as decodeJpeg, type UintArrRet } from 'jpeg-js'

import { Viewport } from '@allmaps/render'
import { WasmRenderer, type OutputFormat } from '@allmaps/render/wasm'

import { cachedFetch } from './fetch.js'

import type { TransformationOptions } from './types.js'

import type { Size, FetchFn } from '@allmaps/types'

// Import WASM module
import * as wasmModule from '@allmaps/render-wasm'

function getImageData(input: Uint8ClampedArray) {
  return decodeJpeg(input, { useTArray: true })
}

export async function generateWarpedMapImageWasm(
  mapId: string,
  size: Size,
  options: Partial<TransformationOptions>,
  format: OutputFormat = 'png'
) {
  const annotationUrl = `https://annotations.allmaps.org/maps/${mapId}`

  const annotation = await cachedFetch(annotationUrl).then((response) =>
    response.json()
  )

  // TODO: simplify this when this will be aligned with TransformationOptions from @allmaps/render
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const renderer = new WasmRenderer<UintArrRet>(wasmModule, getImageData, {
    fetchFn: cachedFetch as FetchFn,
    createRTree: false,
    transformationType,
    outputFormat: format
  })

  await renderer.addGeoreferenceAnnotation(annotation)

  const viewport = Viewport.fromSizeAndMaps(size, renderer.warpedMapList)
  const imageBuffer = await renderer.render(viewport)

  return format === 'webp' ? webp(imageBuffer) : png(imageBuffer)
}
