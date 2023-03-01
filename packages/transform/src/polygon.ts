// TODO: implement these functions in module itself
import midpoint from '@turf/midpoint'
import distance from '@turf/distance'

import { toWorld } from './transformer.js'

import type { GCPTransformInfo } from './gdaltransform.js'

import type {
  Position,
  GeoJSONPoint,
  GeoJSONPolygon,
  Segment
} from './shared/types.js'

function point(point: Position): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: point
  }
}

export function svgPolygonToGeoJSONPolygon(
  transformArgs: GCPTransformInfo,
  points: Position[],
  // TODO: use options param
  maxOffsetPercentage: number = 0,
  maxDepth = 8
): GeoJSONPolygon {
  if (!points || points.length < 3) {
    throw new Error('SVG polygon should contain at least 3 points')
  }

  const worldPoints = points.map((point) => ({
    image: point,
    world: toWorld(transformArgs, point)
  }))

  const segments = Array.from(Array(worldPoints.length)).map((_, index) => ({
    from: worldPoints[index],
    to: worldPoints[(index + 1) % worldPoints.length]
  }))

  const segmentsWithMidpoints = segments
    .map((segment) =>
      addMidpoints(transformArgs, segment, maxOffsetPercentage, maxDepth, 0)
    )
    .flat(1)

  return {
    type: 'Polygon',
    coordinates: [
      [
        segmentsWithMidpoints[0].from.world,
        ...segmentsWithMidpoints.map((segment) => segment.to.world)
      ]
    ]
  }
}

function addMidpoints(
  transformArgs: GCPTransformInfo,
  segment: Segment,
  maxOffsetPercentage: number | null,
  maxDepth: number,
  depth: number
): Segment | Segment[] {
  const imageMidpoint: Position = [
    (segment.from.image[0] + segment.to.image[0]) / 2,
    (segment.from.image[1] + segment.to.image[1]) / 2
  ]

  const segmentWorldMidpoint = midpoint(
    point(segment.from.world),
    point(segment.to.world)
  )
  const actualWorldMidpoint = point(toWorld(transformArgs, imageMidpoint))

  const distanceSegment = distance(
    point(segment.from.world),
    point(segment.to.world)
  )
  const distanceMidpoints = distance(segmentWorldMidpoint, actualWorldMidpoint)
  if (
    depth < maxDepth &&
    (maxOffsetPercentage
      ? distanceMidpoints / distanceSegment > maxOffsetPercentage
      : false) &&
    distanceSegment > 0
  ) {
    const newSegmentMidpoint = {
      image: imageMidpoint,
      world: actualWorldMidpoint.coordinates
    }

    return [
      addMidpoints(
        transformArgs,
        { from: segment.from, to: newSegmentMidpoint },
        maxOffsetPercentage,
        maxDepth,
        depth + 1
      ),
      addMidpoints(
        transformArgs,
        { from: newSegmentMidpoint, to: segment.to },
        maxOffsetPercentage,
        maxDepth,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}
