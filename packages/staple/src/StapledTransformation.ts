import Matrix, { pseudoInverse } from 'ml-matrix'

import { generateChecksum } from '@allmaps/id'
import {
  arrayMatrixSize,
  flipY,
  groupBy,
  mergeOptions,
  multiplyArrayMatrix,
  newArrayMatrix,
  pasteArrayMatrix,
  sliceArrayMatrix
} from '@allmaps/stdlib'
import { BaseIndependentLinearWeightsTransformation } from '@allmaps/transform'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point, Size } from '@allmaps/types'

import type {
  GeoreferencedMapWithRcps,
  Staple,
  StapledTransformationOptions,
  StaplePoint
} from './types'
import { TransformationTypeInputs } from 'packages/transform/src/shared/types'
import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'

type StapledTransformationFromGeoreferencedMapOptions =
  TransformationTypeInputs & {
    useMapTransformationTypes: boolean
  }

const defaultStapledTransformationFromGeoreferencedMapOptions: Partial<StapledTransformationFromGeoreferencedMapOptions> =
  {
    transformationType: 'thinPlateSpline',
    useMapTransformationTypes: false
  }

export class StapledTransformation {
  transformationsById: Map<string, BaseIndependentLinearWeightsTransformation>
  clonedTransformationsById: Map<
    string,
    BaseIndependentLinearWeightsTransformation
  >
  staples: Staple[]

