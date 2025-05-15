import Matrix, { pseudoInverse } from 'ml-matrix'

import { generateChecksum } from '@allmaps/id'
import {
  arrayMatrixSize,
  groupBy,
  mergeOptions,
  multiplyArrayMatrix,
  newArrayMatrix,
  pasteArrayMatrix,
  sliceArrayMatrix
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
import type { Size } from '@allmaps/types'

const defaultStapledTransformationFromGeoreferencedMapsOptions: StapledTransformationFromGeoreferencedMapsOptions =
  {
    direction: 'toGeo',
    type: 'thinPlateSpline'
  }

export class StapledTransformation {
  transformationsById: Map<string, BaseIndependentLinearWeightsTransformation>
  staples: Staple[]

  destinationPointsArrays: [number[], number[]]

  trailingCumulativeCoefsArrayMatrixSizeById: Map<string, [number, number]>
  coefsArrayMatrices: [number[][], number[][]]
  coefsArrayMatrix: number[][]
  coefsArrayMatricesSize: [[number, number], [number, number]]
  coefsArrayMatrixSize: [number, number]

  weightsArrays?: [number[], number[]]
  weightsArraysById?: Map<string, [number[], number[]]>

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

    if (this.transformationsById.size === 0) {
      throw new Error('No transformations found')
    }

    this.destinationPointsArrays = this.getDestinationPointsArrays()

    this.trailingCumulativeCoefsArrayMatrixSizeById = new Map()
    this.coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.coefsArrayMatrix = this.coefsArrayMatrices[0]
    this.coefsArrayMatricesSize = this.coefsArrayMatrices.map(
      (coefsArrayMatrix) => arrayMatrixSize(coefsArrayMatrix)
    ) as [[number, number], [number, number]]
    this.coefsArrayMatrixSize = arrayMatrixSize(this.coefsArrayMatrix)

    this.weightsArraysById = new Map()
  }

  getDestinationPointsArrays(): [number[], number[]] {
    // TODO: replace by .values().map() when map on iterator when becomes baseline
    const destinationPointsArrays: [number[], number[]] = [[], []]
    this.transformationsById.forEach((transformation) => {
      const transformationDestinationPointsArrays =
        transformation.getDestinationPointsArrays()
      destinationPointsArrays[0].push(
        ...transformationDestinationPointsArrays[0]
      )
      destinationPointsArrays[1].push(
        ...transformationDestinationPointsArrays[1]
      )
    })
    destinationPointsArrays[0].push(...Array(this.staples.length).fill(0))
    destinationPointsArrays[1].push(...Array(this.staples.length).fill(0))

    return destinationPointsArrays
  }

  getCoefsArrayMatrices(): [number[][], number[][]] {
    const coefsArrayMatrix = this.getCoefsArrayMatrix()
    return [coefsArrayMatrix, coefsArrayMatrix]
  }

  getCoefsArrayMatrix(): number[][] {
    // TODO: replace by .values().reduce() when reduce on iterator when becomes baseline
    let size: [number, number] = [0, 0]
    this.transformationsById.forEach((transformation) => {
      size = [
        size[0] + transformation.coefsArrayMatrixSize[0],
        size[1] + transformation.coefsArrayMatrixSize[1]
      ]
    })
    size = [size[0] + this.staples.length, size[1]]

    let coefsArrayMatrix = newArrayMatrix(...size)

    let trailingCumulativeCoefsArrayMatrixSize: Size = [0, 0]
    for (const [id, transformation] of this.transformationsById.entries()) {
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        ...trailingCumulativeCoefsArrayMatrixSize,
        transformation.coefsArrayMatrix
      )
      this.trailingCumulativeCoefsArrayMatrixSizeById.set(
        id,
        trailingCumulativeCoefsArrayMatrixSize
      )
      trailingCumulativeCoefsArrayMatrixSize = [
        trailingCumulativeCoefsArrayMatrixSize[0] +
          transformation.coefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize[1] +
          transformation.coefsArrayMatrixSize[1]
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
      const trailingCumulativeCoefsArrayMatrixSize0 =
        this.trailingCumulativeCoefsArrayMatrixSizeById.get(
          staple[0].transformationId
        )
      const trailingCumulativeCoefsArrayMatrixSize1 =
        this.trailingCumulativeCoefsArrayMatrixSizeById.get(
          staple[1].transformationId
        )
      if (!trailingCumulativeCoefsArrayMatrixSize0) {
        throw new Error(
          'trailingCumulativeCoefsArrayMatrixSize not found for transformationId'
        )
      }
      if (!trailingCumulativeCoefsArrayMatrixSize1) {
        throw new Error(
          'trailingCumulativeCoefsArrayMatrixSize not found for transformationId'
        )
      }
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeCoefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize0[1],
        [stapleSourcePointCoefsArray0]
      )
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeCoefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize1[1],
        multiplyArrayMatrix([stapleSourcePointCoefsArray1], -1)
      )
      trailingCumulativeCoefsArrayMatrixSize = [
        trailingCumulativeCoefsArrayMatrixSize[0] + 1,
        trailingCumulativeCoefsArrayMatrixSize[1]
      ]
    }

    return coefsArrayMatrix
  }

  // TODO: implement solveing jointly and switch based on transformations
  solve() {
    this.solveIndependently()

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }
    const weightsArrays = this.weightsArrays
    const trailingCumulativeCoefsArrayMatrixSizes = Array.from(
      this.trailingCumulativeCoefsArrayMatrixSizeById.values()
    )
    Array.from(this.transformationsById.entries()).forEach(([id], index) => {
      const startRows = trailingCumulativeCoefsArrayMatrixSizes[index][0]
      const endRows =
        index + 1 < trailingCumulativeCoefsArrayMatrixSizes.length
          ? trailingCumulativeCoefsArrayMatrixSizes[index + 1][0]
          : undefined
      this.weightsArraysById?.set(
        id,
        sliceArrayMatrix(weightsArrays, 0, startRows, 1, endRows) as [
          number[],
          number[]
        ]
      )
    })

    return
  }

  /**
   * Solve the x and y components independently.
   *
   * This uses the 'Pseudo Inverse' to compute (for each component, using the same coefs for both)
   * a 'best fit' (least squares) approximate solution for the system of linear equations
   * which is (in general) over-defined and hence lacks an exact solution.
   *
   * See https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
   */
  solveIndependently() {
    const coefsMatrix = new Matrix(this.coefsArrayMatrices[0])
    const destinationPointsMatrices = [
      Matrix.columnVector(this.destinationPointsArrays[0]),
      Matrix.columnVector(this.destinationPointsArrays[1])
    ]

    const pseudoInverseCoefsMatrix = pseudoInverse(coefsMatrix)

    const weightsMatrices = [
      pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[0]),
      pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[1])
    ] as [Matrix, Matrix]

    this.weightsArrays = weightsMatrices.map((matrix) =>
      matrix.to1DArray()
    ) as [number[], number[]]
  }

  // evaluateFunction(newSourcePoint: Point): Point {
  //   if (!this.weightsArrays) {
  //     this.solve()
  //   }

  //   if (!this.rbfWeightsArrays || !this.affineWeightsArrays) {
  //     throw new Error('RBF weights not computed')
  //   }

  //   const rbfWeights = this.rbfWeightsArrays
  //   const affineWeights = this.affineWeightsArrays

  //   // Compute the distances of that point to all control points
  //   const newDistances = this.sourcePoints.map((sourcePoint) =>
  //     this.normFunction(newSourcePoint, sourcePoint)
  //   )

  //   // Sum the weighted contributions of the input point
  //   const newDestinationPoint: Point = [0, 0]
  //   for (let i = 0; i < 2; i++) {
  //     // Apply the weights to the new distances
  //     newDestinationPoint[i] = newDistances.reduce(
  //       (sum, dist, index) =>
  //         sum +
  //         this.kernelFunction(dist, { epsilon: this.epsilon }) *
  //           rbfWeights[i][index],
  //       0
  //     )
  //     // Add the affine part
  //     newDestinationPoint[i] +=
  //       affineWeights[i][0] +
  //       affineWeights[i][1] * newSourcePoint[0] +
  //       affineWeights[i][2] * newSourcePoint[1]
  //   }
  //   return newDestinationPoint
  // }

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
