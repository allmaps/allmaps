import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { BaseTransformation } from '@allmaps/transform'

// Resource Controle Point
export type Rcp = {
  id: string
  resource: Point
}

// TODO: remove when implemented
export type GeoreferencedMapWithRcps = GeoreferencedMap & {
  rcps?: Rcp[]
}

export type Staple = {
  id: string
  source: Point
  transformation: BaseTransformation
}

export type Staples = {
  staple0: Staple
  staple1: Staple
}
