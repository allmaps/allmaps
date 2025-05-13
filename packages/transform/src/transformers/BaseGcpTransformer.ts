import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  flipY,
  mergeOptions
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

import { thinPlateKernel } from '../shared/kernel-functions.js'
import { euclideanNorm } from '../shared/norm-functions.js'

import {
  defaultGeneralGcpTransformerOptions,
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
   *
   * If a transformation type is specified that differs from the transformer's type
   * the transformation is computed but not stored as a property.
   *
   * @param type - The transformation type, if different then the transformer's type.
   */
  protected getForwardTransformationInternal(
    type?: TransformationType
  ): BaseTransformation {
    const differentType = type && type != this.type

    let forwardTransformation
    if (this.forwardTransformation && !differentType) {
      forwardTransformation = this.forwardTransformation
    } else {
      forwardTransformation = this.createTransformation(
        this.sourcePointsInternal,
        this.destinationPointsInternal,
        type
      )
    }

    if (!differentType) {
      this.forwardTransformation = forwardTransformation
    }

    return forwardTransformation
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   *
   * If a transformation type is specified that differs from the transformer's type
   * the transformation is computed but not stored as a property.
   *
   * @param type - The transformation type, if different then the transformer's type.
   */
  protected getBackwardTransformationInternal(
    type?: TransformationType
  ): BaseTransformation {
    const differentType = type && type != this.type

    let backwardTransformation
    if (this.backwardTransformation && !differentType) {
      backwardTransformation = this.backwardTransformation
    } else {
      backwardTransformation = this.createTransformation(
        this.sourcePointsInternal,
        this.destinationPointsInternal,
        type
      )
    }

    if (!differentType) {
      this.backwardTransformation = backwardTransformation
    }

    return backwardTransformation
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
    destinationPoints: Point[],
    type?: TransformationType
  ): BaseTransformation {
    type = type || this.type

    if (type === 'straight') {
      return new Straight(sourcePoints, destinationPoints)
    } else if (type === 'helmert') {
      return new Helmert(sourcePoints, destinationPoints)
    } else if (type === 'polynomial1' || type === 'polynomial') {
      return new Polynomial1(sourcePoints, destinationPoints)
    } else if (type === 'polynomial2') {
      return new Polynomial2(sourcePoints, destinationPoints)
    } else if (type === 'polynomial3') {
      return new Polynomial3(sourcePoints, destinationPoints)
    } else if (type === 'projective') {
      return new Projective(sourcePoints, destinationPoints)
    } else if (type === 'thinPlateSpline') {
      return new RBF(
        sourcePoints,
        destinationPoints,
        thinPlateKernel,
        euclideanNorm
      )
    } else {
      throw new Error(`Unsupported transformation type: ${type}`)
    }
  }

  /**
   * Get the resolution of the forward transformation in source space, within a given bbox.
   *
   * This informs you in how fine the warping is, in source space.
   * It can be useful e.g. to create a triangulation in source space
   * that is fine enough for this warping.
   *
   * It is obtained by transforming forward two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The forward transformation will refine these lines:
   * it will break them in small enough pieces to obtain a near continuous result.
   * Returned in the length of the shortest piece, measured in source coordinates.
   *
   * @param sourceBbox - BBox in source space where the resolution is requested
   * @param partialGeneralGcpTransformOptions - General GCP Transform options to consider during the transformation
   * @returns Resolution of the forward transformation in source space
   */
  protected getForwardTransformationResolutionInternal(
    sourceBbox: Bbox,
    partialGeneralGcpTransformOptions: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    return getSourceRefinementResolution(
      sourceBbox,
      (p) => this.transformForwardInternal(p, transformOptions),
      refinementOptionsFromForwardTransformOptions(transformOptions)
    )
  }

  /**
   * Get the resolution of the backward transformation in destination space, within a given bbox.
   *
   * This informs you in how fine the warping is, in destination space.
   * It can be useful e.g. to create a triangulation in destination space
   * that is fine enough for this warping.
   *
   * It is obtained by transforming backward two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The backward transformation will refine these lines:
   * it will break them in small enough pieces to obtain a near continuous result.
   * Returned in the length of the shortest piece, measured in destination coordinates.
   *
   * @param destinationBbox - BBox in destination space where the resolution is requested
   * @param partialGeneralGcpTransformOptions - General GCP Transform options to consider during the transformation
   * @returns Resolution of the backward transformation in destination space
   */
  protected getBackwardTransformationResolutionInternal(
    destinationBbox: Bbox,
    partialGeneralGcpTransformOptions: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    return getSourceRefinementResolution(
      destinationBbox,
      (p) => this.transformBackwardInternal(p, transformOptions),
      refinementOptionsFromBackwardTransformOptions(transformOptions)
    )
  }

  protected transformForwardInternal<P = Point>(
    point: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected transformForwardInternal<P = Point>(
    lineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected transformForwardInternal<P = Point>(
    polygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected transformForwardInternal<P = Point>(
    multiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected transformForwardInternal<P = Point>(
    multiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected transformForwardInternal<P = Point>(
    multiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected transformForwardInternal<P = Point>(
    geometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry forward
   *
   * @param geometry - Geometry to transform
   * @param partialGeneralGcpTransformOptions - General GCP Transform options
   * @param generalGcpToP - Return type function
   * @returns Forward transform of input geometry
   */
  protected transformForwardInternal<P = Point>(
    geometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    if (!transformOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this.transformPointForwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return this.transformLineStringForwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this.transformPolygonForwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (partialGeneralGcpTransformOptions) {
        partialGeneralGcpTransformOptions.isMultiGeometry = false // false for piecewise single geometries
      }
      if (isMultiPoint(geometry)) {
        return geometry.map((element) =>
          this.transformForwardInternal(
            element,
            partialGeneralGcpTransformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this.transformForwardInternal(
            element,
            partialGeneralGcpTransformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this.transformForwardInternal(
            element,
            partialGeneralGcpTransformOptions,
            generalGcpToP
          )
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  protected transformBackwardInternal<P = Point>(
    point: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected transformBackwardInternal<P = Point>(
    lineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected transformBackwardInternal<P = Point>(
    polygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected transformBackwardInternal<P = Point>(
    multiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected transformBackwardInternal<P = Point>(
    multiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected transformBackwardInternal<P = Point>(
    multiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected transformBackwardInternal<P = Point>(
    geometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry backward
   *
   * @param geometry - Geometry to transform
   * @param partialGeneralGcpTransformOptions - General GCP Transform options
   * @param generalGcpToP - Return type function
   * @returns Backward transform of input geometry
   */
  protected transformBackwardInternal<P = Point>(
    geometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const transformOptions = mergeOptions(
      this.transformerOptions,
      partialGeneralGcpTransformOptions
    )
    if (!transformOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this.transformPointBackwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return this.transformLineStringBackwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this.transformPolygonBackwardInternal(
          geometry,
          transformOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (partialGeneralGcpTransformOptions) {
        partialGeneralGcpTransformOptions.isMultiGeometry = false // false for piecewise single geometries
      }
      if (isMultiPoint(geometry)) {
        return geometry.map((element) =>
          this.transformBackwardInternal(
            element,
            partialGeneralGcpTransformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this.transformBackwardInternal(
            element,
            partialGeneralGcpTransformOptions,
            generalGcpToP
          )
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this.transformBackwardInternal(
            element,
            partialGeneralGcpTransformOptions,
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

  /**
   * Deep clone a transformer.
   *
   * This can be useful when setting an options (e.g. a projection)
   * but wanting to keep a version of the the transformer with the previous option.
   *
   * @returns Deep cloned transformer
   */
  deepClone() {
    return Object.assign(Object.create(Object.getPrototypeOf(this)), this)
  }

  /**
   * Shallow clone a transformer.
   *
   * This can be useful when setting an options (e.g. a projection)
   * but wanting to keep a version of the the transformer with the previous option.
   *
   * @returns Shallow cloned transformer
   */
  shallowClone() {
    return Object.assign({}, this)
  }
}
