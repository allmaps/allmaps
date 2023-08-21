// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'
import { rewindGeometry } from '@placemarkio/geojson-rewind'

import type {
  Position,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon,
  Segment,
  GCP,
  TransformOptions,
  GCPTransformerInterface,
  OptionalTransformOptions
} from './types.js'

function mergeDefaultOptions(
  options?: OptionalTransformOptions
): TransformOptions {
  const mergedOptions = {
    close: false,
    maxOffsetRatio: 0,
    maxDepth: 0
  }

  if (options && options.close !== undefined) {
    mergedOptions.close = options.close
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
  transformer: GCPTransformerInterface,
  point: Position
): GeoJSONPoint {
  return makeGeoJSONPoint(transformer.toGeo(point))
}

export function toGeoJSONLineString(
  transformer: GCPTransformerInterface,
  points: Position[],
  options?: OptionalTransformOptions
): GeoJSONLineString {
  const mergedOptions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('Line should contain at least 2 points')
  }

  const resourceGeoPoints = points.map((point) => ({
    resource: point,
    geo: transformer.toGeo(point)
  }))

  const segments = getSegments(resourceGeoPoints)
  const segmentsWithMidpoints = recursivelyAddWorldMidpoints(
    transformer,
    segments,
    mergedOptions
  )

  return makeGeoJSONLineString([
    segmentsWithMidpoints[0].from.geo,
    ...segmentsWithMidpoints.map((segment) => segment.to.geo)
  ])
}

export function toGeoJSONPolygon(
  transformer: GCPTransformerInterface,
  points: Position[],
  options?: OptionalTransformOptions
): GeoJSONPolygon {
  const mergedOptions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('Polygon should contain at least 3 points')
  }

  const resourceGeoPoints = points.map((point) => ({
    resource: point,
    geo: transformer.toGeo(point)
  }))

  const segments = getSegments(resourceGeoPoints, true)
  const segmentsWithMidpoints = recursivelyAddWorldMidpoints(
    transformer,
    segments,
    mergedOptions
  )

  return makeGeoJSONPolygon([
    segmentsWithMidpoints[0].from.geo,
    ...segmentsWithMidpoints.map((segment) => segment.to.geo)
  ])
}

export function fromGeoJSONPoint(
  transformer: GCPTransformerInterface,
  point: GeoJSONPoint
): Position {
  return transformer.toResource(point.coordinates)
}

export function fromGeoJSONLineString(
  transformer: GCPTransformerInterface,
  lineString: GeoJSONLineString,
  options?: OptionalTransformOptions
): Position[] {
  const mergedOptions = mergeDefaultOptions(options)

  const coordinates = lineString.coordinates

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }

  const resourceGeoPoints = coordinates.map((coordinate) => ({
    resource: transformer.toResource(coordinate),
    geo: coordinate
  }))

  const segments = getSegments(resourceGeoPoints)
  const segmentsWithMidpoints = recursivelyAddResourceMidpoints(
    transformer,
    segments,
    mergedOptions
  )

  return [
    segmentsWithMidpoints[0].from.resource,
    ...segmentsWithMidpoints.map((segment) => segment.to.resource)
  ]
}

export function fromGeoJSONPolygon(
  transformer: GCPTransformerInterface,
  polygon: GeoJSONPolygon,
  options?: OptionalTransformOptions
): Position[] {
  const mergedOptions = mergeDefaultOptions(options)

  const coordinates = polygon.coordinates[0]

  if (!Array.isArray(coordinates) || coordinates.length < 4) {
    throw new Error('Polygon should contain at least 4 points')
  }

  const resourceGeoPoints = coordinates.map((coordinates) => ({
    resource: transformer.toResource(coordinates),
    geo: coordinates
  }))

  const segments = getSegments(resourceGeoPoints)
  const segmentsWithMidpoints = recursivelyAddResourceMidpoints(
    transformer,
    segments,
    mergedOptions
  )

  return [
    segmentsWithMidpoints[0].from.resource,
    ...segmentsWithMidpoints.map((segment) => segment.to.resource)
  ]
}

export function toGeoPolygon(
  transformer: GCPTransformerInterface,
  points: Position[],
  options?: OptionalTransformOptions
): Position[] {
  const mergedOptions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('Polygon should contain at least 3 points')
  }

  const resourceGeoPoints = points.map((point) => ({
    resource: point,
    geo: transformer.toGeo(point)
  }))

  const segments = getSegments(resourceGeoPoints, false)
  const segmentsWithMidpoints = recursivelyAddWorldMidpoints2(
    transformer,
    segments,
    mergedOptions
  )

  return [
    segmentsWithMidpoints[0].from.geo,
    ...segmentsWithMidpoints.map((segment) => segment.to.geo)
  ]
}

