import { newArrayMatrix, pasteArrayMatrix } from '@allmaps/stdlib'
import {
  GcpTransformer,
  BaseIndependentLinearWeightsTransformation,
  TransformationType
} from '@allmaps/transform'

import type { GeoreferencedMapWithRcps, Staple } from './types'

export class Stapler {
  georeferencedMaps: GeoreferencedMapWithRcps[]
  type: TransformationType

  transformationsByMapId: Map<
    string,
    BaseIndependentLinearWeightsTransformation
  >
  dimensionsByMapId: Map<string, [number, number]>
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
    this.dimensionsByMapId = new Map()
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
      if (
        !(transformation instanceof BaseIndependentLinearWeightsTransformation)
      ) {
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

    for (const [
      mapId,
      transformation
    ] of this.transformationsByMapId.entries()) {
      this.dimensionsByMapId.set(
        mapId,
        transformation.coefsArrayMatrixDimensions
      )
    }

    const dimensions = Array.from(this.dimensionsByMapId.values()).reduce(
      ([accumulatingRows, accumulatingCols], [rows, cols]) => [
        accumulatingRows + rows,
        accumulatingCols + cols
      ],
      [0, 0]
    )

    let coefsArrayMatrix = newArrayMatrix(...dimensions)

    // for (const [
    //   mapId,
    //   transformation
    // ] of this.transformationsByMapId.entries()) {
    //   coefsArrayMatrix = pasteArrayMatrix(
    //     coefsArrayMatrix,
    //     x,
    //     y,
    //     transformation.coefsArrayMatrix
    //   )
    // }
  }
}
