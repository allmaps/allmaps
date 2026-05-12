import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  flipY,
  mergeOptions,
  computeBbox
} from '@allmaps/stdlib'

import { computeDistortionsFromPartialDerivatives } from '../shared/distortion.js'

import { BaseTransformation } from '../transformation-types/BaseTransformation.js'

import { Straight } from '../transformation-types/Straight.js'
import { Helmert } from '../transformation-types/Helmert.js'
import { Polynomial1 } from '../transformation-types/Polynomial1.js'
import { Polynomial2 } from '../transformation-types/Polynomial2.js'
import { Polynomial3 } from '../transformation-types/Polynomial3.js'
import { Projective } from '../transformation-types/Projective.js'
import { RBF } from '../transformation-types/RBF.js'

import { linearKernel, thinPlateKernel } from '../shared/kernel-functions.js'
import { euclideanNorm } from '../shared/norm-functions.js'

import {
  defaultGeneralGcpTransformerOptions,
  nonWarpingTransformationTypes,
  refinementOptionsFromBackwardTransformOptions,
  refinementOptionsFromForwardTransformOptions
} from '../shared/transform-functions.js'
import {
  refineLineString,
  refineRing,
  getSourceRefinementResolution
} from '../shared/refinement-functions.js'
import {
  generalGcpToPointForForward,
  generalGcpToPointForBackward,
  invertGeneralGcp
} from '../shared/conversion-functions.js'

import type {
  Point,
  LineString,
  Ring,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Geometry,
  TypedLineString,
  TypedRing,
  TypedPolygon,
  TypedMultiPoint,
  TypedMultiLineString,
  TypedMultiPolygon,
  TypedGeometry,
  Bbox
} from '@allmaps/types'

import type {
  GeneralGcp,
  GeneralGcpAndDistortions,
  TransformationType,
  GeneralGcpTransformOptions,
  GeneralGcpTransformerOptions,
  DistortionMeasure
} from '../shared/types.js'

/**
 * Abstract class for Ground Control Point Transformers.
 *
 * This class contains all logic to transform geometries
 * made available trough the GeneralGcpTransform and GcpTransform classes.
 *
 * The extending GeneralGcpTransform class handles the general case where:
 * - We read in Ground Control Points using the GeneralGcp type, with `source` and `destination` fields.
 * - We use the terms 'forward' and 'backward' for the two transformations.
 * - Both source and destination space are exected to be 2D cartesian spaces with the same handedness (x- and y-axes have the same orientations).
 *
 * The extending GcpTransform class handles the typical Allmaps case where:
 * - We read in Ground Control Points using the Gcp type, with `resource` and `geo` fields.
 * - We use the terms 'toGeo' for the 'forward' transformation and 'toResource' for the 'backward' transformation.
 * - The `differentHandedness` setting is `true` by default, since we expect the resource coordinates to identify pixels on an image, with origin in the top left and the y-axis pointing down.
 * */
export abstract class BaseGcpTransformer {
  protected generalGcpsInternal: GeneralGcp[]

  private sourcePointsInternal: Point[]
  private destinationPointsInternal: Point[]

  readonly type: TransformationType
  protected transformerOptions: GeneralGcpTransformerOptions

  protected forwardTransformation?: BaseTransformation
  protected backwardTransformation?: BaseTransformation

  /**
   * Create a BaseGcpTransformer
   *
   * @param generalGcps - An array of General Ground Control Points (GCPs)
   * @param type - The transformation type
   * @param partialGeneralGcpTransformerOptions - General GCP Transformer options
   */ constructor(
    generalGcps: GeneralGcp[],
    type: TransformationType = 'polynomial',
    partialGeneralGcpTransformerOptions?: Partial<GeneralGcpTransformerOptions>
  ) {
    this.transformerOptions = mergeOptions(
      defaultGeneralGcpTransformerOptions,
      partialGeneralGcpTransformerOptions
    )
    if (generalGcps.length === 0) {
      throw new Error('No control points')
    }
    this.generalGcpsInternal = generalGcps
    this.sourcePointsInternal = this.generalGcpsInternal.map((generalGcp) => {
      const source = this.transformerOptions.differentHandedness
        ? flipY(generalGcp.source)
        : generalGcp.source
      return this.transformerOptions.preForward(source)
    })
    this.destinationPointsInternal = this.generalGcpsInternal.map(
      (generalGcp) =>
        this.transformerOptions.preBackward(generalGcp.destination)
    )
    this.type = type
  }

