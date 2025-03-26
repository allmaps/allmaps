import { GcpTransformerOptions, GcpTransformOptions } from '@allmaps/transform'

export type Projection = string

export type ProjectedGcpTransformerOptions = {
  internalProjection: Projection
  projection: Projection
} & GcpTransformerOptions

export type ProjectedGcpTransformOptions = {
  projection: Projection
} & GcpTransformOptions
