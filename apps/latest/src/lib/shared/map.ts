import turfRewind from '@turf/rewind'

import { GcpTransformer } from '@allmaps/transform'
import { validateGeoreferencedMap } from '@allmaps/annotation'

import {
  getProperties,
  getHostname,
  getTimeAgo
} from '$lib/shared/properties.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { DisplayMap } from '$lib/shared/types.js'

export function parseGeoreferencedMap(apiMap: unknown) {
  try {
    const mapOrMaps = validateGeoreferencedMap(apiMap)
    return Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
  } catch (err) {
    throw new Error('Error parsing map')
  }
}

export function getDisplayMap(
  map: GeoreferencedMap,
  apiMap: unknown
): DisplayMap {
  const properties = getProperties(map, apiMap)

  if (map.gcps.length >= 2) {
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

        return {
          polygon,
          hostname: getHostname(map),
          timeAgo: getTimeAgo(map),
          properties
        }
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
    throw new Error('map should have 2 or more gcps')
  }
}
