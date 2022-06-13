// TODO: implement these functions in module itself
import midpoint from '@turf/midpoint'
import distance from '@turf/distance'

import { toWorld } from './transformer.js'

import type { GCPTransformInfo } from './gdaltransform.js'
import type { Coord, ImageWorldGCP } from './transformer.js'

type Segment = {
  from: ImageWorldGCP
  to: ImageWorldGCP
}

type Point = {
  type: 'Point'
  coordinates: Coord
}

function point(point: Coord): Point {
  return {
    type: 'Point',
    coordinates: point
  }
}

export function polygonToWorld(
  transformArgs: GCPTransformInfo,
  points: Coord[],
  maxOffsetPercentage = 0.01,
  maxDepth = 8
) {
  const worldPoints = points.map((point) => ({
    image: point,
    world: toWorld(transformArgs, point)
  }))

  // if (maxOffsetPercentage > 0)

  const segments = Array.from(Array(worldPoints.length - 1)).map(
    (_, index) => ({
      from: worldPoints[index],
      to: worldPoints[index + 1]
    })
  )

  const segmentsWithMidpoints = segments
    .map((segment) =>
      addMidpoints(transformArgs, segment, maxOffsetPercentage, maxDepth)
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
  maxOffsetPercentage: number,
  maxDepth: number,
  depth = 0
): Segment | Segment[] {
  const imageMidpoint: Coord = [
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
    distanceMidpoints / distanceSegment > maxOffsetPercentage &&
    depth < maxDepth
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
        depth + 1
      ),
      addMidpoints(
        transformArgs,
        { from: newSegmentMidpoint, to: segment.to },
        maxOffsetPercentage,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}
