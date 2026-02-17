import { png, webp, jpeg } from 'itty-router'

import { Viewport } from '@allmaps/render'
import { WasmRenderer } from '@allmaps/render/wasm'
import { bboxToPolygon } from '@allmaps/stdlib'
import { findBestFrame } from '@allmaps/frame'

import { cachedFetch } from './fetch.js'
import { getAnnotationUrl } from './urls.js'

import type { QueryOptions, ResourceWithId } from './types.js'
import type { Size, FetchFn, Polygon } from '@allmaps/types'

// Import WASM module (initialization happens at worker startup)
import * as wasmModule from '@allmaps/render-wasm'

export async function generateWarpedMapImage(
  resourceWithId: ResourceWithId,
  size: Size,
  options: Partial<QueryOptions>
) {
  // Use unified URL getter (supports maps, images, manifests)
  const annotationUrl = getAnnotationUrl(resourceWithId)

  const annotation = await cachedFetch(annotationUrl).then((response) =>
    response.json()
  )

  // Parse transformation type
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  // Get format from options (extracted from URL path), default to WebP
  const format = options.format || 'webp'

  const renderer = new WasmRenderer(wasmModule, {
    fetchFn: cachedFetch as FetchFn,
    createRTree: false,
    transformationType,
    outputFormat: format
  })

  await renderer.addGeoreferenceAnnotation(annotation)

  // Create viewport with full feature parity
  let viewport: Viewport

  if (options.bounds) {
    // Strategy 1: Use explicit bounds
    const geoPolygon = bboxToPolygon(options.bounds)
    viewport = Viewport.fromSizeAndGeoPolygon(size, geoPolygon)
  } else if (options.fit === 'inside') {
    // Strategy 2: Find best inside-fit frame
    const warpedMaps = renderer.warpedMapList.getWarpedMaps()
    const mapPolygons: Polygon[] = []
    for (const warpedMap of warpedMaps) {
      // geoMask is a Ring, wrap it in array to make Polygon
      mapPolygons.push([warpedMap.geoMask])
    }

    if (mapPolygons.length === 0) {
      throw new Error('Cannot determine map geometry for inside fit')
    }

    const insideBounds = findBestFrame(mapPolygons, size)
    const geoPolygon = bboxToPolygon(insideBounds)
    viewport = Viewport.fromSizeAndGeoPolygon(size, geoPolygon)
  } else {
    // Strategy 3: Default fit behavior
    viewport = Viewport.fromSizeAndMaps(size, renderer.warpedMapList, {
      fit: options.fit || 'contain'
    })
  }

  const imageBuffer = await renderer.render(viewport)

  // Return appropriate response based on format
  if (format === 'webp') {
    return webp(imageBuffer)
  } else if (format === 'jpeg') {
    return jpeg(imageBuffer)
  } else {
    return png(imageBuffer)
  }
}
