import { proj4, lonLatProjection, isEqualProjection } from '@allmaps/project'
import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

import { supportedGcpFileFormatsWithResourceYAxisUp } from '../types.js'

import type { Gcp, Point } from '@allmaps/types'
import type { Projection } from '@allmaps/project'

import type {
  GcpFileFormat,
  GcpResourceOrigin,
  GcpResourceYAxis
} from '../types.js'

/**
 * Parse GCPs from file string.
 *
 * A projection can be included in a QGIS GCP file and will be used when parsing and returned.
 * A projection can be specified to parse ArcGIS files.
 * The resource height must specified when parsing GCPs with resource origin in bottom left.
 */
export function parseGcps(
  gcpString: string,
  options?: Partial<{
    gcpFileFormat: GcpFileFormat
    gcpResourceYAxis: GcpResourceYAxis
    gcpResourceWidth: number
    gcpResourceHeight: number
    resourceWidth: number
    resourceHeight: number
    gcpResourceOrigin: GcpResourceOrigin
    gcpProjection: Projection
  }>
): { gcps: Gcp[]; gcpProjection?: Projection } {
  // For more about these file formats, see https://observablehq.com/d/ccc0f30809e756f6
  const gcpLines = gcpString.trim().split('\n')

  if (gcpLines.length === 0) {
    throw new Error('No coordinates')
  }

  const gcpFileFormat =
    options?.gcpFileFormat ?? parseGcpFileFormatFromGcpString(gcpLines)
  const gcpProjection =
    options?.gcpProjection ??
    parseGcpProjectionFromGcpString(gcpString) ??
    lonLatProjection
  const defaultParseGcpsOptions = {
    gcpProjection,
    gcpFileFormat,
    gcpResourceOrigin: 'top-left',
    gcpResourceYAxis:
      gcpFileFormat &&
      supportedGcpFileFormatsWithResourceYAxisUp.includes(gcpFileFormat)
        ? 'up'
        : 'down'
  }
  const mergedOptions = mergeOptionsUnlessUndefined(
    defaultParseGcpsOptions,
    options
  )

  // Parse
  let gcps = parseGcpLines(gcpLines, mergedOptions)

  // Process scales
  gcps = gcps.map((gcp) => {
    // Process resource Y Axis flip
    gcp = {
      resource: [
        gcp.resource[0],
        gcp.resource[1] * (mergedOptions.gcpResourceYAxis === 'up' ? -1 : 1)
      ] as Point,
      geo: gcp.geo
    }

    // Process resource scaling
    if (mergedOptions.gcpResourceWidth || mergedOptions.gcpResourceHeight) {
      if (!mergedOptions.resourceWidth || !mergedOptions.resourceHeight) {
        throw new Error(
          'Resource width and height required when parsing GCPs with gcp resource width and height'
        )
      }
      if (!mergedOptions.gcpResourceWidth || !mergedOptions.gcpResourceHeight) {
        throw new Error(
          'GCP resource width and height required when parsing GCPs with gcp resource width and height'
        )
      }
      gcp = {
        resource: [
          (gcp.resource[0] * mergedOptions.resourceWidth) /
            mergedOptions.gcpResourceWidth,
          (gcp.resource[1] * mergedOptions.resourceHeight) /
            mergedOptions.gcpResourceHeight
        ] as Point,
        geo: gcp.geo
      }
    }

    // Process resource origin
    if (mergedOptions.gcpResourceOrigin === 'bottom-left') {
      if (!mergedOptions.resourceHeight) {
        throw new Error(
          'Resource height required when parsing GCPs with resource origin in bottom left'
        )
      }
      gcp = {
        resource: [
          gcp.resource[0],
          gcp.resource[1] +
            (mergedOptions.gcpResourceOrigin === 'bottom-left'
              ? mergedOptions.resourceHeight
              : 0)
        ] as Point,
        geo: gcp.geo
      }
    }

    // Project
    if (!isEqualProjection(mergedOptions.gcpProjection, lonLatProjection)) {
      gcp = {
        resource: gcp.resource,
        geo: proj4(
          mergedOptions.gcpProjection.definition,
          lonLatProjection.definition,
          gcp.geo
        )
      }
    }

    return gcp
  })

  return {
    gcps,
    gcpProjection
  }
}

export function parseGcpLines(
  lines: string[],
  options: {
    gcpFileFormat: GcpFileFormat
  }
): Gcp[] {
  if (options?.gcpFileFormat === 'qgis') {
    return parseQgisGcpLines(lines)
  } else if (options?.gcpFileFormat === 'arcgis-csv') {
    return parseArcGisCsvGcpLines(lines)
  } else if (options?.gcpFileFormat === 'arcgis-tsv') {
    return parseArcGisTsvGcpLines(lines)
  } else if (options?.gcpFileFormat === 'gdal') {
    return parseGdalGcpLines(lines)
  } else {
    throw 'Unrecognised GCP file format while parsing GCP lines'
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

  return gcps
}

export function parseArcGisCsvGcpLines(lines: string[]): Gcp[] {
  const coordinates = lines
    .map((line) => line.replace(/\s+/g, '').split(',').slice(1).map(Number))
    .map(coordinateArrayToGcp)

  return coordinates
}

export function parseArcGisTsvGcpLines(lines: string[]): Gcp[] {
  const coordinates = lines
    .map((line) => line.split('\t').map(Number))
    .map(coordinateArrayToGcp)

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

export function parseGcpProjectionFromGcpString(
  gcpString: string
): Projection | undefined {
  const gcpProjectionDefinition =
    parseGcpProjectionDefinitionFromGcpString(gcpString)
  let gcpProjection: Projection | undefined = undefined
  if (gcpProjectionDefinition) {
    gcpProjection = {
      definition: gcpProjectionDefinition
    }
  }
  return gcpProjection
}

export function parseGcpProjectionDefinitionFromGcpString(
  gcpString: string
): string | undefined {
  const lines = gcpString.trim().split('\n')

  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return parseGcpProjectionDefinitionFromLine(lines[0])
  }
  return undefined
}

export function parseGcpProjectionDefinitionFromLine(
  line: string
): string | undefined {
  if (line.slice(0, 4) === '#CRS') {
    const gcpProjectionDefinition = line.slice(6)
    if (gcpProjectionDefinition.length > 0) {
      return gcpProjectionDefinition
    }
  }
  return undefined
}

export function parseGcpFileFormatFromGcpString(
  lines: string[]
): GcpFileFormat {
  if (lines.find((line) => line.slice(0, 4) === 'mapX') != undefined) {
    return 'qgis'
  } else if (lines[0].split(',').length >= 5) {
    return 'arcgis-csv'
  } else if (lines[0].split(/\t+/).length >= 4) {
    return 'arcgis-tsv'
  } else if (lines[0].split(/ +/).length >= 2) {
    // Note: split on spaces specifically instead of /\s+/
    // to prevent false positive of ArcGIS TSV file
    return 'gdal'
  } else {
    throw 'Unrecognised GCP file format while guessing from GCP string'
  }
}

function coordinateArrayToGcp(coordinateArray: number[]): Gcp {
  return {
    resource: [coordinateArray[0], coordinateArray[1]] as Point,
    geo: [coordinateArray[2], coordinateArray[3]] as Point
  }
}
