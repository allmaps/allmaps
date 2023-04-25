// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'
import { rewindGeometry } from '@placemarkio/geojson-rewind'

import { toWorld, toImage } from './transformer.js'

import type { GCPTransformInfo } from './gdaltransform.js'

import type {
  Position,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon,
  Segment,
  ImageWorldPosition,
  TransformOptions,
  OptionalTransformOptions
} from './shared/types.js'

function mergeDefaultOptions(
  options?: OptionalTransformOptions
): TransformOptions {
  let mergedOptions = {
    maxOffsetRatio: 0,
    maxDepth: 0
  }

  if (options && options.maxDepth !== undefined) {
    mergedOptions.maxDepth = options.maxDepth
  }

  if (options && options.maxOffsetRatio !== undefined) {
    mergedOptions.maxOffsetRatio = options.maxOffsetRatio
  }

  return mergedOptions
}

function makeGeoJSONPoint(point: Position): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: point
  }
}

function makeGeoJSONLineString(points: Position[]): GeoJSONLineString {
  return {
    type: 'LineString',
    coordinates: points
  }
}

function makeGeoJSONPolygon(points: Position[]): GeoJSONPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: [points]
  }

  return rewindGeometry(geometry as GeoJSONPolygon) as GeoJSONPolygon
}

export function toGeoJSONPoint(
  transformArgs: GCPTransformInfo,
  point: Position
): GeoJSONPoint {
  return makeGeoJSONPoint(toWorld(transformArgs, point))
}

export function toGeoJSONLineString(
  transformArgs: GCPTransformInfo,
  points: Position[],
  options?: OptionalTransformOptions
): GeoJSONLineString {
  const mergedOptions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Line should contain at least 2 points')
  }

  const imageWorldPoints = points.map((point) => ({
    image: point,
    world: toWorld(transformArgs, point)
  }))

  const segments = getSegments(imageWorldPoints)
  const segmentsWithMidpoints = recursivelyAddWorldMidpoints(
    transformArgs,
    segments,
    mergedOptions
  )

  return makeGeoJSONLineString([
    segmentsWithMidpoints[0].from.world,
    ...segmentsWithMidpoints.map((segment) => segment.to.world)
  ])
}

export function toGeoJSONPolygon(
  transformArgs: GCPTransformInfo,
  points: Position[],
  options?: OptionalTransformOptions
): GeoJSONPolygon {
  const mergedOtions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('Polygon should contain at least 3 points')
  }

  const imageWorldPoints = points.map((point) => ({
    image: point,
    world: toWorld(transformArgs, point)
  }))

  const segments = getSegments(imageWorldPoints, true)
  const segmentsWithMidpoints = recursivelyAddWorldMidpoints(
    transformArgs,
    segments,
    mergedOtions
  )

  return makeGeoJSONPolygon([
    segmentsWithMidpoints[0].from.world,
    ...segmentsWithMidpoints.map((segment) => segment.to.world)
  ])
}

export function fromGeoJSONPoint(
  transformArgs: GCPTransformInfo,
  point: GeoJSONPoint
): Position {
  return toImage(transformArgs, point.coordinates)
}

export function fromGeoJSONLineString(
  transformArgs: GCPTransformInfo,
  lineString: GeoJSONLineString,
  options?: OptionalTransformOptions
): Position[] {
  const mergedOtions = mergeDefaultOptions(options)

  const coordinates = lineString.coordinates

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }

  const imageWorldPoints = coordinates.map((coordinate) => ({
    image: toImage(transformArgs, coordinate),
    world: coordinate
  }))

  const segments = getSegments(imageWorldPoints)
  const segmentsWithMidpoints = recursivelyAddImageMidpoints(
    transformArgs,
    segments,
    mergedOtions
  )

  return [
    segmentsWithMidpoints[0].from.image,
    ...segmentsWithMidpoints.map((segment) => segment.to.image)
  ]
}

