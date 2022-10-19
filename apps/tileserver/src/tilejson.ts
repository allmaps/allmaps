import { GCPTransformer } from '@allmaps/transform'

import bbox from '@turf/bbox'

import type { Map } from '@allmaps/annotation'

type TileJSON = {
  tilejson: '3.0.0'
  id: string | undefined
  tiles: string[]
  fields: object
  bounds: number[]
  center: number[]
  // maxzoom
  // minzoom
}

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export function generateTileJson(urlTemplate: string, maps: Map[]): TileJSON {
  let geoMasks = []

  for (let map of maps) {
    const transformer = new GCPTransformer(map.gcps)

    const geoMask = transformer.toGeoJSON(map.pixelMask, {
      maxOffsetRatio: 0.01
    })
    geoMasks.push(geoMask)
  }

  const bounds = bbox({
    type: 'FeatureCollection',
    features: geoMasks.map((geoMask) => ({
      type: 'Feature',
      properties: {},
      geometry: geoMask
    }))
  })

  return {
    tilejson: '3.0.0',
    id: urlTemplate,
    tiles: [urlTemplate],
    fields: {},
    bounds,
    center: [
      (bounds[2] - bounds[0]) / 2 + bounds[0],
      (bounds[3] - bounds[1]) / 2 + bounds[1]
    ]
    // TODO: add minzoom and maxzoom
  }
}
