import { GcpTransformerOptions } from '@allmaps/transform'

import type { ProjectionDefinition } from 'proj4'

export type Projection = {
  name: string
  definition: string | ProjectionDefinition
}

export type ProjectedGcpTransformerOptions = {
  internalProjection: Projection
  projection: Projection
} & GcpTransformerOptions
