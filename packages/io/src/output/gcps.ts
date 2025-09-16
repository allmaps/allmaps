import { proj4, lonLatProjection, isEqualProjection } from '@allmaps/project'
import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

import { supportedGcpFileFormatsWithResourceYAxisUp } from '../types.js'

import type { Gcp, Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Projection } from '@allmaps/project'

import type {
  GcpFileFormat,
  GcpResourceOrigin,
  GcpResourceYAxis
} from '../types.js'

/**
 * Print GCPs from Georeferenced Map to file string.
 *
 * A projection can be specified files to print files,
 * and will be infered from the map's resourceCrs by default.
 * It's definition will be included in QGIS GCP files.
 * The resource height must specified when parsing GCPs with resource origin in bottom left,
 * and will be infered from the map by default.
 */
export function printGeoreferencedMapGcps(
  map: GeoreferencedMap,
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
): string {
  const mergedOptions = mergeOptionsUnlessUndefined(
    // Note: resourceCrs normally indicates the internalProjection,
    // and is used here to guess the gcpProjection
    // Indeed, if a resourceCrs is specified it is probably inteded to be used
    // when printed GCPs are entered in other georeferencing programs like QGIS.
    {
      gcpProjection: map.resourceCrs as Projection,
      resourceHeight: map.resource.height
    },
    options
  )

  return printGcps(map.gcps, mergedOptions)
}

/**
 * Print GCPs to file string.
 *
 * A projection can be specified files to print files,
 * and will be infered from the map's resourceCrs by default.
 * It's definition will be included in QGIS GCP files.
 * The resource height must specified when parsing GCPs with resource origin in bottom left,
 * and will be infered from the map by default.
 */
export function printGcps(
  gcps: Gcp[],
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
): string {
  // For more about these file formats, see https://observablehq.com/d/ccc0f30809e756f6

  const defaultParseGcpsOptions = {
    gcpProjection: lonLatProjection,
    gcpFileFormat: 'gdal',
    gcpResourceOrigin: 'top-left',
    gcpResourceYAxis:
      options?.gcpFileFormat &&
      supportedGcpFileFormatsWithResourceYAxisUp.includes(
        options?.gcpFileFormat
      )
        ? 'up'
        : 'down'
  }
  const mergedOptions = mergeOptionsUnlessUndefined(
    defaultParseGcpsOptions,
    options
  )

  gcps = gcps.map((gcp) => {
    // Project
    if (!isEqualProjection(mergedOptions.gcpProjection, lonLatProjection)) {
      gcp = {
        resource: gcp.resource,
        geo: proj4(
          lonLatProjection.definition,
          mergedOptions.gcpProjection.definition,
          gcp.geo
        )
      }
    }

    // Process resource origin
    if (mergedOptions.gcpResourceOrigin === 'bottom-left') {
      if (!mergedOptions.resourceHeight) {
        throw new Error(
          'Resource height required when printing GCPs with resource origin in bottom left'
        )
      }
      gcp = {
        resource: [
          gcp.resource[0],
          gcp.resource[1] -
            (mergedOptions.gcpResourceOrigin === 'bottom-left'
              ? mergedOptions.resourceHeight
              : 0)
        ] as Point,
        geo: gcp.geo
      }
    }

    // Process resource scaling
    if (mergedOptions.gcpResourceWidth || mergedOptions.gcpResourceHeight) {
      if (!mergedOptions.resourceWidth || !mergedOptions.resourceHeight) {
        throw new Error(
          'Resource width and height required when printing GCPs with gcp resource width and height'
        )
      }
      if (!mergedOptions.gcpResourceWidth || !mergedOptions.gcpResourceHeight) {
        throw new Error(
          'GCP resource width and height required when printing GCPs with gcp resource width and height'
        )
      }
      gcp = {
        resource: [
          (gcp.resource[0] * mergedOptions.gcpResourceWidth) /
            mergedOptions.resourceWidth,
          (gcp.resource[1] * mergedOptions.gcpResourceHeight) /
            mergedOptions.resourceHeight
        ] as Point,
        geo: gcp.geo
      }
    }

    // Process resource Y Axis flip
    gcp = {
      resource: [
        gcp.resource[0],
        gcp.resource[1] * (mergedOptions.gcpResourceYAxis === 'up' ? -1 : 1)
      ] as Point,
      geo: gcp.geo
    }

    return gcp
  })

  // Print
  let headerLines: string[] = []
  let gcpLines: string[]
  if (mergedOptions.gcpFileFormat === 'qgis') {
    headerLines = printQgisHeader(mergedOptions)
    gcpLines = printQgisGcpLines(gcps)
  } else if (mergedOptions.gcpFileFormat === 'arcgis-csv') {
    gcpLines = printArcGisCsvGcpLines(gcps)
  } else if (mergedOptions.gcpFileFormat === 'arcgis-tsv') {
    gcpLines = printArcGisTsvGcpLines(gcps)
  } else if (mergedOptions.gcpFileFormat === 'gdal') {
    gcpLines = printGdalGcpLines(gcps)
  } else {
    throw 'Unrecognised GCP file format while printing GCPs'
  }

  return [...headerLines, ...gcpLines].join('\n')
}

export function printQgisHeader(
  options?: Partial<{
    gcpProjection: Projection
  }>
): string[] {
  const headerLines = []
  if (options && options.gcpProjection) {
    // Note: for optimal interaction with QGIS the CRS in this header
    // is ideally a EPSG defintion (of which only 'EPSG:4326' and 'EPSG:3857'
    // are supported by default in Proj4JS) or a WKT definition (and not a proj4string).
    // In most cases this will depend on the user input, but in the default case
    // 'EPSG:3857' is recognised by QGIS and it's proj4string isn't.
    headerLines.push('#CRS: ' + options.gcpProjection.definition)
  }
  headerLines.push('mapX,mapY,sourceX,sourceY')

  return headerLines
}

export function printQgisGcpLines(gcp: Gcp[]): string[] {
  const gcpLines = gcp.map((gcp) =>
    [gcp.geo[0], gcp.geo[1], gcp.resource[0], gcp.resource[1]]
      .map(String)
      .join(',')
  )

  return gcpLines
}

export function printArcGisCsvGcpLines(gcp: Gcp[]): string[] {
  const gcpLines = gcp.map((gcp, index) =>
    [index + 1, gcp.resource[0], gcp.resource[1], gcp.geo[0], gcp.geo[1]]
      .map(String)
      .join(',')
  )

  return gcpLines
}

export function printArcGisTsvGcpLines(gcp: Gcp[]): string[] {
  const gcpLines = gcp.map((gcp) =>
    [gcp.resource[0], gcp.resource[1], gcp.geo[0], gcp.geo[1]]
      .map(String)
      .join('\t')
  )

  return gcpLines
}

export function printGdalGcpLines(gcp: Gcp[]): string[] {
  const gcpLines = gcp.map((gcp) =>
    [gcp.resource[0], gcp.resource[1], gcp.geo[0], gcp.geo[1]]
      .map(String)
      .join(' ')
  )

  return gcpLines
}
