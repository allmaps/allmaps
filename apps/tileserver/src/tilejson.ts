import { json } from 'itty-router'
import {
  WarpedMapList,
  createWarpedMapFactory
} from '@allmaps/render/int-array'

import type { Tilejson, TilejsonOptions } from './types.js'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export async function generateTileJson(
  georeferencedMaps: GeoreferencedMap[],
  options: TilejsonOptions,
  urlTemplate: string
): Promise<Tilejson> {
  const warpedMapList = new WarpedMapList(createWarpedMapFactory())

  for (const georeferencedMap of georeferencedMaps) {
    await warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  const bounds = warpedMapList.getBbox()
  const center = warpedMapList.getCenter()

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
