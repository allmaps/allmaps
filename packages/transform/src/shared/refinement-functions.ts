import {
  midPoint,
  distance,
  squaredDistance,
  conformLineString,
  conformRing,
  bboxToRectangle
} from '@allmaps/stdlib'

import type {
  Point,
  Line,
  LineString,
  Ring,
  TypedLine,
  TypedLineString,
  TypedRing,
  Bbox
} from '@allmaps/types'

import type {
  GeneralGcp,
  SplitGcpLineInfo,
  RefinementOptions,
  SplitGcpLinePointInfo
} from './types.js'

// About Refinement Functions:
//
// Refinement function are used both in forward and backward transformation
// and are the generalised approach to refine lineStrings, rings etc.
// when they are transformed using a (forward or backward) 'refinement function'.
//
// See the way refinement methods are called:
// with a different refinementFunction and refinementOptions for the forward and backward case.
//
// The concepts of 'source' and 'destination' for refinement methods
// might therefore differ from the from the transform methods that called them.
// For forward transform methods, 'source' and 'destination' in the refinement context
// are the same as in their original transform context.
// For backward transform methods, they are inversed.
// Hence, in the refinement contect we always act source > destination.

export const defaultRefinementOptions: RefinementOptions = {
  maxDepth: 0,
  minSourceDistance: 0,
  minDestinationDistance: 0,
  minOffsetRatio: 0,
  minOffsetDistance: Infinity,
  sourceMidPointFunction: midPoint,
  destinationMidPointFunction: midPoint
}

// Refine Geometries

export function refineLineString(
  lineString: LineString,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): TypedLineString<GeneralGcp> {
  lineString = conformLineString(lineString)

  const gcps: GeneralGcp[] = lineString.map((point) => ({
    source: point,
    destination: refinementFunction(point)
  }))
  const gcpLines = gcpsToGcpLines(gcps, false)
  const refinedGcpLines = gcpLines
    .map((gcpLine) =>
      splitGcpLineRecursively(gcpLine, refinementFunction, refinementOptions, 0)
    )
    .flat(1)

  return gcpLinesToGcps(refinedGcpLines, true)
}

export function refineRing(
  ring: Ring,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): TypedRing<GeneralGcp> {
  ring = conformRing(ring)

  const gcps: GeneralGcp[] = ring.map((point) => ({
    source: point,
    destination: refinementFunction(point)
  }))
  const gcpLines = gcpsToGcpLines(gcps, true)
  const refinedGcpLines = gcpLines
    .map((line) =>
      splitGcpLineRecursively(line, refinementFunction, refinementOptions, 0)
    )
    .flat(1)

  return gcpLinesToGcps(refinedGcpLines, false)
}

function splitGcpLineRecursively(
  gcpLine: TypedLine<GeneralGcp>,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): TypedLine<GeneralGcp>[] {
  const newMidGcp = newMidGcpIfShouldSplitGcpLine(
    gcpLine,
    refinementFunction,
    refinementOptions,
    depth
  )

  if (newMidGcp) {
    return [
      splitGcpLineRecursively(
        [gcpLine[0], newMidGcp],
        refinementFunction,
        refinementOptions,
        depth + 1
      ),
      splitGcpLineRecursively(
        [newMidGcp, gcpLine[1]],
        refinementFunction,
        refinementOptions,
        depth + 1
      )
    ].flat(1)
  } else {
    return [gcpLine]
  }
}

// Should split line

// This function checks if a GcpLine should be splits
// and returns the new midGcp if so, or undefined otherwise
export function newMidGcpIfShouldSplitGcpLine(
  gcpLine: TypedLine<GeneralGcp>,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions,
  depth: number
): GeneralGcp | undefined {
  if (
    depth >= refinementOptions.maxDepth ||
    refinementOptions.maxDepth <= 0 ||
    distance(gcpLine[0].source, gcpLine[1].source) <
      refinementOptions.minSourceDistance ||
    distance(gcpLine[0].destination, gcpLine[1].destination) <
      refinementOptions.minDestinationDistance
  ) {
    return undefined
  }

  const {
    sourceMidPoint,
    destinationMidPointFromRefinementFunction,
    destinationMidPointsDistance,
    destinationLineDistance,
    destinationRefinedLineDistance
  } = splitGcpLinePointInfo(gcpLine, refinementFunction, refinementOptions)

  const shouldSplit = shouldSplitGcpLine(
    {
      destinationMidPointsDistance,
      destinationLineDistance,
      destinationRefinedLineDistance
    },
    refinementOptions
  )

  return shouldSplit
    ? {
        source: sourceMidPoint,
        destination: destinationMidPointFromRefinementFunction
      }
    : undefined
}

