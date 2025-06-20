import { json } from 'itty-router'
import { WarpedMapList, createWarpedMapFactory } from '@allmaps/render'

import { cachedFetch } from './fetch.js'

import type { TransformationOptions } from './types.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { FetchFn } from '@allmaps/types'

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export async function generateTileJsonResponse(
  georeferencedMaps: GeoreferencedMap[],
  options: TransformationOptions,
  urlTemplate: string
): Promise<Response> {
  // TODO: simplify this when this will be aligned with TransformationOptions from @allmaps/render
  let transformationType
  if (options['transformation.type']) {
    transformationType = options['transformation.type']
  }

  const warpedMapList = new WarpedMapList(createWarpedMapFactory(), {
    fetchFn: cachedFetch as FetchFn,
    createRTree: false,
    transformationType
  })

  for (const georeferencedMap of georeferencedMaps) {
    await warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  const bounds = warpedMapList.getMapsBbox()
  const center = warpedMapList.getMapsCenter()

  if (!bounds || !center) {
    throw new Error('Could not compute bounding box and center of maps')
  }

  return json({
    tilejson: '3.0.0',
    id: urlTemplate,
    tiles: [urlTemplate],
    fields: {},
    bounds,
    center
    // TODO: add minzoom and maxzoom
  })
}
