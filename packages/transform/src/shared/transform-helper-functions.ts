// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import {
  midPoint,
  distance,
  conformLineString,
  conformRing
} from '@allmaps/stdlib'

import type {
  TransformGcp,
  Segment,
  TransformOptions,
  GcpTransformerInterface,
  PartialTransformOptions
} from './types.js'

import type { Point, LineString, Ring, Polygon } from '@allmaps/types'

function mergeDefaultOptions(
  options?: PartialTransformOptions
): TransformOptions {
  const mergedOptions = {
    close: false,
    maxOffsetRatio: 0,
    maxDepth: 0,
    destinationIsGeographic: false,
    sourceIsGeographic: false,
    differentHandedness: false
  }

  if (options && options.maxDepth !== undefined) {
    mergedOptions.maxDepth = options.maxDepth
  }

  if (options && options.maxOffsetRatio !== undefined) {
    mergedOptions.maxOffsetRatio = options.maxOffsetRatio
  }

  if (options && options.destinationIsGeographic !== undefined) {
    mergedOptions.destinationIsGeographic = options.destinationIsGeographic
  }

  if (options && options.sourceIsGeographic !== undefined) {
    mergedOptions.sourceIsGeographic = options.sourceIsGeographic
  }

  if (options && options.differentHandedness !== undefined) {
    mergedOptions.differentHandedness = options.differentHandedness
  }

  return mergedOptions
}

export function transformLineStringForwardToLineString(
  transformer: GcpTransformerInterface,
  lineString: LineString,
  options?: PartialTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  lineString = conformLineString(lineString)

  const points = lineString.map((point) => ({
    source: point,
    destination: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, false)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, true).map(
    (point) => point.destination
  )
}

export function transformLineStringBackwardToLineString(
  transformer: GcpTransformerInterface,
  lineString: LineString,
  options?: PartialTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  lineString = conformLineString(lineString)

  const points: TransformGcp[] = lineString.map((point) => ({
    source: transformer.transformBackward(point),
    destination: point
  }))

  const segments = pointsToSegments(points, false)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, true).map((point) => point.source)
}

export function transformRingForwardToRing(
  transformer: GcpTransformerInterface,
  ring: Ring,
  options?: PartialTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  ring = conformRing(ring)

  const points = ring.map((point) => ({
    source: point,
    destination: transformer.transformForward(point)
  }))

  const segments = pointsToSegments(points, true)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPointFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, false).map(
    (point) => point.destination
  )
}

export function transformRingBackwardToRing(
  transformer: GcpTransformerInterface,
  ring: Ring,
  options?: PartialTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  ring = conformRing(ring)

  const points: TransformGcp[] = ring.map((point) => ({
    source: transformer.transformBackward(point),
    destination: point
  }))

  const segments = pointsToSegments(points, true)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPointFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, false).map(
    (point) => point.source
  )
}

export function transformPolygonForwardToPolygon(
  transformer: GcpTransformerInterface,
  polygon: Polygon,
  options?: PartialTransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingForwardToRing(transformer, ring, options)
  })
}

export function transformPolygonBackwardToPolygon(
  transformer: GcpTransformerInterface,
  polygon: Polygon,
  options?: PartialTransformOptions
): Polygon {
  return polygon.map((ring) => {
    return transformRingBackwardToRing(transformer, ring, options)
  })
}

function pointsToSegments(points: TransformGcp[], close = false): Segment[] {
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

function segmentsToPoints(segments: Segment[], close = false): TransformGcp[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

function recursivelyAddMidpointsWithDestinationMidPointFromTransform(
  transformer: GcpTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithDestinationMidPointFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function recursivelyAddMidpointsWithSourceMidPointFromTransform(
  transformer: GcpTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithSourceMidPointFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function addMidpointWithDestinationMidPointFromTransform(
  transformer: GcpTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const sourceMidPointFunction = options.sourceIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const sourceMidPoint = sourceMidPointFunction(
    segment.from.source,
    segment.to.source
  )

  const destinationMidPointFunction = options.destinationIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const destinationMidPoint = destinationMidPointFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointFromTransform =
    transformer.transformForward(sourceMidPoint)

  const destinationDistanceFunction = options.destinationIsGeographic
    ? getWorldDistance
    : distance
  const segmentDestinationDistance = destinationDistanceFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPointsDistance = destinationDistanceFunction(
    destinationMidPoint,
    destinationMidPointFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? destinationMidPointsDistance / segmentDestinationDistance >
        options.maxOffsetRatio
      : false) &&
    segmentDestinationDistance > 0
  ) {
    const newSegmentMidpoint: TransformGcp = {
      source: sourceMidPoint,
      destination: destinationMidPointFromTransform
    }

    return [
      addMidpointWithDestinationMidPointFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithDestinationMidPointFromTransform(
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

function addMidpointWithSourceMidPointFromTransform(
  transformer: GcpTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const destinationMidPointFunction = options.destinationIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const destinationMidPoint = destinationMidPointFunction(
    segment.from.destination,
    segment.to.destination
  )

  const sourceMidPointFunction = options.sourceIsGeographic
    ? (point1: Point, point2: Point) =>
        getWorldMidpoint(point1, point2).geometry.coordinates as Point
    : midPoint
  const sourceMidPoint = sourceMidPointFunction(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPointFromTransform = transformer.transformBackward(
    destinationMidPoint as Point
  )

  const sourceDistanceFunction = options.sourceIsGeographic
    ? getWorldDistance
    : distance
  const segmentSourceDistance = sourceDistanceFunction(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPointsDistance = sourceDistanceFunction(
    sourceMidPoint,
    sourceMidPointFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? sourceMidPointsDistance / segmentSourceDistance > options.maxOffsetRatio
      : false) &&
    segmentSourceDistance > 0
  ) {
    const newSegmentMidpoint: TransformGcp = {
      source: sourceMidPointFromTransform,
      destination: destinationMidPoint
    }

    return [
      addMidpointWithSourceMidPointFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithSourceMidPointFromTransform(
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
