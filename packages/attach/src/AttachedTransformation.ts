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
  BaseIndependentLinearWeightsTransformation,
  solveIndependentlyPseudoInverse
} from '@allmaps/transform'
import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions
} from '@allmaps/project'

import {
  deepCloneMap,
  resourceToSource,
  sourceDestinationToResourceGeo
} from './helpert-functions.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point, Size } from '@allmaps/types'

import type {
  Sp,
  Rcp,
  Attachment,
  AttachedTransformationFromGeoreferencedMapOptions,
  AttachedTransformationOptions,
  Scp
} from './types.js'

const defaultAttachedTransformationFromGeoreferencedMapOptions: AttachedTransformationFromGeoreferencedMapOptions =
  {
    transformationType: 'polynomial',
    useMapTransformationTypes: false,
    deepClone: true,
    evaluateAttachmentSourceControlPoints: true,
    evaluateSingleSourceControlPoints: false,
    evaluateGcps: false,
    removeExistingGcps: false
  }

const defaultAttachedTransformationOptions: AttachedTransformationOptions = {
  ...defaultAttachedTransformationFromGeoreferencedMapOptions,
  averageOut: true
}

export class AttachedTransformation {
  transformationsById: Map<string, BaseIndependentLinearWeightsTransformation>
  attachments: Attachment[]
  options?: AttachedTransformationOptions

  ScpsById: Scp[][]

  destinationPointsArrays: [number[], number[]]

  trailingCumulativeCoefsArrayMatrixSizeById: Map<string, [number, number]>
  coefsArrayMatrices: [number[][], number[][]]
  coefsArrayMatrix: number[][]
  coefsArrayMatricesSize: [[number, number], [number, number]]
  coefsArrayMatrixSize: [number, number]

  weightsArrays?: [number[], number[]]
  weightsArraysById?: Map<string, [number[], number[]]>

