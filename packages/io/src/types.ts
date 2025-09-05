export type GcpFileFormat = 'qgis' | 'arcgis-csv' | 'arcgis-tsv' | 'gdal'
export const supportedGcpFileFormats = [
  'qgis',
  'arcgis-csv',
  'arcgis-tsv',
  'gdal'
]
export const supportedGcpFileFormatsWithResourceYAxisUp = [
  'qgis',
  'arcgis-csv',
  'arcgis-tsv'
]

export type GcpResourceOrigin = 'top-left' | 'bottom-left'
export const supportedGcpResourceOrigin = ['top-left', 'bottom-left']

export type GcpResourceYAxis = 'up' | 'down'
export const supportedGcpResourceYAxis = ['up', 'down']
