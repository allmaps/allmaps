import type { ApiMap } from '@allmaps/api-shared/types'

export function generateFeature(map: ApiMap) {
  return {
    type: 'Feature',
    properties: { ...map, geoMask: undefined },
    // If the map does not have a geoMask, return null for the geometry.
    // This ensures that the GeoJSON Feature is still valid:
    //   https://datatracker.ietf.org/doc/html/rfc7946#section-3.2
    geometry: map.geoMask || null
  }
}

export function generateFeatureCollection(maps: ApiMap[]) {
  return {
    type: 'FeatureCollection',
    features: maps.map(generateFeature)
  }
}