  /**
   * Create a Attached Transformation
   */ constructor(
    transformationsById: Map<
      string,
      BaseIndependentLinearWeightsTransformation
    >,
    attachments: Attachment[],
    options?: Partial<AttachedTransformationOptions>
  ) {
    this.options = mergeOptions(defaultAttachedTransformationOptions, options)
    this.transformationsById = transformationsById
    if (this.options.deepClone) {
      this.transformationsById = deepCloneMap(this.transformationsById)
      this.options.georeferencedMapsById = this.options.georeferencedMapsById
        ? deepCloneMap(this.options.georeferencedMapsById)
        : undefined
      this.options.projectedGcpTransformersById = this.options
        .projectedGcpTransformersById
        ? deepCloneMap(this.options.projectedGcpTransformersById)
        : undefined
    }
    this.attachments = attachments

    if (this.transformationsById.size === 0) {
      throw new Error('No transformations found.')
    }
    if (this.attachments.length === 0) {
      throw new Error('No attachment found.')
    }

    // Get Source Control Points from attachments.
    // When there were more then two Source Control Points with the same transformationId
    // and hence attachedment where created
    // for pairs of those Source Control Points (see fromGeoreferencedMap())
    // only keep one Source Control Point per transformationId (=mapId).
    this.ScpsById = Object.values(
      groupBy(this.attachments.flat(), (Scp) => Scp.id)
    ).map((scpsForId) =>
      scpsForId.filter(
        (scp, index) =>
          scpsForId.findIndex(
            (s) => s.transformationId === scp.transformationId
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
    destinationPointsArrays[0].push(...Array(this.attachments.length).fill(0))
    destinationPointsArrays[1].push(...Array(this.attachments.length).fill(0))

    return destinationPointsArrays
  }

  getCoefsArrayMatrices(): [number[][], number[][]] {
    const coefsArrayMatrix = this.getCoefsArrayMatrix()
    return [coefsArrayMatrix, coefsArrayMatrix]
  }

  getCoefsArrayMatrix(): number[][] {
    // Create a coefs matrix from the transformations coefs matrices
    // and the attachements
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
    size = [size[0] + this.attachments.length, size[1]]
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

    // Add each attachment as a row with the source point coefs arrays
    // for both of it's transformations, in their corresponding column locations
    for (const attachment of this.attachments) {
      const transformation0 = this.transformationsById.get(
        attachment[0].transformationId
      )
      const transformation1 = this.transformationsById.get(
        attachment[1].transformationId
      )
      if (!transformation0) {
        throw new Error(
          `Transformation not found for transformationId ${attachment[0].transformationId}.`
        )
      }
      if (!transformation1) {
        throw new Error(
          `Transformation not found for transformationId ${attachment[1].transformationId}.`
        )
      }

      const attachementSourcePointCoefsArray0 =
        transformation0?.getSourcePointCoefsArray(attachment[0].source)
      const attachementSourcePointCoefsArray1 =
        transformation1?.getSourcePointCoefsArray(attachment[1].source)

      const trailingCumulativeCoefsArrayMatrixSize0 =
        this.trailingCumulativeCoefsArrayMatrixSizeById.get(
          attachment[0].transformationId
        )
      const trailingCumulativeCoefsArrayMatrixSize1 =
        this.trailingCumulativeCoefsArrayMatrixSizeById.get(
          attachment[1].transformationId
        )
      if (!trailingCumulativeCoefsArrayMatrixSize0) {
        throw new Error(
          `trailingCumulativeCoefsArrayMatrixSize not found for transformationId ${attachment[0].transformationId}.`
        )
      }
      if (!trailingCumulativeCoefsArrayMatrixSize1) {
        throw new Error(
          `trailingCumulativeCoefsArrayMatrixSize not found for transformationId ${attachment[1].transformationId}.`
        )
      }

      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeCoefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize0[1],
        [attachementSourcePointCoefsArray0]
      )
      coefsArrayMatrix = pasteArrayMatrix(
        coefsArrayMatrix,
        trailingCumulativeCoefsArrayMatrixSize[0],
        trailingCumulativeCoefsArrayMatrixSize1[1],
        multiplyArrayMatrix([attachementSourcePointCoefsArray1], -1)
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
    this.weightsArrays = solveIndependentlyPseudoInverse(
      this.coefsArrayMatrix,
      this.destinationPointsArrays
    )

    this.processWeightsArrays()
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

  /**
   * Create Georeferenced Maps from this Attached Transformation.
   * This will solve the Attached Transformation,
   * evaluate all attachements (in all source control points),
   * infere GCPs from them,
   * and add them to the original Georeferenced Maps.
   *
   * This only works if this AttachedTransformation has been created from Georeferenced Maps.
   *
   * @returns {GeoreferencedMap[]}
   */
  toGeoreferencedMaps(): GeoreferencedMap[] {
    const georeferencedMapsById = this.options?.georeferencedMapsById
    const projectedGcpTransformersById =
      this.options?.projectedGcpTransformersById
    const extraSourcePoints = this.options?.extraSourcePoints
    const gcpSourcePoints = this.options?.gcpSourcePoints

    if (!georeferencedMapsById || !projectedGcpTransformersById) {
      throw new Error(
        'No Georeferenced Maps or GCP Transformers found. Create an Attached Transfromation from GeoreferencedMaps to be able to recreate those.'
      )
    }

    // Gather all points to evaluate: sourceControlPoints and extra sourcePoints
    const spForEvaluation: Sp[] = []
    if (gcpSourcePoints) {
      spForEvaluation.push(...gcpSourcePoints)
    }
    if (this.options?.evaluateAttachmentSourceControlPoints) {
      spForEvaluation.push(...this.ScpsById.flat())
    }
    if (extraSourcePoints) {
      spForEvaluation.push(...extraSourcePoints)
    }

    // Evaluate all points to evaluate
    spForEvaluation.forEach((sourcePoint) => {
      sourcePoint.destination = this.evaluateFunction(
        sourcePoint.source,
        sourcePoint.transformationId
      )
    })

    // Average out the destination values of the Source Control Points
    if (
      this.options?.averageOut &&
      this.options?.evaluateAttachmentSourceControlPoints
    ) {
      this.ScpsById.forEach((scpsForId) => {
        const meanDestination = scpsForId
          .map((scp) => scp.destination as Point)
          .reduce(
            (a, c, _i, array) => {
              return [a[0] + c[0] / array.length, a[1] + c[1] / array.length]
            },
            [0, 0]
          )
        scpsForId.forEach((scp) => {
          scp.destination = meanDestination
        })
      })
    }

    // Remove existing GCPs if specified or overwriting
    if (this.options?.removeExistingGcps || this.options?.evaluateGcps) {
      for (const georeferencedMap of georeferencedMapsById.values()) {
        georeferencedMap.gcps = []
      }
    }

    // For every evaluated point, add a GCP to it's respective Georeferenced Map.
    spForEvaluation.forEach((evaluationPoint) => {
      const projectedGcpTransformer = projectedGcpTransformersById.get(
        evaluationPoint.transformationId
      )
      if (!projectedGcpTransformer) {
        throw new Error(
          `projectedGcpTransformer not found for transformationId ${evaluationPoint.transformationId}.`
        )
      }

      const transformerOptions = projectedGcpTransformer.getTransformerOptions()

      const { resource, geo } = sourceDestinationToResourceGeo(
        evaluationPoint as { source: Point; destination: Point },
        transformerOptions,
        projectedGcpTransformer
      )

      Array.from(georeferencedMapsById.entries()).forEach(
        ([mapId, georeferencedMap]) => {
          if (mapId == evaluationPoint.transformationId) {
            georeferencedMap.gcps.push({
              resource,
              geo
            })
          }
        }
      )
    })

    return Array.from(georeferencedMapsById.values())
  }

  /**
   * Create a AttachedTransformation from Georeferenced Maps
   *
   * By default, a Projected GCP Transformer is created for each Georeferenced Map,
   * and from it a Thin Plate Spline transformation is created and passed to the AttachedTransformation.
   *
   * Use the options to specify another transformation type for all maps,
   * or specifically set the option 'useMapTransformationTypes' to true to use the type defined in the Georeferenced Map.
   *
   * @param georeferencedMaps - Georeferenced Maps
   * @param options - Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map
   * @returns {AttachedTransformation}
   */
  static fromGeoreferencedMaps(
    georeferencedMaps: GeoreferencedMap[],
    rcps: Rcp[],
    options?: Partial<
      ProjectedGcpTransformerOptions &
        AttachedTransformationFromGeoreferencedMapOptions
    >
  ): AttachedTransformation {
    options = mergeOptions(
      defaultAttachedTransformationFromGeoreferencedMapOptions,
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
    const scps: Scp[] = []
    const gcpSps: Sp[] = []
    const extraSps: Sp[] = []

    // Per GeoreferencedMap, set option objects and collect Source Control Points from Resource Control Points
    for (const georeferencedMap of georeferencedMaps) {
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

      const transformerOptions = projectedGcpTransformer.getTransformerOptions()

      rcps
        .filter((rcp) => rcp.mapId == mapId)
        .forEach((rcp) => {
          const { source } = resourceToSource(rcp, transformerOptions)
          scps.push({
            id: rcp.id,
            transformationId: mapId,
            source
          })
        })

      if (options.evaluateGcps) {
        georeferencedMap.gcps.forEach((gcp) => {
          const { source } = resourceToSource(gcp, transformerOptions)
          gcpSps.push({
            transformationId: mapId,
            source
          })
        })
      }
    }

    // From Source Control Points to Attachments
    //
    // Create attachments, by id.
    // When there are more then two source control points with the same id, create an attachment in pairs:
    // E.g.: if scp0, scp1, scp2 and scp3 have id 'foo'
    // and scp4 and scp5 have id 'bar', then create the following attachments:
    //
    // [scp0, scp1]
    // [scp0, scp2]
    // [scp0, scp3]
    //
    // [scp4, scp5]
    //
    const scpsById = Object.values(groupBy(scps, (scp) => scp.id))
    const attachments = scpsById
      .map((scpsForId) =>
        scpsForId.reduce((attachmentsForId, scpForId, index) => {
          if (index >= 1) {
            attachmentsForId.push([scpsForId[0], scpForId])
          }
          return attachmentsForId
        }, [] as Attachment[])
      )
      .flat(1)
    const singleScps = scpsById
      .filter((scpsForId) => scpsForId.length == 1)
      .flat(1)

    if (options.evaluateSingleSourceControlPoints) {
      extraSps.push(...singleScps)
    }

    options = mergeOptions(options, {
      georeferencedMapsById,
      projectedGcpTransformersById,
      gcpSourcePoints: gcpSps,
      extraSourcePoints: extraSps
    })

    return new AttachedTransformation(transformationsById, attachments, options)
  }
}
