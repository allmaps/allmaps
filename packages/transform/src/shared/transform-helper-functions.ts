// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import { getMidPosition, getDistance } from '@allmaps/stdlib'

import type {
  TransformOptions,
  GCPTransformerInterface,
  OptionalTransformOptions
} from './types.js'

import type { Position, LineString, Ring, GCP, Segment } from '@allmaps/types'

function mergeDefaultOptions(
  options?: OptionalTransformOptions
): TransformOptions {
  const mergedOptions = {
    close: false,
    maxOffsetRatio: 0,
    maxDepth: 0,
    geographic: false
  }

  if (options && options.maxDepth !== undefined) {
    mergedOptions.maxDepth = options.maxDepth
  }

  if (options && options.maxOffsetRatio !== undefined) {
    mergedOptions.maxOffsetRatio = options.maxOffsetRatio
  }

  if (options && options.geographic !== undefined) {
    mergedOptions.geographic = options.geographic
  }

  return mergedOptions
}

export function transformForwardLineStringToLineString(
  transformer: GCPTransformerInterface,
  LineString: LineString,
  options?: OptionalTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  // TODO: replace this with more general checker for linestring
  if (!Array.isArray(LineString) || LineString.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }

  const points = LineString.map((position) => ({
    resource: position,
    geo: transformer.transformForward(position)
  }))

  const segments = pointsToSegments(points, false)
  const extendedSegments =
    recursivelyAddMidpointsWithGeoMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, true).map((point) => point.geo)
}

export function transformBackwardLineStringToLineString(
  transformer: GCPTransformerInterface,
  lineString: LineString,
  options?: OptionalTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  // TODO: replace this with more general checker for linestring
  if (!Array.isArray(lineString) || lineString.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }

  const points: GCP[] = lineString.map((position) => ({
    resource: transformer.transformBackward(position),
    geo: position
  }))

  const segments = pointsToSegments(points, false)
  const extendendSegements =
    recursivelyAddMidpointsWithResourceMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, true).map(
    (point) => point.resource
  )
}

export function transformForwardRingToRing(
  transformer: GCPTransformerInterface,
  ring: Ring,
  options?: OptionalTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  // TODO: replace this with more general checker for rings
  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error('Polygon should contain at least 3 points')
  }

  const points = ring.map((position) => ({
    resource: position,
    geo: transformer.transformForward(position)
  }))

  const segments = pointsToSegments(points, true)
  const extendedSegments =
    recursivelyAddMidpointsWithGeoMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, false).map((point) => point.geo)
}

export function transformBackwardRingToRing(
  transformer: GCPTransformerInterface,
  ring: Ring,
  options?: OptionalTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  // TODO: replace this with more general checker for rings
  if (!Array.isArray(ring) || ring.length < 3) {
    throw new Error('Ring should contain at least 3 points')
  }

  const points: GCP[] = ring.map((position) => ({
    resource: transformer.transformBackward(position),
    geo: position
  }))

  const segments = pointsToSegments(points, true)
  const extendendSegements =
    recursivelyAddMidpointsWithResourceMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, false).map(
    (point) => point.resource
  )
}

function pointsToSegments(points: GCP[], close = false): Segment[] {
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

function segmentsToPoints(segments: Segment[], close = false): GCP[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

function recursivelyAddMidpointsWithGeoMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithGeoMidPositionFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function recursivelyAddMidpointsWithResourceMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithResourceMidPositionFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function addMidpointWithGeoMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const resourceMidPosition = getMidPosition(
    segment.from.resource,
    segment.to.resource
  )

  const geoMidPositionFunction = options.geographic
    ? (position1: Position, position2: Position) =>
        getWorldMidpoint(position1, position2).geometry.coordinates as Position
    : getMidPosition
  const geoMidPosition = geoMidPositionFunction(
    segment.from.geo,
    segment.to.geo
  )
  const geoMidPositionFromTransform =
    transformer.transformForward(resourceMidPosition)

  const geoDistanceFunction = options.geographic
    ? getWorldDistance
    : getDistance
  const segmentGeoDistance = geoDistanceFunction(
    segment.from.geo,
    segment.to.geo
  )
  const geoMidPositionsDistance = geoDistanceFunction(
    geoMidPosition,
    geoMidPositionFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? geoMidPositionsDistance / segmentGeoDistance > options.maxOffsetRatio
      : false) &&
    segmentGeoDistance > 0
  ) {
    const newSegmentMidpoint: GCP = {
      resource: resourceMidPosition,
      geo: geoMidPositionFromTransform
    }

    return [
      addMidpointWithGeoMidPositionFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithGeoMidPositionFromTransform(
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

function addMidpointWithResourceMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const geoMidPositionFunction = options.geographic
    ? (position1: Position, position2: Position) =>
        getWorldMidpoint(position1, position2).geometry.coordinates as Position
    : getMidPosition
  const geoMidPosition = geoMidPositionFunction(
    segment.from.geo,
    segment.to.geo
  )

  const resourceMidPosition = getMidPosition(
    segment.from.resource,
    segment.to.resource
  )
  const resourceMidPositionFromTransform = transformer.transformBackward(
    geoMidPosition as Position
  )

  const segmentResourceDistance = getDistance(
    segment.from.resource,
    segment.to.resource
  )
  const resourceMidPositionsDistance = getDistance(
    resourceMidPosition,
    resourceMidPositionFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? resourceMidPositionsDistance / segmentResourceDistance >
        options.maxOffsetRatio
      : false) &&
    segmentResourceDistance > 0
  ) {
    const newSegmentMidpoint: GCP = {
      resource: resourceMidPositionFromTransform,
      geo: geoMidPosition
    }

    return [
      addMidpointWithResourceMidPositionFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithResourceMidPositionFromTransform(
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
