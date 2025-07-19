import bearing from '@turf/bearing'

import {
  lonLatProjection,
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'
import { computeBbox, mergePartialOptions, midPoint } from '@allmaps/stdlib'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { TransformationTypeInputs } from '@allmaps/transform'
import type { Point } from '@allmaps/types'

const DEFAULT_COMPUTE_GEOREFERENCED_MAP_BEARING_OPTIONS: Partial<
  ProjectedGcpTransformerOptions & TransformationTypeInputs
> = {
  transformationType: 'helmert',
  projection: lonLatProjection
}

/**
 * Computes the bearing of a Georeferenced Map.
 *
 * @param map - Georeferenced Map
 * @returns The bearing of the map in degrees, measured from the north line
 */

export function computeGeoreferencedMapBearing(
  map: GeoreferencedMap,
  options?: Partial<ProjectedGcpTransformerOptions & TransformationTypeInputs>
) {
  options = mergePartialOptions(
    DEFAULT_COMPUTE_GEOREFERENCED_MAP_BEARING_OPTIONS,
    options
  )

  let projectedTransformer: ProjectedGcpTransformer

  if (map.gcps.length < 2) {
    throw new Error('Not enough GCPs to compute bearing')
  } else {
    // Using helmert transformation, not map transformation type,
    // since possible for any amount of points, consistent,
    // faster when many gcps and accurate when showing original image
    projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(
      map,
      options
    )
  }

  const resourceMaskBbox = computeBbox(map.resourceMask)

  const resourceTopLeft = [resourceMaskBbox[0], resourceMaskBbox[1]] as Point
  const resourceBottomLeft = [resourceMaskBbox[0], resourceMaskBbox[3]] as Point
  const resourceTopRight = [resourceMaskBbox[2], resourceMaskBbox[1]] as Point
  const resourceBottomRight = [
    resourceMaskBbox[2],
    resourceMaskBbox[3]
  ] as Point
  const resourceTopCenter = midPoint(resourceTopLeft, resourceTopRight)
  const resourceBottomCenter = midPoint(resourceBottomLeft, resourceBottomRight)
  const projectedGeoTopCenter =
    projectedTransformer.transformToGeo(resourceTopCenter)
  const projectedGeoBottomCenter =
    projectedTransformer.transformToGeo(resourceBottomCenter)

  return -bearing(projectedGeoBottomCenter, projectedGeoTopCenter)
}
