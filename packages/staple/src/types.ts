import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { ProjectedGcpTransformer } from '@allmaps/project'
import type { TransformationTypeInputs } from '@allmaps/transform'

export type StapledTransformationFromGeoreferencedMapOptions =
  TransformationTypeInputs & {
    useMapTransformationTypes: boolean
    deepClone: boolean
    evaluateStaplePoints: boolean
    evaluateSingleStaplePoints: boolean
    evaluateGcps: boolean
    removeExistingGcps: boolean
  }

export type StapledTransformationOptions =
  StapledTransformationFromGeoreferencedMapOptions & {
    georeferencedMapsById?: Map<string, GeoreferencedMap>
    projectedGcpTransformersById?: Map<string, ProjectedGcpTransformer>
    gcpSourcePoints?: SourcePoint[]
    extraSourcePoints?: SourcePoint[]
    averageOutStaplePoints: boolean
  }

// Resource Control Point
export type Rcp = {
  type: 'rcp'
  id: string
  mapId: string
  resource: Point
}

export type StaplePoint = {
  id: string
  transformationId: string
  source: Point
  destination?: Point
}

export type SourcePoint = {
  transformationId: string
  source: Point
  destination?: Point
}

export type Staple = [StaplePoint, StaplePoint]
