import {
  proj4,
  lonLatProjection,
  isEqualProjection,
  webMercatorProjection
} from '@allmaps/project'

import { mergeOptions, mergeOptionsUnlessUndefined } from '@allmaps/stdlib'
import { GcpFileFormat } from '../types'

import type { Gcp } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Projection } from '@allmaps/project'

/**
 * Print GCPs from Georeferenced Map to file string.
 *
 * An internal projection can be specified files to print files.
 * It's definition will be included in QGIS GCP files.
 * The resource height must specified to parse ArcGIS files, and will be infered from the map by default.
 */
export function printGeoreferencedMapGcps(
  map: GeoreferencedMap,
  options?: Partial<{
    resourceHeight: number
    internalProjection: Projection
    gcpFileFormat: GcpFileFormat
  }>
): string {
  const mergedOptions = mergeOptions(
    {
      internalProjection: map.resourceCrs,
      resourceHeight: map.resource.height
    },
    options
  )
  return printGcps(map.gcps, mergedOptions)
}

/**
 * Print GCPs to file string.
 *
 * An internal projection can be specified files to print files.
 * It's definition will be included in QGIS GCP files.
 * The resource height must specified to parse ArcGIS files.
 */
export function printGcps(
  gcps: Gcp[],
  options?: Partial<{
    resourceHeight: number
    internalProjection: Projection
    gcpFileFormat: GcpFileFormat
  }>
): string {
  const mergedOptions = mergeOptionsUnlessUndefined(
    { internalProjection: webMercatorProjection, gcpFileFormat: 'gdal' },
    options
  )

  if (!isEqualProjection(mergedOptions.internalProjection, lonLatProjection)) {
    gcps = gcps.map((gcp) => {
      return {
        resource: gcp.resource,
        geo: proj4(
          lonLatProjection.definition,
          mergedOptions.internalProjection.definition,
          gcp.geo
        )
      }
    })
  }

  // For more about these file formats, see https://observablehq.com/d/50deb2a74a628292

  let headerLines: string[] = []
  let gcpLines: string[]
  if (mergedOptions.gcpFileFormat == 'qgis') {
    headerLines = printQgisHeader(mergedOptions)
    gcpLines = printQgisGcpLines(gcps)
  } else if (mergedOptions.gcpFileFormat == 'arcgis-csv') {
    gcpLines = printArcGisCsvGcpLines(gcps, mergedOptions)
  } else if (mergedOptions.gcpFileFormat == 'arcgis-tsv') {
    gcpLines = printArcGisTsvGcpLines(gcps, mergedOptions)
  } else if (mergedOptions.gcpFileFormat == 'gdal') {
    gcpLines = printGdalGcpLines(gcps)
  } else {
    throw 'Unrecognised GCP file format'
  }

  return [...headerLines, ...gcpLines].join('\n')
}

export function printQgisHeader(
  options?: Partial<{
    internalProjection: Projection
  }>
): string[] {
  const headerLines = []
  if (options && options.internalProjection) {
    // Note: for optimal interaction with QGIS the CRS in this header
    // is ideally a EPSG defintion (of which only 'EPSG:4326' and 'EPSG:3857'
    // are supported by default in proj4) or a WKT definition.
    // In most cases this will depend on the user input, but in the default case
    // 'EPSG:3857' is recognised better by QGIS then it's proj4string.
    headerLines.push('#CRS: ' + options.internalProjection.definition)
  }
  headerLines.push('mapX,mapY,sourceX,sourceY')

  return headerLines
}

export function printQgisGcpLines(gcp: Gcp[]): string[] {
  const gcpLines = gcp.map((gcp) =>
    [gcp.geo[0], gcp.geo[1], gcp.resource[0], -gcp.resource[1]]
      .map(String)
      .join(',')
  )

  return gcpLines
}

export function printArcGisCsvGcpLines(
  gcp: Gcp[],
  options?: Partial<{
    resourceHeight: number
  }>
): string[] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS CSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight

  const gcpLines = gcp.map((gcp, index) =>
    [
      index + 1,
      gcp.resource[0],
      resourceHeight - gcp.resource[1],
      gcp.geo[0],
      gcp.geo[1]
    ]
      .map(String)
      .join(',')
  )

  return gcpLines
}

export function printArcGisTsvGcpLines(
  gcp: Gcp[],
  options?: Partial<{
    resourceHeight: number
  }>
): string[] {
  if (!options || !options.resourceHeight) {
    throw new Error(
      'Resource height required when parsing ArcGIS CSV coordinates'
    )
  }
  const resourceHeight = options.resourceHeight

  const gcpLines = gcp.map((gcp) =>
    [gcp.resource[0], resourceHeight - gcp.resource[1], gcp.geo[0], gcp.geo[1]]
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
