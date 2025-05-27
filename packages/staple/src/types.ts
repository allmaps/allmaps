import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { ProjectedGcpTransformer } from '@allmaps/project'

// TODO: remove when implemented
export type GeoreferencedMapWithRcps = GeoreferencedMap & {
  rcps?: Rcp[]
}

// Resource Control Point
export type Rcp = {
  id: string
  resource: Point
}

export type StaplePoint = {
  id: string
  transformationId: string
  source: Point
  destination?: Point
}

export type Staple = [StaplePoint, StaplePoint]

export type StapledTransformationOptions = {
  georeferencedMaps: GeoreferencedMap[]
  projectedGcpTransformers: ProjectedGcpTransformer[]
}
