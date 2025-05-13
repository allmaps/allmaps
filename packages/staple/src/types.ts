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

export type Staple = {
  id: string
  mapId: string
  source: Point
}

export type StapleDuo = {
  staple0: Staple
  staple1: Staple
}

export type StaplerFromGeoreferencedMapsOptions = {
  direction: 'toGeo' | 'toResource'
  type: TransformationType
}
