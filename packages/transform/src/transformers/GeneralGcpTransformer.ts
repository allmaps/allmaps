import { computeBbox } from '@allmaps/stdlib'

import { BaseGcpTransformer } from './BaseGcpTransformer.js'

import { BaseTransformation } from '../transformation-types/BaseTransformation.js'

import {
  generalGcpToPointForForward,
  generalGcpToPointForBackward
} from '../shared/conversion-functions.js'

import type {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Geometry,
  TypedLineString,
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
  GeneralGcpTransformerOptions,
  GeneralGcpTransformOptions
} from '../shared/types.js'

/**
 * Class for General Ground Control Point Transformers.
 *
 * A General GCP Transformer can transform input geometries between 'source' and 'destination' spaces.
 *
 * It does this using a transformation (of a certain type) built from
 * a set of General Ground Control Points (with coordinates in
 * source and destination space) and a transformation type.
 *
 * It has a method to transform 'Forward' (from source to destination space)
 * and 'Backward' (from destination to source space),
 *
 * The extending GeneralGcpTransform class handles the general case where:
 * - We read in Ground Control Points using the GeneralGcp type, with `source` and `destination` fields.
 * - We use the terms 'forward' and 'backward' for the two transformations.
 * - Both source and destination space are exected to be 2D cartesian spaces with the same handedness (x- and y-axes have the same orientations).
 * */
export class GeneralGcpTransformer extends BaseGcpTransformer {
  /**
   * Create a GeneralGcpTransformer
   *
   * @param generalGcps - An array of General Ground Control Points (GCPs)
   * @param type - The transformation type
   * @param partialGeneralGcpTransformerOptions - General GCP Transformer options
   */ constructor(
    generalGcps: GeneralGcp[],
    type: TransformationType = 'polynomial',
    partialGeneralGcpTransformerOptions?: Partial<GeneralGcpTransformerOptions>
  ) {
    super(generalGcps, type, partialGeneralGcpTransformerOptions)
  }

  public get generalGcps(): GeneralGcp[] {
    return this.generalGcpsInternal
  }

  /**
   * Get the forward transformation. Create if it doesn't exist yet.
   */
  getForwardTransformation(): BaseTransformation {
    return super.getForwardTransformationInternal()
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   */
  getBackwardTransformation(): BaseTransformation {
    return super.getBackwardTransformationInternal()
  }

  transformForward<P = Point>(
    sourcePoint: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformForward<P = Point>(
    sourceLineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformForward<P = Point>(
    sourcePolygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformForward<P = Point>(
    sourceMultiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformForward<P = Point>(
    sourceMultiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformForward<P = Point>(
    sourceMultiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformForward<P = Point>(
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
  transformForward<P = Point>(
    sourceGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    return super.transformForwardInternal(
      sourceGeometry,
      partialGeneralGcpTransformOptions,
      generalGcpToP
    )
  }

  transformBackward<P = Point>(
    destinationPoint: Point,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformBackward<P = Point>(
    destinationLineString: LineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformBackward<P = Point>(
    destinationPolygon: Polygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformBackward<P = Point>(
    destinationMultiPoint: MultiPoint,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformBackward<P = Point>(
    destinationMultiLineString: MultiLineString,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformBackward<P = Point>(
    destinationMultiPolygon: MultiPolygon,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformBackward<P = Point>(
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
  transformBackward<P = Point>(
    destinationGeometry: Geometry,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    return super.transformBackwardInternal(
      destinationGeometry,
      partialGeneralGcpTransformOptions,
      generalGcpToP
    )
  }

  protected getMinSourceDistanceFromResolution(): number {
    if (this.minSourceDistanceFromResolution === undefined) {
      this.minSourceDistanceFromResolution =
        this.getForwardTransformationResolution() ?? Infinity
    }
    return this.minSourceDistanceFromResolution
  }

  protected getMinDestinationDistanceFromResolution(): number {
    if (this.minDestinationDistanceFromResolution === undefined) {
      this.minDestinationDistanceFromResolution =
        this.getBackwardTransformationResolution() ?? Infinity
    }
    return this.minDestinationDistanceFromResolution
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
   *
   * Resolution returned in the length of the shortest piece, measured in source coordinates,
   * or undefined if no refinements were needed.
   *
   * @param sourceBbox - BBox in source space where the resolution is requested, or undefined to get this from the GCPs
   * @param partialGeneralGcpTransformOptions - General GCP Transform options to consider during the transformation
   * @returns Resolution of the forward transformation in source space
   */
  getForwardTransformationResolution(
    sourceBbox?: Bbox,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    sourceBbox =
      sourceBbox ??
      computeBbox(this.generalGcps.map((generalGcp) => generalGcp.source))
    return super.getForwardTransformationResolutionInternal(
      sourceBbox,
      partialGeneralGcpTransformOptions
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
   *
   * Resolution returned in the length of the shortest piece, measured in destination coordinates,
   * or undefined if no refinements were needed.
   *
   * @param destinationBbox - BBox in destination space where the resolution is requested, or undefined to get this from the GCPs
   * @param partialGeneralGcpTransformOptions - General GCP Transform options to consider during the transformation
   * @returns Resolution of the backward transformation in destination space
   */
  getBackwardTransformationResolution(
    destinationBbox?: Bbox,
    partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
  ): number | undefined {
    destinationBbox =
      destinationBbox ??
      computeBbox(this.generalGcps.map((generalGcp) => generalGcp.destination))
    return super.getBackwardTransformationResolutionInternal(
      destinationBbox,
      partialGeneralGcpTransformOptions
    )
  }
}
