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

import type { LineString, Ring } from '@allmaps/types'

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

export function makeGeoJSONPoint(point: Position): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: point
  }
}

export function makeGeoJSONLineString(points: Position[]): GeoJSONLineString {
  return {
    type: 'LineString',
    coordinates: points
  }
}

export function makeGeoJSONPolygon(
  points: Position[],
  close = true
): GeoJSONPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close ? [[...points, points[0]]] : [points]
  }

  return rewindGeometry(geometry as GeoJSONPolygon) as GeoJSONPolygon
}

export function geoJSONPointToPosition(geometry: GeoJSONPoint): Position {
  return geometry.coordinates
}

export function geoJSONLineStringToLineString(
  geometry: GeoJSONLineString
): LineString {
  return geometry.coordinates
}

export function geoJSONPolygonToRing(
  geometry: GeoJSONPolygon,
  close = false
): Ring {
  // Note: Assuming there's only an outer ring for now
  const outerRing = geometry.coordinates[0]
  if (
    outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
    outerRing[0][1] === outerRing[outerRing.length - 1][1]
  ) {
    outerRing.splice(-1)
  }
  return close ? [...outerRing, outerRing[0]] : outerRing
}

// export function toGeoJSONPoint(
//   transformer: GCPTransformerInterface,
//   point: Position
// ): GeoJSONPoint {
//   return makeGeoJSONPoint(transformer.toGeo(point))
// }

// export function toGeoJSONLineString(
//   transformer: GCPTransformerInterface,
//   points: Position[],
//   options?: OptionalTransformOptions
// ): GeoJSONLineString {
//   const mergedOptions = mergeDefaultOptions(options)

//   if (!Array.isArray(points) || points.length < 2) {
//     throw new Error('Line should contain at least 2 points')
//   }

//   const resourceGeoPoints = points.map((point) => ({
//     resource: point,
//     geo: transformer.toGeo(point)
//   }))

//   const segments = pointsToSegments(resourceGeoPoints)
//   const segmentsWithMidpoints = recursivelyAddWorldMidpointsOld(
//     transformer,
//     segments,
//     mergedOptions
//   )

//   return makeGeoJSONLineString([
//     segmentsWithMidpoints[0].from.geo,
//     ...segmentsWithMidpoints.map((segment) => segment.to.geo)
//   ])
// }

// export function toGeoJSONPolygon(
//   transformer: GCPTransformerInterface,
//   points: Position[],
//   options?: OptionalTransformOptions
// ): GeoJSONPolygon {
//   const mergedOptions = mergeDefaultOptions(options)

//   if (!Array.isArray(points) || points.length < 3) {
//     throw new Error('Polygon should contain at least 3 points')
//   }

//   const resourceGeoPoints = points.map((point) => ({
//     resource: point,
//     geo: transformer.toGeo(point)
//   }))

//   const segments = pointsToSegments(resourceGeoPoints, true)
//   const segmentsWithMidpoints = recursivelyAddWorldMidpointsOld(
//     transformer,
//     segments,
//     mergedOptions
//   )

//   return makeGeoJSONPolygon(
//     [
//       segmentsWithMidpoints[0].from.geo,
//       ...segmentsWithMidpoints.map((segment) => segment.to.geo)
//     ],
//     false
//   )
// }

// export function fromGeoJSONPoint(
//   transformer: GCPTransformerInterface,
//   point: GeoJSONPoint
// ): Position {
//   return transformer.toResource(point.coordinates)
// }

// export function fromGeoJSONLineString(
//   transformer: GCPTransformerInterface,
//   lineString: GeoJSONLineString,
//   options?: OptionalTransformOptions
// ): Position[] {
//   const mergedOptions = mergeDefaultOptions(options)

//   const coordinates = lineString.coordinates

//   if (!Array.isArray(coordinates) || coordinates.length < 2) {
//     throw new Error('LineString should contain at least 2 points')
//   }

//   const resourceGeoPoints = coordinates.map((coordinate) => ({
//     resource: transformer.toResource(coordinate),
//     geo: coordinate
//   }))

//   const segments = pointsToSegments(resourceGeoPoints)
//   const segmentsWithMidpoints = recursivelyAddResourceMidpointsOld(
//     transformer,
//     segments,
//     mergedOptions
//   )

//   return [
//     segmentsWithMidpoints[0].from.resource,
//     ...segmentsWithMidpoints.map((segment) => segment.to.resource)
//   ]
// }

// export function fromGeoJSONPolygon(
//   transformer: GCPTransformerInterface,
//   polygon: GeoJSONPolygon,
//   options?: OptionalTransformOptions
// ): Position[] {
//   const mergedOptions = mergeDefaultOptions(options)

//   const coordinates = polygon.coordinates[0]

//   if (!Array.isArray(coordinates) || coordinates.length < 4) {
//     throw new Error('Polygon should contain at least 4 points')
//   }

//   const resourceGeoPoints = coordinates.map((coordinates) => ({
//     resource: transformer.toResource(coordinates),
//     geo: coordinates
//   }))

