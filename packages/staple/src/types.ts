import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { TransformationType } from '@allmaps/transform'

// TODO: remove when implemented
export type GeoreferencedMapWithRcps = GeoreferencedMap & {
  rcps?: Rcp[]
}

// Resource Controle Point
export type Rcp = {
  id: string
  resource: Point
}

export type StaplePoint = {
  transformationId: string
  source: Point
}

export type StaplePointWithId = {
  id: string
} & StaplePoint

export type Staple = [StaplePoint, StaplePoint]

export type StapledTransformationFromGeoreferencedMapsOptions = {
  direction: 'toGeo' | 'toResource'
  type: TransformationType
}
