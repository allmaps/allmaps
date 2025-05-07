import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'

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
