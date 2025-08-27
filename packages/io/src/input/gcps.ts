import { proj4, lonLatProjection, isEqualProjection } from '@allmaps/project'
import { Gcp, Point } from '@allmaps/types'

import type { Projection } from '@allmaps/project'
import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

/**
 * Parse GCPs from file string.
 *
 * An internal projection can be included in a QGIS GCP file and will be used when parsing and returned.
 * An internal projection can be specified to parse ArcGIS files.
 * The resource height must specified to parse ArcGIS files.
 */
export function parseGcps(
  gcpString: string,
  options: Partial<{
    resourceHeight: number
    internalProjection: Projection
  }>
): { gcps: Gcp[]; internalProjection?: Projection } {
  // TODO: consider parsing GCPs from Georeference Annotation too?

  const parsedInternalProjection =
    parseInternalProjectionFromGcpString(gcpString)
  const mergedOptions = mergeOptionsUnlessUndefined(
    { internalProjection: lonLatProjection },
    mergeOptionsUnlessUndefined(
      { internalProjection: parsedInternalProjection },
      options
    )
  )

  let gcps = parseGcpString(gcpString, options)

  if (!isEqualProjection(mergedOptions.internalProjection, lonLatProjection)) {
    gcps = gcps.map((gcp) => {
      return {
        resource: gcp.resource,
        geo: proj4(
          mergedOptions.internalProjection.definition,
          lonLatProjection.definition,
          gcp.geo
        )
      }
    })
  }

  return {
    gcps,
    internalProjection: parsedInternalProjection
  }
}

export function parseGcpString(
  gcpString: string,
  options?: Partial<{
    resourceHeight: number
  }>
): Gcp[] {
  const lines = gcpString.trim().split('\n')

  if (lines.length == 0) {
    throw new Error('No coordinates')
  }

  // For more about these datatypes, see https://observablehq.com/d/50deb2a74a628292

  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return parseQgisGcpLines(lines)
  } else if (lines[0].split(',').length >= 5) {
    return parseArcGisCsvGcpLines(lines, options)
  } else if (lines[0].split(/\t+/).length >= 4) {
    return parseArcGisTsvGcpLines(lines, options)
  } else if (lines[0].split(/\ +/).length >= 2) {
    // Note: split on spaces specifically instead of /\s+/
    // to prevent false positive of ArcGIS TSV file
    return parseGdalGcpLines(lines)
  } else {
    throw 'Unrecognised GCP type'
  }
}

export function parseQgisGcpLines(lines: string[]): Gcp[] {
  const gcps = lines
    .filter(
      (line) => line.slice(0, 4) !== '#CRS' && line.slice(0, 4) !== 'mapX'
    )
    .map((line) =>
      line
        .replace(/\s+/g, '')
        .split(',')
        .map((_c, i, l) => {
          const newOrder = [2, 3, 0, 1]
          return l[newOrder[i]]
        })
        .map(Number)
    )
    .map(coordinateArrayToGcp)
    .map((gcp) => {
      return {
        resource: [gcp.resource[0], -gcp.resource[1]] as Point,
        geo: gcp.geo
      }
    })

  return gcps
}

export function parseArcGisCsvGcpLines(
  lines: string[],
  options?: Partial<{
    resourceHeight: number
  }>
): Gcp[] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS CSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight
  const coordinates = lines
    .map((line) => line.replace(/\s+/g, '').split(',').slice(1).map(Number))
    .map(coordinateArrayToGcp)
    .map((gcp) => {
      return {
        resource: [gcp.resource[0], resourceHeight - gcp.resource[1]] as Point,
        geo: gcp.geo
      }
    })

  return coordinates
}

export function parseArcGisTsvGcpLines(
  lines: string[],
  options?: Partial<{
    resourceHeight: number
  }>
): Gcp[] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS TSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight
  const coordinates = lines
    .map((line) => line.split('\t').map(Number))
    .map(coordinateArrayToGcp)
    .map((gcp) => {
      return {
        resource: [gcp.resource[0], resourceHeight - gcp.resource[1]] as Point,
        geo: gcp.geo
      }
    })

  return coordinates
}

export function parseGdalGcpLines(lines: string[]): Gcp[] {
  return parseGdalCoordinateLines(lines).map(coordinateArrayToGcp)
}

export function parseGdalCoordinateLines(lines: string[]): number[][] {
  // String from mutliline file where each line contains multiple coordinates separated by whitespace
  return lines.map((line) =>
    line.split(/\s+/).map((coordinate) => Number(coordinate.trim()))
  )
}

export function parseInternalProjectionFromGcpString(
  gcpString: string
): Projection | undefined {
  const projectionDefinition =
    parseInternalProjectionDefinitionFromLine(gcpString)
  let projection: Projection | undefined = undefined
  if (projectionDefinition) {
    projection = {
      definition: projectionDefinition
    }
  }
  return projection
}

export function parseInternalProjectionDefinitionFromGcpString(
  gcpString: string
): string | undefined {
  const lines = gcpString.trim().split('\n')

  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return parseInternalProjectionDefinitionFromLine(lines[0])
  }
  return undefined
}

export function parseInternalProjectionDefinitionFromLine(
  line: string
): string | undefined {
  if (line.slice(0, 4) === '#CRS') {
    const internalProjectionDefinition = line.slice(5)
    if (internalProjectionDefinition.length > 0) {
      return internalProjectionDefinition
    }
  }
  return undefined
}

function coordinateArrayToGcp(coordinateArray: number[]): Gcp {
  return {
    resource: [coordinateArray[0], coordinateArray[1]] as Point,
    geo: [coordinateArray[2], coordinateArray[3]] as Point
  }
}