export function toResourcePolygon(
  transformer: GCPTransformerInterface,
  points: Position[],
  options?: OptionalTransformOptions
): Position[] {
  const mergedOptions = mergeDefaultOptions(options)

  if (!Array.isArray(points) || points.length < 3) {
    throw new Error('Polygon should contain at least 3 points')
  }

  const resourceGeoPoints = points.map((point) => ({
    resource: transformer.toResource(point),
    geo: point
  }))

  const segments = getSegments(resourceGeoPoints, false)
  const segmentsWithMidpoints = recursivelyAddResourceMidpoints2(
    transformer,
    segments,
    mergedOptions
  )

  return [
    segmentsWithMidpoints[0].from.resource,
    ...segmentsWithMidpoints.map((segment) => segment.to.resource)
  ]
}

function getSegments(points: GCP[], close = false): Segment[] {
  const segmentCount = points.length - (close ? 0 : 1)

  const segments: Segment[] = []
  for (let index = 0; index < segmentCount; index++) {
    segments.push({
      from: points[index],
      to: points[(index + 1) % points.length]
    })
  }

  return segments
}

function recursivelyAddWorldMidpoints(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addWorldMidpoints(transformer, segment, options, 0))
    .flat(1)
}

function recursivelyAddResourceMidpoints(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addResourceMidpoints(transformer, segment, options, 0))
    .flat(1)
}

function recursivelyAddWorldMidpoints2(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addWorldMidpoints2(transformer, segment, options, 0))
    .flat(1)
}

function recursivelyAddResourceMidpoints2(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) => addResourceMidpoints2(transformer, segment, options, 0))
    .flat(1)
}

function addWorldMidpoints(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const imageMidpoint = getMidpoint(segment.from.resource, segment.to.resource)

  const segmentWorldMidpoint = getWorldMidpoint(
    makeGeoJSONPoint(segment.from.geo),
    makeGeoJSONPoint(segment.to.geo)
  )
  const actualWorldMidpoint = makeGeoJSONPoint(transformer.toGeo(imageMidpoint))

  const distanceSegment = getWorldDistance(
    makeGeoJSONPoint(segment.from.geo),
    makeGeoJSONPoint(segment.to.geo)
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
    const newSegmentMidpoint: GCP = {
      resource: imageMidpoint,
      geo: actualWorldMidpoint.coordinates
    }

    return [
      addWorldMidpoints(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addWorldMidpoints(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addResourceMidpoints(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const worldMidpoint = getWorldMidpoint(segment.from.geo, segment.to.geo)

  const segmentImageMidpoint = getMidpoint(
    segment.from.resource,
    segment.to.resource
  )
  const actualImageMidpoint = transformer.toResource(
    worldMidpoint.geometry.coordinates as Position
  )

  const distanceSegment = getDistance(
    segment.from.resource,
    segment.to.resource
  )
  const distanceMidpoints = getDistance(
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
    const newSegmentMidpoint: GCP = {
      resource: actualImageMidpoint,
      geo: worldMidpoint.geometry.coordinates as Position
    }

    return [
      addResourceMidpoints(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addResourceMidpoints(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addWorldMidpoints2(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const imageMidpoint = getMidpoint(segment.from.resource, segment.to.resource)

  const segmentWorldMidpoint = getMidpoint(segment.from.geo, segment.to.geo)
  const actualWorldMidpoint = transformer.toGeo(imageMidpoint)

  const distanceSegment = getDistance(segment.from.geo, segment.to.geo)
  const distanceMidpoints = getDistance(
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
    const newSegmentMidpoint: GCP = {
      resource: imageMidpoint,
      geo: actualWorldMidpoint
    }

    return [
      addWorldMidpoints2(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addWorldMidpoints2(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function addResourceMidpoints2(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const worldMidpoint = getMidpoint(segment.from.geo, segment.to.geo)

  const segmentImageMidpoint = getMidpoint(
    segment.from.resource,
    segment.to.resource
  )
  const actualImageMidpoint = transformer.toResource(worldMidpoint as Position)

  const distanceSegment = getDistance(
    segment.from.resource,
    segment.to.resource
  )
  const distanceMidpoints = getDistance(
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
    const newSegmentMidpoint: GCP = {
      resource: actualImageMidpoint,
      geo: worldMidpoint as Position
    }

    return [
      addResourceMidpoints2(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addResourceMidpoints2(
        transformer,
        { from: newSegmentMidpoint, to: segment.to },
        options,
        depth + 1
      )
    ].flat(1)
  } else {
    return segment
  }
}

function getMidpoint(point1: Position, point2: Position): Position {
  return [
    (point2[0] - point1[0]) / 2 + point1[0],
    (point2[1] - point1[1]) / 2 + point1[1]
  ]
}

function getDistance(from: Position, to: Position): number {
  return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
}
