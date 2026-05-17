import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'
import {
  angle,
  angularMean,
  computeBbox,
  mergeOptions,
  midPoint,
  radiansToDegrees
} from '@allmaps/stdlib'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { TransformationTypeInputs } from '@allmaps/transform'
import type { Point, Ring } from '@allmaps/types'
import type { WarpedMap } from '@allmaps/render'

export type BearingOptions = {
  orientation: 'horizontal' | 'vertical' | 'mean'
}

export const DEFAULT_BEARING_OPTIONS: BearingOptions = {
  orientation: 'mean'
}

/**
 * Compute the bearing of a Georeferenced Map.
 *
 * @param georeferencedMap - Georeferenced Map
 * @returns The bearing of the map in degrees, measured in degrees from the north line in the clockwise (negative) direction
 */
export function computeGeoreferencedMapBearing(
  georeferencedMap: GeoreferencedMap,
  options?: Partial<
    BearingOptions & ProjectedGcpTransformerOptions & TransformationTypeInputs
  >
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
    projectedTransformer,
    options
  )
}

/**
 * Compute the bearing of a Warped Map.
 *
 * @param warpedMap - Warped Map
 * @returns The bearing of the map in degrees, measured in degrees from the north line in the clockwise (negative) direction
 */
export function computeWarpedMapBearing(
  warpedMap: WarpedMap,
  options?: Partial<
    BearingOptions & ProjectedGcpTransformerOptions & TransformationTypeInputs
  >
) {
  if (warpedMap.gcps.length < 2) {
    throw new Error('Not enough GCPs to compute bearing')
  }

  const projectedTransformer = warpedMap.getProjectedTransformer(
    options?.transformationType,
    options
  )

  return computeBearingInternal(
    warpedMap.resourceMask,
    projectedTransformer,
    options
  )
}

/**
 * Description placeholder
 *
 * @param resourceMask
 * @param projectedTransformer
 * @returns The bearing, in degrees from the north line in the clockwise (negative) direction
 */
function computeBearingInternal(
  resourceMask: Ring,
  projectedTransformer: ProjectedGcpTransformer,
  partialOptions?: Partial<BearingOptions>
): number {
  const options = mergeOptions(DEFAULT_BEARING_OPTIONS, partialOptions)

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

  const resourceCenterRight = midPoint(resourceTopRight, resourceBottomRight)
  const resourceCenterLeft = midPoint(resourceTopLeft, resourceBottomLeft)
  const projectedGeoCenterLeft =
    projectedTransformer.transformToProjectedGeo(resourceCenterLeft)
  const projectedGeoCenterRight =
    projectedTransformer.transformToProjectedGeo(resourceCenterRight)

  const verticalAngle = angle([projectedGeoBottomCenter, projectedGeoTopCenter])

  const horizontalAngle = angle([
    projectedGeoCenterLeft,
    projectedGeoCenterRight
  ])

  if (options.orientation == 'horizontal') {
    return -radiansToDegrees(horizontalAngle)
  } else if (options.orientation == 'vertical') {
    return -radiansToDegrees(verticalAngle - Math.PI / 2)
  } else {
    return -radiansToDegrees(
      angularMean(verticalAngle - Math.PI / 2, horizontalAngle)
    )
  }
}
