import Matrix, { pseudoInverse } from 'ml-matrix'

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
import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point, Size } from '@allmaps/types'

import type {
  GeoreferencedMapWithRcps,
  Staple,
  StapledTransformationFromGeoreferencedMapOptions,
  StapledTransformationOptions,
  StaplePoint
} from './types'

const defaultStapledTransformationFromGeoreferencedMapOptions: StapledTransformationFromGeoreferencedMapOptions =
  {
    transformationType: 'polynomial',
    useMapTransformationTypes: false,
    cloneTransformations: true
  }

const defaultStapledTransformationOptions: StapledTransformationOptions = {
  ...defaultStapledTransformationFromGeoreferencedMapOptions,
  averageDestinationPoints: true
}

export class StapledTransformation {
  transformationsById: Map<string, BaseIndependentLinearWeightsTransformation>
  staples: Staple[]
  options?: StapledTransformationOptions

  staplePointsById: StaplePoint[][]

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
    options?: Partial<StapledTransformationOptions>
  ) {
    this.options = mergeOptions(defaultStapledTransformationOptions, options)
    this.transformationsById = transformationsById
    if (this.options.cloneTransformations) {
      const clonedTransformationsById = new Map<
        string,
        BaseIndependentLinearWeightsTransformation
      >()
      Array.from(this.transformationsById).forEach(([id, transformation]) =>
        clonedTransformationsById.set(
          id,
          transformation.deepClone() as typeof transformation
        )
      )
      this.transformationsById = clonedTransformationsById
    }
    this.staples = staples

    if (this.transformationsById.size === 0) {
      throw new Error('No transformations found.')
    }
    if (this.staples.length === 0) {
      throw new Error('No staples found.')
    }

    // Get staplePoints from staples.
    // When there were more then two staple points with the same transformationId
    // only keep one staplepoint per transformationId (=mapId).
    // (This happens when duo's where created, see fromGeoreferencedMap())
    this.staplePointsById = Object.values(
      groupBy(this.staples.flat(), (staplePoint) => staplePoint.id)
    ).map((staplePointsForId) =>
      staplePointsForId.filter(
        (staplePoint, index) =>
          staplePointsForId.findIndex(
            (s) => s.transformationId === staplePoint.transformationId
          ) === index
      )
    )

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
    // Create a coefs matrix from the transformations coefs matrices and the staples
    // as explained here: https://observablehq.com/d/0ff83cf201ebbf04

    // Create an empty coefs matrix of the right size
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

    // Add each transformation's coefs matrices as a block of a diagonal block-matrix
    // while keeping track of their locations
    let trailingCumulativeCoefsArrayMatrixSize: Size = [0, 0]
    for (const [
      transformationId,
      transformation
    ] of this.transformationsById.entries()) {
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        ...trailingCumulativeCoefsArrayMatrixSize,
        transformation.coefsArrayMatrix
      )
      this.trailingCumulativeCoefsArrayMatrixSizeById.set(
        transformationId,
        trailingCumulativeCoefsArrayMatrixSize
      )
      trailingCumulativeCoefsArrayMatrixSize = [
        trailingCumulativeCoefsArrayMatrixSize[0] +
          transformation.coefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize[1] +
          transformation.coefsArrayMatrixSize[1]
      ]
    }

    // Add each staple as a row with the source point coefs arrays
    // for both of it's transformations, in their corresponding column locations
    for (const staple of this.staples) {
      const transformation0 = this.transformationsById.get(
        staple[0].transformationId
      )
      const transformation1 = this.transformationsById.get(
        staple[1].transformationId
      )
      if (!transformation0) {
        throw new Error(
          `Transformation not found for transformationId ${staple[0].transformationId}.`
        )
      }
      if (!transformation1) {
        throw new Error(
          `Transformation not found for transformationId ${staple[1].transformationId}.`
        )
      }

      const stapleSourcePointCoefsArray0 =
        transformation0?.getSourcePointCoefsArray(staple[0].source)
      const stapleSourcePointCoefsArray1 =
        transformation1?.getSourcePointCoefsArray(staple[1].source)

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
          `trailingCumulativeCoefsArrayMatrixSize not found for transformationId ${staple[0].transformationId}.`
        )
      }
      if (!trailingCumulativeCoefsArrayMatrixSize1) {
        throw new Error(
          `trailingCumulativeCoefsArrayMatrixSize not found for transformationId ${staple[1].transformationId}.`
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

    // For each transformation, identify which part of the weights corresponds to it,
    // and set these weights on the transformation
    // such that they will be used when evaluating the transformation
    Array.from(this.transformationsById.entries()).forEach(
      ([transformationId, transformation]) => {
        const trailingCumulativeCoefsArrayMatrixSize =
          this.trailingCumulativeCoefsArrayMatrixSizeById.get(transformationId)
        if (!trailingCumulativeCoefsArrayMatrixSize) {
          throw new Error(
            `trailingCumulativeCoefsArrayMatrixSize not found for transformationId ${transformationId}.`
          )
        }

        const transformationIds = Array.from(this.transformationsById.keys())
        const nextId =
          transformationIds[transformationIds.indexOf(transformationId) + 1]
        const nextTrailingCumulativeCoefsArrayMatrixSize =
          this.trailingCumulativeCoefsArrayMatrixSizeById.get(nextId)
        // Note: the coefs array matrix's cols correspond to the weights arrays rows
        const startRows = trailingCumulativeCoefsArrayMatrixSize[1]
        const endRows = nextTrailingCumulativeCoefsArrayMatrixSize
          ? nextTrailingCumulativeCoefsArrayMatrixSize[1]
          : undefined

        const weightsArraysForId = sliceArrayMatrix(
          weightsArrays,
          0,
          startRows,
          2,
          endRows
        ) as [number[], number[]]
        this.weightsArraysById?.set(transformationId, weightsArraysForId)

        transformation.setWeightsArrays(weightsArraysForId)
      }
    )
  }

  evaluateFunction(newSourcePoint: Point, id: string): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    const transformation = this.transformationsById.get(id)
    if (!transformation) {
      throw new Error(`Transformation not found for transformationId ${id}.`)
    }

    return transformation.evaluateFunction(newSourcePoint)
  }

  evaluateAll() {
    // Evaluate every staplePoint
    this.staplePointsById.forEach((staplePointsForId) =>
      staplePointsForId.forEach((staplePoint) => {
        staplePoint.destination = this.evaluateFunction(
          staplePoint.source,
          staplePoint.transformationId
        )
      })
    )

    // Average out the destination values
    if (this.options?.averageDestinationPoints) {
      this.staplePointsById.forEach((staplePointsForId) => {
        const meanDestination = staplePointsForId
          .map((staplePoint) => staplePoint.destination as Point)
          .reduce(
            (a, c, _i, array) => {
              return [a[0] + c[0] / array.length, a[1] + c[1] / array.length]
            },
            [0, 0]
          )
        staplePointsForId.forEach((staplePoint) => {
          staplePoint.destination = meanDestination
        })
      })
    }
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
    const georeferencedMapsById = this.options?.georeferencedMapsById
    const projectedGcpTransformersById =
      this.options?.projectedGcpTransformersById

    if (!georeferencedMapsById || !projectedGcpTransformersById) {
      throw new Error(
        'No Georeferenced Maps or GCP Transformers found. Create a Stapler from GeoreferencedMaps to be able to recreate those.'
      )
    }

    this.evaluateAll()

    // For every evaluated staplePoint, add a GCP to it's respective Georeferenced Map.
    this.staplePointsById.map((staplePointsForId) =>
      staplePointsForId.forEach((staplePoint) => {
        Array.from(georeferencedMapsById.entries()).forEach(
          ([mapId, georeferencedMap]) => {
            const projectedGcpTransformer = projectedGcpTransformersById.get(
              staplePoint.transformationId
            )
            if (!projectedGcpTransformer) {
              throw new Error(
                `projectedGcpTransformer not found for transformationId ${staplePoint.transformationId}.`
              )
            }

            // Same process from {source, destination} to {resource, geo}
            // as in BaseGcpTransformer's transformPointForwardInternal()

            const transformerOptions =
              projectedGcpTransformer.getTransformerOptions()

            let source = transformerOptions.differentHandedness
              ? flipY(staplePoint.source)
              : staplePoint.source

            let destination = transformerOptions.postForward(
              staplePoint.destination as Point
            )
            destination =
              projectedGcpTransformer.projectionToLatLon(destination)

            if (mapId == staplePoint.transformationId) {
              georeferencedMap.gcps.push({
                resource: source,
                geo: destination as Point
              })
            }
          }
        )
      })
    )

    return Array.from(georeferencedMapsById.values())
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
   * @returns {StapledTransformation}
   */
  static fromGeoreferencedMaps(
    georeferencedMaps: GeoreferencedMapWithRcps[],
    options?: Partial<
      ProjectedGcpTransformerOptions &
        StapledTransformationFromGeoreferencedMapOptions
    >
  ): StapledTransformation {
    options = mergeOptions(
      defaultStapledTransformationFromGeoreferencedMapOptions,
      options
    )
    if (options?.useMapTransformationTypes) {
      delete options.transformationType
    }
    const georeferencedMapsById = new Map<string, GeoreferencedMap>()
    const projectedGcpTransformersById = new Map<
      string,
      ProjectedGcpTransformer
    >()
    const transformationsById = new Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >()
    const staplePoints: StaplePoint[] = []

    for (const georeferencedMap of georeferencedMaps) {
      // Neglect georeferenced maps with no staple points
      if (!georeferencedMap.rcps) {
        continue
      }

      const mapId = georeferencedMap.id
      if (!mapId) {
        throw new Error('Georeferenced map has no mapId.')
      }
      georeferencedMapsById.set(mapId, georeferencedMap)

      const projectedGcpTransformer =
        ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap, options)
      projectedGcpTransformersById.set(mapId, projectedGcpTransformer)

      const transformation = projectedGcpTransformer.getToGeoTransformation()
      if (
        !(transformation instanceof BaseIndependentLinearWeightsTransformation)
      ) {
        throw new Error(
          `Transformation type ${transformation.type} unsupported.`
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
      georeferencedMapsById,
      projectedGcpTransformersById
    })
  }
}
