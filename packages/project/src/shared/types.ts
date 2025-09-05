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

export type ProjectedGcpTransformOptions = ProjectionInputs &
  GcpTransformOptions

export type ProjectionInputs = {
  projection?: Projection
}
export type InternalProjectionInputs = {
  internalProjection?: Projection
}
export type ProjectedGcpTransformerInputs = GcpsInputs &
  TransformationTypeInputs &
  InternalProjectionInputs &
  ProjectionInputs
