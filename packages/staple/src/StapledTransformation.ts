import { generateChecksum } from '@allmaps/id'
import {
  groupBy,
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
  StaplePointWithId,
  Staple,
  StapledTransformationFromGeoreferencedMapsOptions
} from './types'

const defaultStapledTransformationFromGeoreferencedMapsOptions: StapledTransformationFromGeoreferencedMapsOptions =
  {
    direction: 'toGeo',
    type: 'thinPlateSpline'
  }

export class StapledTransformation {
  transformationsById: Map<string, BaseIndependentLinearWeightsTransformation>
  staples: Staple[]

  /**
   * Create a Stapled Transformation
   */ constructor(
    transformationsById: Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >,
    staples: Staple[]
  ) {
    this.transformationsById = transformationsById
    this.staples = staples
  }

  getCoefsArrayMatrix(): number[][] {
    let dimensions: [number, number] = [0, 0]
    this.transformationsById.forEach((transformation) => {
      dimensions = [
        dimensions[0] + transformation.coefsArrayMatrixDimensions[0],
        dimensions[1] + transformation.coefsArrayMatrixDimensions[1]
      ]
    })
    dimensions = [dimensions[0] + this.staples.length, dimensions[1]]

    let coefsArrayMatrix = newArrayMatrix(...dimensions)

    let trailingCumulativeDimensions: [number, number] = [0, 0]
    let trailingCumulativeDimensionsById = new Map<string, [number, number]>()

    for (const [id, transformation] of this.transformationsById.entries()) {
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        ...trailingCumulativeDimensions,
        transformation.coefsArrayMatrix
      )
      trailingCumulativeDimensionsById.set(id, trailingCumulativeDimensions)
      trailingCumulativeDimensions = [
        trailingCumulativeDimensions[0] +
          transformation.coefsArrayMatrixDimensions[0],
        trailingCumulativeDimensions[1] +
          transformation.coefsArrayMatrixDimensions[1]
      ]
    }

    for (const staple of this.staples) {
      const stapleSourcePointCoefsArray0 = this.transformationsById
        .get(staple[0].transformationId)
        ?.getSourcePointCoefsArray(staple[0].source)
      const stapleSourcePointCoefsArray1 = this.transformationsById
        .get(staple[1].transformationId)
        ?.getSourcePointCoefsArray(staple[1].source)
      if (!stapleSourcePointCoefsArray0 || !stapleSourcePointCoefsArray1) {
        throw new Error('Staple source point coefs array missing')
      }
      const trailingCumulativeDimensions0 =
        trailingCumulativeDimensionsById.get(staple[0].transformationId)
      const trailingCumulativeDimensions1 =
        trailingCumulativeDimensionsById.get(staple[1].transformationId)
      if (!trailingCumulativeDimensions0) {
        throw new Error(
          'trailingCumulativeDimensions not found for transformationId'
        )
      }
      if (!trailingCumulativeDimensions1) {
        throw new Error(
          'trailingCumulativeDimensions not found for transformationId'
        )
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
    options?: Partial<StapledTransformationFromGeoreferencedMapsOptions>
  ): Promise<StapledTransformation> {
    options = mergeOptions(
      defaultStapledTransformationFromGeoreferencedMapsOptions,
      options
    )

    const transformationsById = new Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >()
    const staplePoints: StaplePointWithId[] = []

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

      transformationsById.set(mapId, transformation)

      georeferencedMap.rcps.forEach((rcp) => {
        staplePoints.push({
          id: rcp.id,
          transformationId: mapId,
          source: rcp.resource
        })
      })
    }

    const staples = Object.values(groupBy(staplePoints, (i) => i.id)).filter(
      (staplePoints) => {
        if (staplePoints.length > 2) {
          throw new Error('There can not be more then two staple points per Id')
        }
        return staplePoints.length === 2
      }
    ) as [StaplePointWithId, StaplePointWithId][] as Staple[]

    return new StapledTransformation(transformationsById, staples)
  }
}
