export const supportedGcpFileFormats = [
  'qgis',
  'arcgis-csv',
  'arcgis-tsv',
  'gdal'
] as const

export const supportedGcpFileFormatsWithResourceYAxisUp = [
  'qgis',
  'arcgis-csv',
  'arcgis-tsv'
] as const

export const supportedGcpResourceOrigin = ['top-left', 'bottom-left'] as const

export const supportedGcpResourceYAxis = ['up', 'down'] as const
