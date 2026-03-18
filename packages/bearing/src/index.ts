import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'
import {
  bearing,
  computeBbox,
  midPoint,
  radiansToDegrees
} from '@allmaps/stdlib'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { TransformationTypeInputs } from '@allmaps/transform'
import type { Point, Ring } from '@allmaps/types'
import type { WarpedMap } from '@allmaps/render'

// Using helmert transformation by default, not map transformation type,
// since possible for any amount of points, consistent,
// faster when many gcps and accurate when showing original image

/**
 * Compute the bearing of a Georeferenced Map.
 *
 * @param georeferencedMap - Georeferenced Map
 * @returns The bearing of the map in degrees, measured from the north line
 */
export function computeGeoreferencedMapBearing(
  georeferencedMap: GeoreferencedMap,
  options?: Partial<ProjectedGcpTransformerOptions & TransformationTypeInputs>
) {
  if (georeferencedMap.gcps.length < 2) {
    throw new Error('Not enough GCPs to compute bearing')
  }

  const projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(
    georeferencedMap,
    options
  )

  return computeBearingInternal(
    georeferencedMap.resourceMask,
    projectedTransformer
  )
}

/**
 * Compute the bearing of a Warped Map.
 *
 * @param warpedMap - Warped Map
 * @returns The bearing of the map in degrees, measured from the north line
 */
export function computeWarpedMapBearing(
  warpedMap: WarpedMap,
  options?: Partial<ProjectedGcpTransformerOptions & TransformationTypeInputs>
) {
  if (warpedMap.gcps.length < 2) {
    throw new Error('Not enough GCPs to compute bearing')
  }

  const projectedTransformer = warpedMap.getProjectedTransformer(
    options?.transformationType,
    options
  )

  return computeBearingInternal(warpedMap.resourceMask, projectedTransformer)
}

function computeBearingInternal(
  resourceMask: Ring,
  projectedTransformer: ProjectedGcpTransformer
): number {
  const resourceMaskBbox = computeBbox(resourceMask)

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
    projectedTransformer.transformToProjectedGeo(resourceTopCenter)
  const projectedGeoBottomCenter =
    projectedTransformer.transformToProjectedGeo(resourceBottomCenter)

  return radiansToDegrees(
    bearing([projectedGeoBottomCenter, projectedGeoTopCenter])
  )
}