  options?: StapledTransformationOptions

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
    staples: Staple[],
    options?: StapledTransformationOptions
  ) {
    this.transformationsById = transformationsById
    this.clonedTransformationsById = new Map()
    this.staples = staples
    this.options = options

    if (this.transformationsById.size === 0) {
      throw new Error('No transformations found')
    }
    if (this.staples.length === 0) {
      throw new Error('No staples found')
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
    this.processWeightsArrays()
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

  processWeightsArrays() {
    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }
    const weightsArrays = this.weightsArrays
    const trailingCumulativeCoefsArrayMatrixSizes = Array.from(
      this.trailingCumulativeCoefsArrayMatrixSizeById.values()
    )
    Array.from(this.transformationsById.entries()).forEach(
      ([id, transformation], index) => {
        const startRows = trailingCumulativeCoefsArrayMatrixSizes[index][0]
        const endRows =
          index + 1 < trailingCumulativeCoefsArrayMatrixSizes.length
            ? trailingCumulativeCoefsArrayMatrixSizes[index + 1][0]
            : undefined

        const weightsArraysForId = sliceArrayMatrix(
          weightsArrays,
          0,
          startRows,
          2,
          endRows
        ) as [number[], number[]]
        this.weightsArraysById?.set(id, weightsArraysForId)

        const clonedTransformation =
          transformation.deepClone() as typeof transformation
        clonedTransformation.setWeightsArrays(weightsArraysForId)
        this.clonedTransformationsById.set(id, clonedTransformation)
      }
    )
  }

  evaluateFunction(newSourcePoint: Point, id: string): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    const clonedTransformation = this.clonedTransformationsById.get(id)
    if (!clonedTransformation) {
      throw new Error('cloned transformation not found')
    }
    return clonedTransformation.evaluateFunction(newSourcePoint)
  }

  evaluateAll() {
    this.staples.forEach((staple) =>
      staple.forEach((staplePoint) => {
        staplePoint.destination = this.evaluateFunction(
          staplePoint.source,
          staplePoint.transformationId
        )
      })
    )
  }

  /**
   * Create Georeferenced Maps from this Stapler.
   * This will solve the stapler, evaluate all staples and add the resulting coordinates as GCPs.
   *
   * This only works of this Stapler has been created from Georeferenced Maps.
   *
   * @returns {GeoreferencedMap[]}
   */
  toGeoreferencedMaps(): GeoreferencedMap[] {
    const georeferencedMaps = this.options?.georeferencedMaps
    const projectedGcpTransformers = this.options?.projectedGcpTransformers

    if (!georeferencedMaps || !projectedGcpTransformers) {
      throw new Error(
        'No Georeferenced Maps or GCP Transformers found. Create a Stapler from GeoreferencedMaps to be able to recreate those.'
      )
    }

    this.evaluateAll()

    // For every evaluated staplePoint, add a GCP to it's respective Georeferenced Map.
    //
    // When there were more then two staple points with the same id, and duo's where created,
    // only add one staplepoint per mapId = transformationId.
    // We do this by filtering out repeated mapId's in the staplePointsById

    let staplePointsById = Object.values(
      groupBy(this.staples.flat(), (staplePoint) => staplePoint.id)
    )
    staplePointsById.map((staplePointsForId) =>
      staplePointsForId
        .filter(
          (staplePoint, index) =>
            staplePointsForId.findIndex(
              (s) => s.transformationId === staplePoint.transformationId
            ) === index
        )
        .forEach((staplePoint) => {
          const mapId = staplePoint.transformationId
          georeferencedMaps.forEach((georeferencedMap, index) => {
            if (georeferencedMap.id == mapId) {
              // TODO: process projection here!

              const projectedGcpTransformer = projectedGcpTransformers[index]
              const transformerOptions =
                projectedGcpTransformer.getTransformerOptions()

              let source = transformerOptions.differentHandedness
                ? flipY(staplePoint.source)
                : staplePoint.source
              let destination = this.evaluateFunction(
                staplePoint.source,
                staplePoint.transformationId
              )
              destination = transformerOptions.postForward(destination)
              destination =
                projectedGcpTransformer.projectionToLatLon(destination)

              console.log(staplePoint.source, source, destination)

              georeferencedMap.gcps.push({
                resource: source,
                geo: destination as Point
              })
            }
          })
        })
    )

    return georeferencedMaps
  }

  /**
   * Create a StapledTransformation from Georeferenced Maps
   *
   * By default, a Projected GCP Transformer is created for each Georeferenced Map,
   * and from it a Thin Plate Spline transformation is created and passed to the StapledTransformation.
   *
   * Use the options to specify another transformation type for all maps,
   * or specifically set the option 'useMapTransformationTypes' to true to use the type defined in the Georeferenced Map.
   *
   * @param georeferencedMaps - Georeferenced Maps
   * @param options - Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map
   * @returns {Promise<StapledTransformation>}
   */
  static async fromGeoreferencedMaps(
    georeferencedMaps: GeoreferencedMapWithRcps[],
    options?: Partial<
      ProjectedGcpTransformerOptions &
        StapledTransformationFromGeoreferencedMapOptions
    >
  ): Promise<StapledTransformation> {
    options = mergeOptions(
      defaultStapledTransformationFromGeoreferencedMapOptions,
      options
    )
    if (options?.useMapTransformationTypes) {
      delete options.transformationType
    }
    const transformationsById = new Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >()
    const staplePoints: StaplePoint[] = []
    const projectedGcpTransformers: ProjectedGcpTransformer[] = []

    for (const georeferencedMap of georeferencedMaps) {
      // Neglect georeferenced maps with no staple points
      if (!georeferencedMap.rcps) {
        continue
      }

      const mapId =
        georeferencedMap.id || (await generateChecksum(georeferencedMap))
      // TODO: check if it is ok to assign mapId, so we can use it later
      georeferencedMap.id = mapId

      const projectedGcpTransformer =
        ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap, options)
      projectedGcpTransformers.push(projectedGcpTransformer)

      const transformation = projectedGcpTransformer.getToGeoTransformation()
      if (
        !(transformation instanceof BaseIndependentLinearWeightsTransformation)
      ) {
        throw new Error(
          `Transformation type ${transformation.type} unsupported`
        )
      }
      transformationsById.set(mapId, transformation)

      georeferencedMap.rcps.forEach((rcp) => {
        const transformerOptions =
          projectedGcpTransformer.getTransformerOptions()
        let source = transformerOptions.differentHandedness
          ? flipY(rcp.resource)
          : rcp.resource
        source = transformerOptions.preForward(source)

        staplePoints.push({
          id: rcp.id,
          transformationId: mapId,
          source
        })
      })
    }

    // Create staples, by id.
    //
    // When there are more then two staple points with the same id, create duo's:
    // E.g.: if staplePoint0, staplePoint1, staplesPoint2 and staplePoint3 have id 'foo'
    // and staplePoint4 and staplesPoint5 have id 'bar', then create the following staples:
    //
    // [staplesPoint0, staplePoint1]
    // [staplesPoint0, staplePoint2]
    // [staplesPoint0, staplePoint3]
    //
    // [staplesPoint4, staplePoint5]
    //
    const staplePointsById = Object.values(
      groupBy(staplePoints, (staplePoint) => staplePoint.id)
    )
    const staples = staplePointsById
      .map((staplePointsForId) =>
        staplePointsForId.reduce(function (
          staplesForId,
          staplePointForId,
          index
        ) {
          if (index >= 1) {
            staplesForId.push([staplePointsForId[0], staplePointForId])
          }
          return staplesForId
        }, [] as Staple[])
      )
      .flat(1)

    return new StapledTransformation(transformationsById, staples, {
      georeferencedMaps,
      projectedGcpTransformers
    })
  }
}
