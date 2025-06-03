import { geoProjection, geoPath } from 'd3-geo'
import turfRewind from '@turf/rewind'
import { polygonToGeojsonPolygon } from '@allmaps/stdlib'

import { GcpTransformer } from '@allmaps/transform'

import type { Polygon } from 'geojson'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Size } from '@allmaps/types'

// TODO: move to shared library?
// These functions are used in @allmaps/latest as well

const mercator = geoProjection((x, y) => [
  x,
  Math.log(Math.tan(Math.PI / 4 + y / 2))
])

const path = geoPath().projection(mercator)

export function geometryToPath(polygon: Polygon, size: Size) {
  const [width, height] = size

  mercator.scale(1).translate([0, 0])

  const bounds = path.bounds(polygon)
  const scale =
    0.9 /
    Math.max(
      (bounds[1][0] - bounds[0][0]) / width,
      (bounds[1][1] - bounds[0][1]) / height
    )

  const translate: [number, number] = [
    (width - scale * (bounds[1][0] + bounds[0][0])) / 2,
    (height - scale * (bounds[1][1] + bounds[0][1])) / 2
  ]

  mercator.scale(scale).translate(translate)

  const d = path(polygon)

  const containsNaN = d && d.indexOf('NaN') > -1

  if (!containsNaN) {
    return d
  } else {
    return null
  }
}

export function getTransformedPolygon(map: GeoreferencedMap) {
  let transformer: GcpTransformer

  if (map.resourceMask.length >= 3) {
    if (map.gcps.length < 2) {
      throw new Error('map should have 2 or more gcps')
    } else if (map.gcps.length === 2) {
      transformer = new GcpTransformer(map.gcps, 'helmert')
    } else {
      transformer = new GcpTransformer(map.gcps, 'polynomial')
    }

    try {
      const polygon = polygonToGeojsonPolygon(
        transformer.transformToGeo([map.resourceMask])
      )

      // d3-geo requires the opposite polygon winding order of
      // the GoeJSON spec: https://github.com/d3/d3-geo
      turfRewind(polygon, { mutate: true, reverse: true })
      return polygon
    } catch (err) {
      let message = 'Unknown error'
      if (err instanceof Error) {
        message = err.message
      }
      throw new Error(message)
    }
  } else {
    throw new Error('resource mask should have more than 2 points')
  }
}
