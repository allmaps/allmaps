import type { Point } from '@allmaps/types'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { ProjectedGcpTransformer } from '@allmaps/project'
import type { TransformationTypeInputs } from '@allmaps/transform'

export type AttachedTransformationFromGeoreferencedMapOptions =
  TransformationTypeInputs & {
    georeferencedMapsById?: Map<string, GeoreferencedMap>
    projectedGcpTransformersById?: Map<string, ProjectedGcpTransformer>
    gcpSourcePoints?: Sp[]
    extraSourcePoints?: Sp[]
    useMapTransformationTypes: boolean
    deepClone: boolean
    evaluateAttachmentSourceControlPoints: boolean
    evaluateSingleSourceControlPoints: boolean
    evaluateGcps: boolean
    removeExistingGcps: boolean
  }

export type AttachedTransformationOptions =
  AttachedTransformationFromGeoreferencedMapOptions & {
    averageOut: boolean
  }

// Resource Control Point
export type Rcp = {
  type: 'rcp'
  id: string
  mapId: string
  resource: Point
}

// Source Control Point
export type Scp = {
  id: string
  transformationId: string
  source: Point
  destination?: Point
}

export type Attachment = [Scp, Scp]

// Source Point
export type Sp = {
  transformationId: string
  source: Point
  destination?: Point
}
