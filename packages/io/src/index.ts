export {
  parseGcps,
  parseGdalCoordinateLines,
  parseGcpProjectionFromGcpString
} from './input/gcps.js'

export { generateGeoreferencedMapGcps } from './output/gcps.js'
export { generateGeoreferencedMapsGeotiffScripts } from './output/geotiff.js'
export { generateCheckCommand } from './output/bash.js'
export {
  generateLeafletExample,
  generateMapLibreExample,
  generateOpenLayersExample
} from './output/plugins.js'

export {
  supportedGcpFileFormats,
  supportedGcpResourceOrigin,
  supportedGcpResourceYAxis,
  supportedGcpFileFormatsWithResourceYAxisUp
} from './shared/constants.js'

export type {
  GcpFileFormat,
  GcpFileFormatWithResourceYAxisUp,
  GcpResourceOrigin,
  GcpResourceYAxis
} from './shared/types.js'