function splitGcpLinePointInfo(
  gcpLine: TypedLine<GeneralGcp>,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): SplitGcpLinePointInfo {
  const sourceMidPoint = refinementOptions.sourceMidPointFunction(
    gcpLine[0].source,
    gcpLine[1].source
  )
  const destinationMidPoint = refinementOptions.destinationMidPointFunction(
    gcpLine[0].destination,
    gcpLine[1].destination
  )
  const destinationMidPointFromRefinementFunction =
    refinementFunction(sourceMidPoint)
  const destinationMidPointsDistance = distance(
    destinationMidPoint,
    destinationMidPointFromRefinementFunction
  )

  const destinationLineDistance = distance(
    gcpLine[0].destination,
    gcpLine[1].destination
  )
  const destinationRefinedLineDistance = distance(
    refinementFunction(gcpLine[0].source),
    refinementFunction(gcpLine[1].source)
  )

  return {
    sourceMidPoint,
    destinationMidPointFromRefinementFunction,
    destinationMidPointsDistance,
    destinationLineDistance,
    destinationRefinedLineDistance
  }
}

function shouldSplitGcpLine(
  {
    destinationMidPointsDistance,
    destinationLineDistance,
    destinationRefinedLineDistance
  }: SplitGcpLineInfo,
  refinementOptions: RefinementOptions
): boolean {
  return (
    destinationMidPointsDistance / destinationLineDistance >
      refinementOptions.minOffsetRatio ||
    destinationMidPointsDistance > refinementOptions.minOffsetDistance
  )
}

// Get source refinement resolution

export function getSourceRefinementResolution(
  sourceBbox: Bbox,
  refinementFunction: (p: Point) => Point,
  refinementOptions: RefinementOptions
): number | undefined {
  const sourceRectangle = bboxToRectangle(sourceBbox)

  const sourceTRPoint = sourceRectangle[2]
  const sourceTLPoint = sourceRectangle[3]
  const sourceBRPoint = sourceRectangle[1]
  const sourceBLPoint = sourceRectangle[0]

  const sourceCRPoint = refinementOptions.sourceMidPointFunction(
    sourceTRPoint,
    sourceBRPoint
  )
  const sourceCLPoint = refinementOptions.sourceMidPointFunction(
    sourceTLPoint,
    sourceBLPoint
  )
  const sourceTCPoint = refinementOptions.sourceMidPointFunction(
    sourceTRPoint,
    sourceTLPoint
  )
  const sourceBCPoint = refinementOptions.sourceMidPointFunction(
    sourceBRPoint,
    sourceBLPoint
  )

  // Get horizontal and vertical lines from points
  // Note: Could also add sourceHTLine, sourceHBLine, sourceVLLine, sourceVRLine
  // to get a more accurate resolution (at the expense of more refinement computations),
  // but testing showed this was not needed
  const sourceHCLine = [sourceCRPoint, sourceCLPoint] as Line
  const sourceVCLine = [sourceTCPoint, sourceBCPoint] as Line
  const sourceMultiLine = [sourceHCLine, sourceVCLine]

  // Refine lines
  const sourceRefinedMultiLineString = sourceMultiLine.map((sourceLine) =>
    refineLineString(sourceLine, refinementFunction, refinementOptions).map(
      (generalGcp) => generalGcp.source
    )
  )

  if (
    sourceRefinedMultiLineString.every(
      (sourceRefinedLineString) => sourceRefinedLineString.length == 2
    )
  ) {
    return undefined
  }

  // Compute minimal line length of refinement
  // Note: Tried to acchieve this by working with unflattened refined line and computing depth
  // but that proved difficult for TypeScript
  const sourceRefinedMultiLineStringSquaredLengths =
    sourceRefinedMultiLineString.map((sourceRefinedLineString) =>
      sourceRefinedLineString
        .slice(0, -1)
        .map((sourcePoint, index) =>
          squaredDistance(sourcePoint, sourceRefinedLineString[index + 1])
        )
    )
  const sourceRefinedMultiLineStringMinLength = Math.sqrt(
    Math.min(...sourceRefinedMultiLineStringSquaredLengths.flat())
  )

  return sourceRefinedMultiLineStringMinLength
}

// Convert

export function gcpsToGcpLines(
  gcps: GeneralGcp[],
  close = false
): TypedLine<GeneralGcp>[] {
  const lineCount = gcps.length - (close ? 0 : 1)

  const lines: TypedLine<GeneralGcp>[] = []
  for (let index = 0; index < lineCount; index++) {
    lines.push([gcps[index], gcps[(index + 1) % gcps.length]])
  }

  return lines
}

export function gcpLinesToGcps(
  lines: TypedLine<GeneralGcp>[],
  close = false
): GeneralGcp[] {
  const gcps = lines.map((line) => line[0])
  if (close) {
    gcps.push(lines[lines.length - 1][1])
  }
  return gcps
}
