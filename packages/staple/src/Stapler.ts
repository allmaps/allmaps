import { generateChecksum } from '@allmaps/id'
import {
  mergeOptions,
  multiplyArrayMatrix,
  newArrayMatrix,
  pasteArrayMatrix
} from '@allmaps/stdlib'
import {
  GcpTransformer,
  BaseIndependentLinearWeightsTransformation
} from '@allmaps/transform'

import type {
  GeoreferencedMapWithRcps,
  Staple,
  StapleDuo,
  StaplerFromGeoreferencedMapsOptions
} from './types'

const defaultStaplerFromGeoreferencedMapsOptions: StaplerFromGeoreferencedMapsOptions =
  {
    direction: 'toGeo',
    type: 'thinPlateSpline'
  }

export class Stapler {
  transformationsByMapId: Map<
    string,
    BaseIndependentLinearWeightsTransformation
  >
  stapleDuosById: Map<string, StapleDuo>

  /**
   * Create a Stapler
   */ constructor(
    transformationsByMapId: Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >,
    stapleDuosById: Map<string, StapleDuo>
  ) {
    this.transformationsByMapId = transformationsByMapId
    this.stapleDuosById = stapleDuosById
  }

  getCoefsArrayMatrix(): number[][] {
    let dimensions: [number, number] = [0, 0]
    this.transformationsByMapId.forEach((transformation) => {
      dimensions = [
        dimensions[0] + transformation.coefsArrayMatrixDimensions[0],
        dimensions[1] + transformation.coefsArrayMatrixDimensions[1]
      ]
    })
    dimensions = [dimensions[0] + this.stapleDuosById.size, dimensions[1]]

    let coefsArrayMatrix = newArrayMatrix(...dimensions)

    let trailingCumulativeDimensions: [number, number] = [0, 0]
    let trailingCumulativeDimensionsByMapId = new Map<
      string,
      [number, number]
    >()

    for (const [
      mapId,
      transformation
    ] of this.transformationsByMapId.entries()) {
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        ...trailingCumulativeDimensions,
        transformation.coefsArrayMatrix
      )
      trailingCumulativeDimensionsByMapId.set(
        mapId,
        trailingCumulativeDimensions
      )
      trailingCumulativeDimensions = [
        trailingCumulativeDimensions[0] +
          transformation.coefsArrayMatrixDimensions[0],
        trailingCumulativeDimensions[1] +
          transformation.coefsArrayMatrixDimensions[1]
      ]
    }

    for (const stapleDuo of this.stapleDuosById.values()) {
      const stapleSourcePointCoefsArray0 = this.transformationsByMapId
        .get(stapleDuo.staple0.mapId)
        ?.getSourcePointCoefsArray(stapleDuo.staple0.source)
      const stapleSourcePointCoefsArray1 = this.transformationsByMapId
        .get(stapleDuo.staple1.mapId)
        ?.getSourcePointCoefsArray(stapleDuo.staple1.source)
      if (!stapleSourcePointCoefsArray0 || !stapleSourcePointCoefsArray1) {
        throw new Error('Staple source point coefs array missing')
      }
      const trailingCumulativeDimensions0 =
        trailingCumulativeDimensionsByMapId.get(stapleDuo.staple0.mapId)
      const trailingCumulativeDimensions1 =
        trailingCumulativeDimensionsByMapId.get(stapleDuo.staple1.mapId)
      if (!trailingCumulativeDimensions0) {
        throw new Error('trailingCumulativeDimensions not found for mapId')
      }
      if (!trailingCumulativeDimensions1) {
        throw new Error('trailingCumulativeDimensions not found for mapId')
      }
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeDimensions[0],
        trailingCumulativeDimensions0[1],
        [stapleSourcePointCoefsArray0]
      )
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeDimensions[0],
        trailingCumulativeDimensions1[1],
        multiplyArrayMatrix([stapleSourcePointCoefsArray1], -1)
      )
      trailingCumulativeDimensions = [
        trailingCumulativeDimensions[0] + 1,
        trailingCumulativeDimensions[1]
      ]
    }

    return coefsArrayMatrix
  }

  static async fromGeoreferencedMaps(
    georeferencedMaps: GeoreferencedMapWithRcps[],
    options?: Partial<StaplerFromGeoreferencedMapsOptions>
  ): Promise<Stapler> {
    options = mergeOptions(defaultStaplerFromGeoreferencedMapsOptions, options)

    const transformationsByMapId = new Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >()
    const staplesById = new Map<string, Staple[]>()
    const stapleDuosById = new Map<string, StapleDuo>()

    for (const georeferencedMap of georeferencedMaps) {
      // Neglect georeferenced maps with no staple points
      if (!georeferencedMap.rcps) {
        continue
      }

      const mapId =
        georeferencedMap.id || (await generateChecksum(georeferencedMap))

      const transformation =
        options.direction == 'toGeo'
          ? GcpTransformer.fromGeoreferencedMap(
              georeferencedMap
            ).getToGeoTransformation(options.type)
          : GcpTransformer.fromGeoreferencedMap(
              georeferencedMap
            ).getToResourceTransformation(options.type)
      if (
        !(transformation instanceof BaseIndependentLinearWeightsTransformation)
      ) {
        throw new Error(
          `Transformation type ${transformation.type} unsupported`
        )
      }

      transformationsByMapId.set(mapId, transformation)

      georeferencedMap.rcps.forEach((rcp) => {
        if (!staplesById.has(rcp.id)) {
          staplesById.set(rcp.id, [])
        }
        staplesById.get(rcp.id)?.push({
          id: rcp.id,
          mapId,
          source: rcp.resource
        })
      })
    }

    staplesById.forEach((staples) => {
      if (staples.length !== 2) {
        throw new Error('There must be exactly two staples by staple ID')
      }
    })

    for (const [id, staples] of staplesById.entries()) {
      stapleDuosById.set(id, { staple0: staples[0], staple1: staples[1] })
    }

    return new Stapler(transformationsByMapId, stapleDuosById)
  }
}
