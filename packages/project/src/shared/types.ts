import { TransformerOptions } from '@allmaps/transform'

import type { ProjectionDefinition } from 'proj4'

export type Projection = {
  name: string
  definition: string | ProjectionDefinition
}

export type ProjectedTransformerOptions = {
  internalProjection: Projection
  projection: Projection
} & TransformerOptions
