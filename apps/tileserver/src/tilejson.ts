import { GcpTransformer } from '@allmaps/transform'

import bbox from '@turf/bbox'

import type { Tilejson, TilejsonOptions } from './types.js'

import type { Map } from '@allmaps/annotation'

// See https://github.com/mapbox/tilejson-spec/blob/master/3.0.0/example/osm.json
export function generateTileJson(
  urlTemplate: string,
  maps: Map[],
  options: TilejsonOptions
): Tilejson {
  const geoMasks = []

  for (const map of maps) {
    const transformer = new GcpTransformer(
      map.gcps,
      options['transformation.type'] || map.transformation?.type,
      {
        differentHandedness: true
      }
    )

    const geoMask = transformer.transformForwardAsGeojson([map.resourceMask], {
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
