import { GcpTransformerOptions, GcpTransformOptions } from '@allmaps/transform'

export type ProjectionDefinition = string

export type Projection = {
  name?: string
  definition: ProjectionDefinition
}

export type ProjectedGcpTransformerOptions = {
  internalProjection: Projection
  projection: Projection
} & GcpTransformerOptions

export type ProjectedGcpTransformOptions = {
  projection: Projection
} & GcpTransformOptions