export function fromGeoJSONPolygon(
  transformArgs: GCPTransformInfo,
  polygon: GeoJSONPolygon,
  options?: OptionalTransformOptions
): Position[] {
  const mergedOtions = mergeDefaultOptions(options)

  const coordinates = polygon.coordinates[0]

  if (!Array.isArray(coordinates) || coordinates.length < 4) {
    throw new Error('Polygon should contain at least 4 points')
  }

  const imageWorldPoints = coordinates.map((coordinates) => ({
    image: toImage(transformArgs, coordinates),
    world: coordinates
  }))

  const segments = getSegments(imageWorldPoints)
  const segmentsWithMidpoints = recursivelyAddImageMidpoints(
    transformArgs,
    segments,
    mergedOtions
  )

  return [
    segmentsWithMidpoints[0].from.image,
    ...segmentsWithMidpoints.map((segment) => segment.to.image)
  ]
}

function getSegments(points: ImageWorldPosition[], close = false): Segment[] {
  const segmentCount = points.length - (close ? 0 : 1)

  let segments: Segment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: points[index],
      to: points[(index + 1) % points.length]
    })
  }

  return segments
}

function recursivelyAddWorldMidpoints(
  transformArgs: GCPTransformInfo,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addWorldMidpoints(transformArgs, segment, options, 0))
    .flat(1)
}

function recursivelyAddImageMidpoints(
  transformArgs: GCPTransformInfo,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addImageMidpoints(transformArgs, segment, options, 0))
    .flat(1)
}

function addWorldMidpoints(
  transformArgs: GCPTransformInfo,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const imageMidpoint = getImageMidpoint(segment.from.image, segment.to.image)

  const segmentWorldMidpoint = getWorldMidpoint(
    makeGeoJSONPoint(segment.from.world),
    makeGeoJSONPoint(segment.to.world)
  )
  const actualWorldMidpoint = makeGeoJSONPoint(
    toWorld(transformArgs, imageMidpoint)
  )

  const distanceSegment = getWorldDistance(
    makeGeoJSONPoint(segment.from.world),
    makeGeoJSONPoint(segment.to.world)
  )
  const distanceMidpoints = getWorldDistance(
    segmentWorldMidpoint,
    actualWorldMidpoint
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? distanceMidpoints / distanceSegment > options.maxOffsetRatio
      : false) &&
    distanceSegment > 0
  ) {
    const newSegmentMidpoint: ImageWorldPosition = {
      image: imageMidpoint,
      world: actualWorldMidpoint.coordinates
    }

    return [
      addWorldMidpoints(
        transformArgs,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addWorldMidpoints(
        transformArgs,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addImageMidpoints(
  transformArgs: GCPTransformInfo,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const worldMidpoint = getWorldMidpoint(segment.from.world, segment.to.world)

  const segmentImageMidpoint = getImageMidpoint(
    segment.from.image,
    segment.to.image
  )
  const actualImageMidpoint = toImage(
    transformArgs,
    worldMidpoint.geometry.coordinates as Position
  )

  const distanceSegment = getImageDistance(segment.from.image, segment.to.image)
  const distanceMidpoints = getImageDistance(
    segmentImageMidpoint,
    actualImageMidpoint
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? distanceMidpoints / distanceSegment > options.maxOffsetRatio
      : false) &&
    distanceSegment > 0
  ) {
    const newSegmentMidpoint: ImageWorldPosition = {
      image: actualImageMidpoint,
      world: worldMidpoint.geometry.coordinates as Position
    }

    return [
      addImageMidpoints(
        transformArgs,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addWorldMidpoints(
        transformArgs,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function getImageMidpoint(point1: Position, point2: Position): Position {
  return [
    (point2[0] - point1[0]) / 2 + point1[0],
    (point2[1] - point1[1]) / 2 + point1[1]
  ]
}

function getImageDistance(from: Position, to: Position): number {
  return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
}
