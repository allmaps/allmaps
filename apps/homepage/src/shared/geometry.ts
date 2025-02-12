import turfRewind from '@turf/rewind'
import { geoProjection, geoPath } from 'd3-geo'

import { GcpTransformer } from '@allmaps/transform'

import type { Polygon } from 'geojson'

import type { GeoreferencedMap } from '@allmaps/annotation'

const mercator = geoProjection((x, y) => [
  x,
  Math.log(Math.tan(Math.PI / 4 + y / 2))
])

const path = geoPath().projection(mercator)

export function getPolygon(map: GeoreferencedMap) {
  if (map.gcps.length >= 3) {
    if (map.resourceMask.length >= 3) {
      try {
        const transformer = new GcpTransformer(
          map.gcps,
          map.transformation?.type
        )

        const polygon = transformer.transformForwardAsGeojson([
          map.resourceMask
        ])

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
  } else {
    throw new Error('map should have more than 2 gcps')
  }
}

export function geometryToPath(polygon: Polygon, scaleTo: number) {
  const width = scaleTo
  const height = scaleTo

  mercator.scale(1).translate([0, 0])

  const bounds = path.bounds(polygon)
  const scale =
    1 /
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
    return
  }
}
