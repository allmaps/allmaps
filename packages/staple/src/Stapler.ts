import { GcpTransformer } from '@allmaps/transform'

import type { BaseTransformation, TransformationType } from '@allmaps/transform'

import type { GeoreferencedMapWithRcps, Staple } from './types'

const separatelySolvedTransformationTypes: TransformationType[] = [
  'polynomial',
  'polynomial1',
  'polynomial2',
  'polynomial3',
  'thinPlateSpline'
]

// const jointlySolvedTransformationTypes: TransformationType[] = ['helmert']

export class Stapler {
  georeferencedMaps: GeoreferencedMapWithRcps[]
  type: TransformationType

  transformationsByMapId: Map<string, BaseTransformation>
  staplesById: Map<string, Staple[]>

  /**
   * Create a StapledTransformation
   */ constructor(
    georeferencedMaps: GeoreferencedMapWithRcps[],
    type: TransformationType = 'thinPlateSpline'
  ) {
    this.georeferencedMaps = georeferencedMaps
    this.type = type

    this.transformationsByMapId = new Map()
    this.staplesById = new Map()

    for (const georeferencedMap of georeferencedMaps) {
      // Neglect georeferenced maps with no staple points
      if (!georeferencedMap.rcps) {
        continue
      }
      // Note: since we cannot await in a constructor,
      // we can't compute a missing mapId here using generateChecksum()
      // and we throw if undefined
      const mapId = georeferencedMap.id
      if (!mapId) {
        throw new Error('Map ID is undefined')
      }
      // Note: we assume 'toGeo' transformation
      const transformation =
        GcpTransformer.fromGeoreferencedMap(
          georeferencedMap
        ).getToGeoTransformation()
      if (!separatelySolvedTransformationTypes.includes(transformation.type)) {
        throw new Error(
          `Transformation type ${transformation.type} unsupported`
        )
      }
      this.transformationsByMapId.set(mapId, transformation)
      georeferencedMap.rcps.forEach((rcp) => {
        // TODO: check if ok to assume forward transformation
        // TODO: pass transformation type but don't overwrite if undefined
        if (!this.staplesById.has(rcp.id)) {
          this.staplesById.set(rcp.id, [])
        }
        this.staplesById.get(rcp.id)?.push({
          id: rcp.id,
          mapId,
          source: rcp.resource
        })
      })
    }
    // TODO: deal with length > 2
    // Then we should take mapId into account, and add it for every two mapId's
    this.staplesById.forEach((staples) => {
      if (staples.length !== 2) {
        throw new Error('There can only be two staples by staple ID')
      }
    })

    // for (const [mapId, transformation] of transformationsByMapId.entries()) {
    // }
    // const coefsArrayMatrix = newArrayMatrix(0, 0)
  }
}
