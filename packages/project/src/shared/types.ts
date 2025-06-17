import {
  GcpsInputs,
  GcpTransformerOptions,
  GcpTransformOptions,
  TransformationTypeInputs
} from '@allmaps/transform'

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

export type InternalProjectionInputs = {
  internalProjection?: Projection
}
export type ProjectedGcpTransformerInputs = GcpsInputs &
  TransformationTypeInputs &
  InternalProjectionInputs