  /**
   * Get the forward transformation. Create if it doesn't exist yet.
   */
  protected getForwardTransformationInternal(): BaseTransformation {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.createTransformation(
        this.sourcePointsInternal,
        this.destinationPointsInternal
      )
    }
    return this.forwardTransformation
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   */
  protected getBackwardTransformationInternal(): BaseTransformation {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.createTransformation(
        this.destinationPointsInternal,
        this.sourcePointsInternal
      )
    }
    return this.backwardTransformation
  }

  /**
   * Create the (forward or backward) transformation.
   *
   * Results in forward transformation if source and destination points are entered as such.
   * Results in backward if source points are entered for destination points and vice versa.
   *
   * Results in a transformation of this instance's transformation type.
   *
   * @param sourcePoints - source points
   * @param destinationPoints - destination points
   * @returns Transformation
   */
  private createTransformation(
    sourcePoints: Point[],
    destinationPoints: Point[]
  ): BaseTransformation {
    if (this.type === 'straight') {
      return new Straight(sourcePoints, destinationPoints)
    } else if (this.type === 'helmert') {
      return new Helmert(sourcePoints, destinationPoints)
    } else if (this.type === 'polynomial1' || this.type === 'polynomial') {
      return new Polynomial1(sourcePoints, destinationPoints)
    } else if (this.type === 'polynomial2') {
      return new Polynomial2(sourcePoints, destinationPoints)
    } else if (this.type === 'polynomial3') {
      return new Polynomial3(sourcePoints, destinationPoints)
    } else if (this.type === 'projective') {
      return new Projective(sourcePoints, destinationPoints)
    } else if (this.type === 'thinPlateSpline') {
      return new RBF(
        sourcePoints,
        destinationPoints,
        thinPlateKernel,
        euclideanNorm,
        'thinPlateSpline'
      )
    } else if (this.type === 'linear') {
      return new RBF(
        sourcePoints,
        destinationPoints,
        linearKernel,
        euclideanNorm,
        'linear'
      )
    } else {
      throw new Error(`Unsupported transformation type: ${this.type}`)
    }
  }

  protected transformForwardInternal<P = Point>(
    sourcePoint: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected transformForwardInternal<P = Point>(
    sourceLineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected transformForwardInternal<P = Point>(
    sourcePolygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected transformForwardInternal<P = Point>(
    sourceMultiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected transformForwardInternal<P = Point>(
    sourceMultiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected transformForwardInternal<P = Point>(
    sourceMultiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected transformForwardInternal<P = Point>(
    sourceGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry forward from source space to destination space
   *
   * @param sourceGeometry - Geometry to transform
   * @param partialGeneralGcpTransformOptions - General GCP Transform options
   * @param generalGcpToP - Return type function
   * @returns Forward transform of input geometry
   */
  protected transformForwardInternal<P = Point>(
    sourceGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    let transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    if (this.isNonWarping()) {
      transformOptions = mergeOptions(transformOptions, { maxDepth: 0 })
    }
    if (!transformOptions.isMultiGeometry) {
      if (isPoint(sourceGeometry)) {
        return this.transformPointForwardInternal(
          sourceGeometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isLineString(sourceGeometry)) {
        return this.transformLineStringForwardInternal(
          sourceGeometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isPolygon(sourceGeometry)) {
        return this.transformPolygonForwardInternal(
          sourceGeometry,
          transformOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (transformOptions) {
        transformOptions = mergeOptions(transformOptions, {
          isMultiGeometry: false
        }) // false for piecewise single geometries
      }
      if (isMultiPoint(sourceGeometry)) {
        return sourceGeometry.map((sourcePoint) =>
          this.transformPointForwardInternal(
            sourcePoint,
            transformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiLineString(sourceGeometry)) {
        return sourceGeometry.map((sourceLineString) =>
          this.transformLineStringForwardInternal(
            sourceLineString,
            transformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiPolygon(sourceGeometry)) {
        return sourceGeometry.map((sourcePolygon) =>
          this.transformPolygonForwardInternal(
            sourcePolygon,
            transformOptions,
            generalGcpToP
          )
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  protected transformBackwardInternal<P = Point>(
    destinationPoint: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected transformBackwardInternal<P = Point>(
    destinationLineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected transformBackwardInternal<P = Point>(
    destinationPolygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected transformBackwardInternal<P = Point>(
    destinationMultiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected transformBackwardInternal<P = Point>(
    destinationMultiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected transformBackwardInternal<P = Point>(
    destinationMultiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected transformBackwardInternal<P = Point>(
    destinationGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry backward from destination space to source space
   *
   * @param destinationGeometry - Geometry to transform
   * @param partialGeneralGcpTransformOptions - General GCP Transform options
   * @param generalGcpToP - Return type function
   * @returns Backward transform of input geometry
   */
  protected transformBackwardInternal<P = Point>(
    destinationGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    let transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    if (this.isNonWarping()) {
      transformOptions = mergeOptions(transformOptions, { maxDepth: 0 })
    }
    if (!transformOptions.isMultiGeometry) {
      if (isPoint(destinationGeometry)) {
        return this.transformPointBackwardInternal(
          destinationGeometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isLineString(destinationGeometry)) {
        return this.transformLineStringBackwardInternal(
          destinationGeometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isPolygon(destinationGeometry)) {
        return this.transformPolygonBackwardInternal(
          destinationGeometry,
          transformOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (transformOptions) {
        transformOptions = mergeOptions(transformOptions, {
          isMultiGeometry: false
        }) // false for piecewise single geometries
      }
      if (isMultiPoint(destinationGeometry)) {
        return destinationGeometry.map((destinationPoint) =>
          this.transformPointBackwardInternal(
            destinationPoint,
            transformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiLineString(destinationGeometry)) {
        return destinationGeometry.map((destinationLineString) =>
          this.transformLineStringBackwardInternal(
            destinationLineString,
            transformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiPolygon(destinationGeometry)) {
        return destinationGeometry.map((destinationPolygon) =>
          this.transformPolygonBackwardInternal(
            destinationPolygon,
            transformOptions,
            generalGcpToP
          )
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  // Handle specific geometries

  private transformPointForwardInternal<P = Point>(
    point: Point,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): P {
    const forwardTransformation = this.getForwardTransformationInternal()

    let source = this.transformerOptions.differentHandedness
      ? flipY(point)
      : point
    source = generalGcpTransformOptions.preForward(source)
    let destination = forwardTransformation.evaluateFunction(source)
    destination = generalGcpTransformOptions.postForward(destination)

    let partialDerivativeX = undefined
    let partialDerivativeY = undefined
    let distortions = new Map<DistortionMeasure, number>()

    if (generalGcpTransformOptions.distortionMeasures.length > 0) {
      partialDerivativeX =
        forwardTransformation.evaluatePartialDerivativeX(source)
      partialDerivativeY =
        forwardTransformation.evaluatePartialDerivativeY(source)

      distortions = computeDistortionsFromPartialDerivatives(
        generalGcpTransformOptions.distortionMeasures,
        partialDerivativeX,
        partialDerivativeY,
        generalGcpTransformOptions.referenceScale
      )
    }

    return generalGcpToP({
      source: point, // don't apply differentHandedness here, this is only internally.
      destination,

      partialDerivativeX,
      partialDerivativeY,
      distortions
    })
  }

  private transformPointBackwardInternal<P = Point>(
    point: Point,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): P {
    const backwardTransformation = this.getBackwardTransformationInternal()

    const destination = generalGcpTransformOptions.preBackward(point)
    let source = backwardTransformation.evaluateFunction(destination)
    // apply differentHandedness here again, so it has been applied twice in total and is undone now.
    source = generalGcpTransformOptions.postBackward(source)
    source = this.transformerOptions.differentHandedness
      ? flipY(source)
      : source

    let partialDerivativeX = undefined
    let partialDerivativeY = undefined
    let distortions = new Map<DistortionMeasure, number>()

    if (generalGcpTransformOptions.distortionMeasures.length > 0) {
      partialDerivativeX =
        backwardTransformation.evaluatePartialDerivativeX(destination)
      partialDerivativeX = this.transformerOptions.differentHandedness
        ? flipY(partialDerivativeX)
        : partialDerivativeX
      partialDerivativeY =
        backwardTransformation.evaluatePartialDerivativeY(destination)
      partialDerivativeY = this.transformerOptions.differentHandedness
        ? flipY(partialDerivativeY)
        : partialDerivativeY

      distortions = computeDistortionsFromPartialDerivatives(
        generalGcpTransformOptions.distortionMeasures,
        partialDerivativeX,
        partialDerivativeY,
        generalGcpTransformOptions.referenceScale
      )
    }

    return generalGcpToP({
      source,
      destination,

      partialDerivativeX,
      partialDerivativeY,
      distortions
    })
  }

  private transformLineStringForwardInternal<P>(
    lineString: LineString,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P> {
    return refineLineString(
      lineString,
      (p) => this.transformPointForwardInternal(p, generalGcpTransformOptions),
      refinementOptionsFromForwardTransformOptions(generalGcpTransformOptions)
    ).map((generalGcp) => generalGcpToP(generalGcp))
  }

  private transformLineStringBackwardInternal<P>(
    lineString: LineString,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P> {
    return refineLineString(
      lineString,
      (p) => this.transformPointBackwardInternal(p, generalGcpTransformOptions),
      refinementOptionsFromBackwardTransformOptions(generalGcpTransformOptions)
    ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
  }

  private transformRingForwardInternal<P>(
    ring: Ring,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedRing<P> {
    return refineRing(
      ring,
      (p) => this.transformPointForwardInternal(p, generalGcpTransformOptions),
      refinementOptionsFromForwardTransformOptions(generalGcpTransformOptions)
    ).map((generalGcp) => generalGcpToP(generalGcp))
  }

  private transformRingBackwardInternal<P>(
    ring: Ring,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedRing<P> {
    return refineRing(
      ring,
      (p) => this.transformPointBackwardInternal(p, generalGcpTransformOptions),
      refinementOptionsFromBackwardTransformOptions(generalGcpTransformOptions)
    ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
  }

  private transformPolygonForwardInternal<P>(
    polygon: Polygon,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P> {
    return polygon.map((ring) => {
      return this.transformRingForwardInternal(
        ring,
        generalGcpTransformOptions,
        generalGcpToP
      )
    })
  }

  private transformPolygonBackwardInternal<P>(
    polygon: Polygon,
    generalGcpTransformOptions: GeneralGcpTransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P> {
    return polygon.map((ring) => {
      return this.transformRingBackwardInternal(
        ring,
        generalGcpTransformOptions,
        generalGcpToP
      )
    })
  }

  protected isNonWarping(): boolean {
    return (
      this.transformerOptions.postForward ===
        this.transformerOptions.preBackward &&
      this.transformerOptions.postBackward ===
        this.transformerOptions.preForward &&
      nonWarpingTransformationTypes.includes(this.type)
    )
  }

  protected getForwardTransformationResolutionInternal(
    sourceBbox?: Bbox,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    sourceBbox = sourceBbox ?? computeBbox(this.sourcePointsInternal)
    return getSourceRefinementResolution(
      sourceBbox,
      (p) => this.transformPointForwardInternal(p, transformOptions),
      refinementOptionsFromForwardTransformOptions(transformOptions)
    )
  }

  protected getBackwardTransformationResolutionInternal(
    destinationBbox?: Bbox,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    destinationBbox =
      destinationBbox ?? computeBbox(this.destinationPointsInternal)
    return getSourceRefinementResolution(
      destinationBbox,
      (p) => this.transformPointBackwardInternal(p, transformOptions),
      refinementOptionsFromBackwardTransformOptions(transformOptions)
    )
  }
}
