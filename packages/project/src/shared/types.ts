import { TransformerOptions } from '@allmaps/transform'

export type Projection = string

export type ProjectedTransformerOptions = {
  internalProjection: Projection
  projection: Projection
} & TransformerOptions
