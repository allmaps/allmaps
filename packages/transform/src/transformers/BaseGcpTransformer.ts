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
import { Polynomial } from '../transformation-types/Polynomial.js'
import { Projective } from '../transformation-types/Projective.js'
import { RBF } from '../transformation-types/RBF.js'

import { thinPlateKernel } from '../shared/kernel-functions.js'
import { euclideanNorm } from '../shared/norm-functions.js'

import {
  defaultTransformOptions,
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
  TransformOptions,
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
  protected _generalGcps: GeneralGcp[]
  private _sourcePoints: Point[]
  private _destinationPoints: Point[]
  readonly type: TransformationType
  readonly options: TransformOptions

  protected forwardTransformation?: BaseTransformation
  protected backwardTransformation?: BaseTransformation

  /**
   * Create a BaseGcpTransformer
   *
   * @param generalGcps - An array of General Ground Control Points (GCPs)
   * @param type - The transformation type
   * @param options - Partial transform options
   */ constructor(
    generalGcps: GeneralGcp[],
    type: TransformationType = 'polynomial',
    options?: Partial<TransformOptions>
  ) {
    this.options = mergeOptions(defaultTransformOptions, options)
    if (generalGcps.length === 0) {
      throw new Error('No control points')
    }
    this._generalGcps = generalGcps
    this._sourcePoints = this._generalGcps.map((gcp) => gcp.source)
    this._destinationPoints = this._generalGcps.map((gcp) => gcp.destination)
    this.type = type
  }

  /**
   * Get the forward transformation. Create if it doesn't exist yet.
   */
  protected _getForwardTransformation(): BaseTransformation {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.computeTransformation(
        this._sourcePoints.map((point) =>
          this.options?.differentHandedness ? flipY(point) : point
        ),
        this._destinationPoints
      )
    }
    return this.forwardTransformation
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   */
  protected _getBackwardTransformation(): BaseTransformation {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.computeTransformation(
        this._destinationPoints,
        this._sourcePoints.map((point) =>
          this.options?.differentHandedness ? flipY(point) : point
        )
      )
    }
    return this.backwardTransformation
  }

  /**
   * Compute the (forward or backward) transformation.
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
  private computeTransformation(
    sourcePoints: Point[],
    destinationPoints: Point[]
  ): BaseTransformation {
    if (this.type === 'straight') {
      return new Straight(sourcePoints, destinationPoints)
    } else if (this.type === 'helmert') {
      return new Helmert(sourcePoints, destinationPoints)
    } else if (this.type === 'polynomial1' || this.type === 'polynomial') {
      return new Polynomial(sourcePoints, destinationPoints)
    } else if (this.type === 'polynomial2') {
      return new Polynomial(sourcePoints, destinationPoints, 2)
    } else if (this.type === 'polynomial3') {
      return new Polynomial(sourcePoints, destinationPoints, 3)
    } else if (this.type === 'projective') {
      return new Projective(sourcePoints, destinationPoints)
    } else if (this.type === 'thinPlateSpline') {
      return new RBF(
        sourcePoints,
        destinationPoints,
        thinPlateKernel,
        euclideanNorm
      )
    } else {
      throw new Error(`Unsupported transformation type: ${this.type}`)
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
   * it will break then in small enough pieces to obtain a near continous result.
   * Returned in the lenght of the shortest piece, measured in source coordinates.
   *
   * @param sourceBbox - BBox in source space where the resolution is requested
   * @param  partialTransformOptions - extra parameters to consider
   * @returns
   */
  protected _getForwardTransformationResolution(
    sourceBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(this.options, partialTransformOptions)
    return getSourceRefinementResolution(
      sourceBbox,
      (p) => this._transformForward(p, transformOptions),
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
   * it will break then in small enough pieces to obtain a near continous result.
   * Returned in the lenght of the shortest piece, measured in destination coordinates.
   *
   * @param destinationBbox - BBox in destination space where the resolution is requested
   * @param  partialTransformOptions - extra parameters to consider
   * @returns
   */
  protected _getBackwardTransformationResolution(
    destinationBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    const transformOptions = mergeOptions(this.options, partialTransformOptions)
    return getSourceRefinementResolution(
      destinationBbox,
      (p) => this._transformBackward(p, transformOptions),
      refinementOptionsFromBackwardTransformOptions(transformOptions)
    )
  }

  protected _transformForward<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected _transformForward<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected _transformForward<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected _transformForward<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected _transformForward<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected _transformForward<P = Point>(
    multiPolygon: MultiPolygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected _transformForward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry forward
   *
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @param generalGcpToP - Return type function
   * @returns Forward transform of input geometry
   */
  protected _transformForward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this._transformPointForward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return this._transformLineStringForward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this._transformPolygonForward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (options) {
        options.isMultiGeometry = false // false for piecewise single geometries
      }
      if (isMultiPoint(geometry)) {
        return geometry.map((element) =>
          this._transformForward(element, options, generalGcpToP)
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this._transformForward(element, options, generalGcpToP)
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this._transformForward(element, options, generalGcpToP)
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  protected _transformBackward<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  protected _transformBackward<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  protected _transformBackward<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  protected _transformBackward<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  protected _transformBackward<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  protected _transformBackward<P = Point>(
    multiPolygon: MultiPolygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  protected _transformBackward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry backward
   *
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @param generalGcpToP - Return type function
   * @returns Backward transform of input geometry
   */
  protected _transformBackward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this._transformPointBackward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return this._transformLineStringBackward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this._transformPolygonBackward(
          geometry,
          mergedOptions,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    } else {
      if (options) {
        options.isMultiGeometry = false // false for piecewise single geometries
      }
      if (isMultiPoint(geometry)) {
        return geometry.map((element) =>
          this._transformBackward(element, options, generalGcpToP)
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this._transformBackward(element, options, generalGcpToP)
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this._transformBackward(element, options, generalGcpToP)
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  // Handle specific geometries

  private _transformPointForward<P>(
    point: Point,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): P {
    const forwardTransformation = this._getForwardTransformation()

    const source = transformOptions.differentHandedness ? flipY(point) : point
    const destination = forwardTransformation.evaluateFunction(source)

    let partialDerivativeX = undefined
    let partialDerivativeY = undefined
    let distortions = new Map<DistortionMeasure, number>()

    if (transformOptions.distortionMeasures.length > 0) {
      partialDerivativeX =
        forwardTransformation.evaluatePartialDerivativeX(source)
      partialDerivativeY =
        forwardTransformation.evaluatePartialDerivativeY(source)

      distortions = computeDistortionsFromPartialDerivatives(
        transformOptions.distortionMeasures,
        partialDerivativeX,
        partialDerivativeY,
        transformOptions.referenceScale
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

  private _transformPointBackward<P>(
    point: Point,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): P {
    const backwardTransformation = this._getBackwardTransformation()

    const destination = point
    let source = backwardTransformation.evaluateFunction(destination)
    // apply differentHandedness here again, so it has been applied twice in total and is undone now.
    source = transformOptions.differentHandedness ? flipY(source) : source

    let partialDerivativeX = undefined
    let partialDerivativeY = undefined
    let distortions = new Map<DistortionMeasure, number>()

    if (transformOptions.distortionMeasures.length > 0) {
      partialDerivativeX =
        backwardTransformation.evaluatePartialDerivativeX(destination)
      partialDerivativeX = transformOptions.differentHandedness
        ? flipY(partialDerivativeX)
        : partialDerivativeX
      partialDerivativeY =
        backwardTransformation.evaluatePartialDerivativeY(destination)
      partialDerivativeY = transformOptions.differentHandedness
        ? flipY(partialDerivativeY)
        : partialDerivativeY

      distortions = computeDistortionsFromPartialDerivatives(
        transformOptions.distortionMeasures,
        partialDerivativeX,
        partialDerivativeY,
        transformOptions.referenceScale
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

  private _transformLineStringForward<P>(
    lineString: LineString,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P> {
    return refineLineString(
      lineString,
      (p) => this._transformForward(p),
      refinementOptionsFromForwardTransformOptions(transformOptions)
    ).map((generalGcp) => generalGcpToP(generalGcp))
  }

  private _transformLineStringBackward<P>(
    lineString: LineString,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P> {
    return refineLineString(
      lineString,
      (p) => this._transformBackward(p),
      refinementOptionsFromBackwardTransformOptions(transformOptions)
    ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
  }

  private _transformRingForward<P>(
    ring: Ring,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedRing<P> {
    return refineRing(
      ring,
      (p) => this._transformForward(p),
      refinementOptionsFromForwardTransformOptions(transformOptions)
    ).map((generalGcp) => generalGcpToP(generalGcp))
  }

  private _transformRingBackward<P>(
    ring: Ring,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedRing<P> {
    return refineRing(
      ring,
      (p) => this._transformBackward(p),
      refinementOptionsFromBackwardTransformOptions(transformOptions)
    ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
  }

  private _transformPolygonForward<P>(
    polygon: Polygon,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P> {
    return polygon.map((ring) => {
      return this._transformRingForward(ring, transformOptions, generalGcpToP)
    })
  }

  private _transformPolygonBackward<P>(
    polygon: Polygon,
    transformOptions: TransformOptions,
    generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P> {
    return polygon.map((ring) => {
      return this._transformRingBackward(ring, transformOptions, generalGcpToP)
    })
  }
}
