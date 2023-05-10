import { GCPTransformer } from '@allmaps/transform'

import center from '@turf/center'
import bbox from '@turf/bbox'

import type { Map } from '@allmaps/annotation'

interface TileJSON {
  tilejson: '3.0.0'
  id: string | undefined
  tiles: string[]
  fields: {}
  bounds: number[]
  center: number[]
  // maxzoom
  // minzoom
}

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export function generateTileJson(urlTemplate: string, map: Map): TileJSON {
  const transformer = new GCPTransformer(map.gcps)

  const geoMask = transformer.toGeoJSON(map.pixelMask, {
    maxOffsetRatio: 0.01
  })

  bbox(geoMask)

  return {
    tilejson: '3.0.0',
    id: urlTemplate,
    tiles: [urlTemplate],
    fields: {},
    bounds: bbox(geoMask),
    center: center(geoMask).geometry.coordinates
    // TODO: add minzoom and maxzoom
  }
}
