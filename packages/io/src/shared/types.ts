import {
  supportedGcpFileFormats,
  supportedGcpFileFormatsWithResourceYAxisUp,
  supportedGcpResourceOrigin,
  supportedGcpResourceYAxis
} from './constants.js'

export type GcpFileFormat = (typeof supportedGcpFileFormats)[number]
export type GcpFileFormatWithResourceYAxisUp =
  (typeof supportedGcpFileFormatsWithResourceYAxisUp)[number]
export type GcpResourceOrigin = (typeof supportedGcpResourceOrigin)[number]
export type GcpResourceYAxis = (typeof supportedGcpResourceYAxis)[number]