//   const segments = pointsToSegments(resourceGeoPoints)
//   const segmentsWithMidpoints = recursivelyAddResourceMidpointsOld(
//     transformer,
//     segments,
//     mergedOptions
//   )

//   return [
//     segmentsWithMidpoints[0].from.resource,
//     ...segmentsWithMidpoints.map((segment) => segment.to.resource)
//   ]
// }

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
    geo: transformer.toGeo(position)
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
    resource: transformer.toResource(position),
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
    geo: transformer.toGeo(position)
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
    resource: transformer.toResource(position),
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

// function recursivelyAddWorldMidpointsOld(
//   transformer: GCPTransformerInterface,
//   segments: Segment[],
//   options: TransformOptions
// ) {
//   if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
//     return segments
//   }

//   return segments
//     .map((segment) => addWorldMidpointsOld(transformer, segment, options, 0))
//     .flat(1)
// }

// function recursivelyAddResourceMidpointsOld(
//   transformer: GCPTransformerInterface,
//   segments: Segment[],
//   options: TransformOptions
// ) {
//   if (options.maxDepth <= 0 || options.maxOffsetRatio <= 0) {
//     return segments
//   }

//   return segments
//     .map((segment) => addResourceMidpointsOld(transformer, segment, options, 0))
//     .flat(1)
// }

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

// function addWorldMidpointsOld(
//   transformer: GCPTransformerInterface,
//   segment: Segment,
//   options: TransformOptions,
//   depth: number
// ): Segment | Segment[] {
//   const imageMidpoint = getMidPosition(
//     segment.from.resource,
//     segment.to.resource
//   )

//   const segmentWorldMidpoint = getWorldMidpoint(
//     makeGeoJSONPoint(segment.from.geo),
//     makeGeoJSONPoint(segment.to.geo)
//   )
//   const actualWorldMidpoint = makeGeoJSONPoint(transformer.toGeo(imageMidpoint))

//   const distanceSegment = getWorldDistance(
//     makeGeoJSONPoint(segment.from.geo),
//     makeGeoJSONPoint(segment.to.geo)
//   )
//   const distanceMidpoints = getWorldDistance(
//     segmentWorldMidpoint,
//     actualWorldMidpoint
//   )

//   if (
//     depth < options.maxDepth &&
//     (options.maxOffsetRatio
//       ? distanceMidpoints / distanceSegment > options.maxOffsetRatio
//       : false) &&
//     distanceSegment > 0
//   ) {
//     const newSegmentMidpoint: GCP = {
//       resource: imageMidpoint,
//       geo: actualWorldMidpoint.coordinates
//     }

//     return [
//       addWorldMidpointsOld(
//         transformer,
//         { from: segment.from, to: newSegmentMidpoint },
//         options,
//         depth + 1
//       ),
//       addWorldMidpointsOld(
//         transformer,
//         { from: newSegmentMidpoint, to: segment.to },
//         options,
//         depth + 1
//       )
//     ].flat(1)
//   } else {
//     return segment
//   }
// }

// function addResourceMidpointsOld(
//   transformer: GCPTransformerInterface,
//   segment: Segment,
//   options: TransformOptions,
//   depth: number
// ): Segment | Segment[] {
//   const worldMidpoint = getWorldMidpoint(segment.from.geo, segment.to.geo)

//   const segmentImageMidpoint = getMidPosition(
//     segment.from.resource,
//     segment.to.resource
//   )
//   const actualImageMidpoint = transformer.toResource(
//     worldMidpoint.geometry.coordinates as Position
//   )

//   const distanceSegment = getDistance(
//     segment.from.resource,
//     segment.to.resource
//   )
//   const distanceMidpoints = getDistance(
//     segmentImageMidpoint,
//     actualImageMidpoint
//   )

//   if (
//     depth < options.maxDepth &&
//     (options.maxOffsetRatio
//       ? distanceMidpoints / distanceSegment > options.maxOffsetRatio
//       : false) &&
//     distanceSegment > 0
//   ) {
//     const newSegmentMidpoint: GCP = {
//       resource: actualImageMidpoint,
//       geo: worldMidpoint.geometry.coordinates as Position
//     }

//     return [
//       addResourceMidpointsOld(
//         transformer,
//         { from: segment.from, to: newSegmentMidpoint },
//         options,
//         depth + 1
//       ),
//       addResourceMidpointsOld(
//         transformer,
//         { from: newSegmentMidpoint, to: segment.to },
//         options,
//         depth + 1
//       )
//     ].flat(1)
//   } else {
//     return segment
//   }
// }

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
  const geoMidPositionFromTransform = transformer.toGeo(resourceMidPosition)

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
  const resourceMidPositionFromTransform = transformer.toResource(
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

function getMidPosition(point1: Position, point2: Position): Position {
  return [
    (point2[0] - point1[0]) / 2 + point1[0],
    (point2[1] - point1[1]) / 2 + point1[1]
  ]
}

function getDistance(from: Position, to: Position): number {
  return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
}
