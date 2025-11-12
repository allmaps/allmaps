import {
  GcpsInputs,
  GcpTransformerOptions,
  GcpTransformOptions,
  TransformationTypeInputs
} from '@allmaps/transform'

import { PROJJSONDefinition } from 'proj4/dist/lib/core'

export type ProjectionDefinition = string | PROJJSONDefinition

export type Projection<Definition = ProjectionDefinition> = {
  id?: string
  name?: string
  definition: Definition
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
