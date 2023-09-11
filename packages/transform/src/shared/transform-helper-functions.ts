// TODO: consider implementing these functions in this module instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import {
  getMidPosition,
  getDistance,
  conformLineString,
  conformRing
} from '@allmaps/stdlib'

import type {
  TransformGCP,
  Segment,
  TransformOptions,
  GCPTransformerInterface,
  PartialTransformOptions
} from './types.js'

import type { Position, LineString, Ring } from '@allmaps/types'

function mergeDefaultOptions(
  options?: PartialTransformOptions
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
  lineString: LineString,
  options?: PartialTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  lineString = conformLineString(lineString)

  const points = lineString.map((position) => ({
    source: position,
    destination: transformer.transformForward(position)
  }))

  const segments = pointsToSegments(points, false)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, true).map(
    (point) => point.destination
  )
}

export function transformBackwardLineStringToLineString(
  transformer: GCPTransformerInterface,
  lineString: LineString,
  options?: PartialTransformOptions
): LineString {
  const mergedOptions = mergeDefaultOptions(options)

  lineString = conformLineString(lineString)

  const points: TransformGCP[] = lineString.map((position) => ({
    source: transformer.transformBackward(position),
    destination: position
  }))

  const segments = pointsToSegments(points, false)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, true).map((point) => point.source)
}

export function transformForwardRingToRing(
  transformer: GCPTransformerInterface,
  ring: Ring,
  options?: PartialTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  ring = conformRing(ring)

  const points = ring.map((position) => ({
    source: position,
    destination: transformer.transformForward(position)
  }))

  const segments = pointsToSegments(points, true)
  const extendedSegments =
    recursivelyAddMidpointsWithDestinationMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendedSegments, false).map(
    (point) => point.destination
  )
}

export function transformBackwardRingToRing(
  transformer: GCPTransformerInterface,
  ring: Ring,
  options?: PartialTransformOptions
): Ring {
  const mergedOptions = mergeDefaultOptions(options)

  ring = conformRing(ring)

  const points: TransformGCP[] = ring.map((position) => ({
    source: transformer.transformBackward(position),
    destination: position
  }))

  const segments = pointsToSegments(points, true)
  const extendendSegements =
    recursivelyAddMidpointsWithSourceMidPositionFromTransform(
      transformer,
      segments,
      mergedOptions
    )

  return segmentsToPoints(extendendSegements, false).map(
    (point) => point.source
  )
}

function pointsToSegments(points: TransformGCP[], close = false): Segment[] {
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

function segmentsToPoints(segments: Segment[], close = false): TransformGCP[] {
  const points = segments.map((segment) => segment.from)
  if (close) {
    points.push(segments[segments.length - 1].to)
  }
  return points
}

function recursivelyAddMidpointsWithDestinationMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithDestinationMidPositionFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function recursivelyAddMidpointsWithSourceMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segments: Segment[],
  options: TransformOptions
) {
  if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
    return segments
  }

  return segments
    .map((segment) =>
      addMidpointWithSourceMidPositionFromTransform(
        transformer,
        segment,
        options,
        0
      )
    )
    .flat(1)
}

function addMidpointWithDestinationMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const sourceMidPosition = getMidPosition(
    segment.from.source,
    segment.to.source
  )

  const destinationMidPositionFunction = options.geographic
    ? (position1: Position, position2: Position) =>
        getWorldMidpoint(position1, position2).geometry.coordinates as Position
    : getMidPosition
  const destinationMidPosition = destinationMidPositionFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPositionFromTransform =
    transformer.transformForward(sourceMidPosition)

  const destinationDistanceFunction = options.geographic
    ? getWorldDistance
    : getDistance
  const segmentDestinationDistance = destinationDistanceFunction(
    segment.from.destination,
    segment.to.destination
  )
  const destinationMidPositionsDistance = destinationDistanceFunction(
    destinationMidPosition,
    destinationMidPositionFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? destinationMidPositionsDistance / segmentDestinationDistance >
        options.maxOffsetRatio
      : false) &&
    segmentDestinationDistance > 0
  ) {
    const newSegmentMidpoint: TransformGCP = {
      source: sourceMidPosition,
      destination: destinationMidPositionFromTransform
    }

    return [
      addMidpointWithDestinationMidPositionFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithDestinationMidPositionFromTransform(
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

function addMidpointWithSourceMidPositionFromTransform(
  transformer: GCPTransformerInterface,
  segment: Segment,
  options: TransformOptions,
  depth: number
): Segment | Segment[] {
  const destinationMidPositionFunction = options.geographic
    ? (position1: Position, position2: Position) =>
        getWorldMidpoint(position1, position2).geometry.coordinates as Position
    : getMidPosition
  const destinationMidPosition = destinationMidPositionFunction(
    segment.from.destination,
    segment.to.destination
  )

  const sourceMidPosition = getMidPosition(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPositionFromTransform = transformer.transformBackward(
    destinationMidPosition as Position
  )

  const segmentSourceDistance = getDistance(
    segment.from.source,
    segment.to.source
  )
  const sourceMidPositionsDistance = getDistance(
    sourceMidPosition,
    sourceMidPositionFromTransform
  )

  if (
    depth < options.maxDepth &&
    (options.maxOffsetRatio
      ? sourceMidPositionsDistance / segmentSourceDistance >
        options.maxOffsetRatio
      : false) &&
    segmentSourceDistance > 0
  ) {
    const newSegmentMidpoint: TransformGCP = {
      source: sourceMidPositionFromTransform,
      destination: destinationMidPosition
    }

    return [
      addMidpointWithSourceMidPositionFromTransform(
        transformer,
        { from: segment.from, to: newSegmentMidpoint },
        options,
        depth + 1
      ),
      addMidpointWithSourceMidPositionFromTransform(
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
