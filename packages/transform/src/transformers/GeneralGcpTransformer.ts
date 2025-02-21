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
  TransformerOptions,
  TransformOptions
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
   * @param partialTransformerOptions - Transformer options
   */ constructor(
    generalGcps: GeneralGcp[],
    type: TransformationType = 'polynomial',
    partialTransformerOptions?: Partial<TransformerOptions>
  ) {
    super(generalGcps, type, partialTransformerOptions)
  }

  public get generalGcps(): GeneralGcp[] {
    return this._generalGcps
  }

  /**
   * Get the forward transformation. Create if it doesn't exist yet.
   */
  getForwardTransformation(): BaseTransformation {
    return super._getForwardTransformation()
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   */
  getBackwardTransformation(): BaseTransformation {
    return super._getBackwardTransformation()
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
   * @param partialTransformOptions - extra parameters to consider
   * @returns
   */
  getForwardTransformationResolution(
    sourceBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    return super._getForwardTransformationResolution(
      sourceBbox,
      partialTransformOptions
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
   * @param partialTransformOptions - extra parameters to consider
   * @returns
   */
  getBackwardTransformationResolution(
    destinationBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    return super._getBackwardTransformationResolution(
      destinationBbox,
      partialTransformOptions
    )
  }

  transformForward<P = Point>(
    point: Point,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformForward<P = Point>(
    lineString: LineString,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformForward<P = Point>(
    polygon: Polygon,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformForward<P = Point>(
    multiPoint: MultiPoint,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformForward<P = Point>(
    multiLineString: MultiLineString,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformForward<P = Point>(
    multiPolygon: MultiPolygon,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformForward<P = Point>(
    geometry: Geometry,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry forward
   *
   * @param geometry - Geometry to transform
   * @param partialTransformOptions - Transform options
   * @param generalGcpToP - Return type function
   * @returns Forward transform of input geometry
   */
  transformForward<P = Point>(
    geometry: Geometry,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForForward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    return super._transformForward(
      geometry,
      partialTransformOptions,
      generalGcpToP
    )
  }

  transformBackward<P = Point>(
    point: Point,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformBackward<P = Point>(
    lineString: LineString,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformBackward<P = Point>(
    polygon: Polygon,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformBackward<P = Point>(
    multiPoint: MultiPoint,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformBackward<P = Point>(
    multiLineString: MultiLineString,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformBackward<P = Point>(
    multiPolygon: MultiPolygon,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformBackward<P = Point>(
    geometry: Geometry,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry backward
   *
   * @param geometry - Geometry to transform
   * @param partialTransformOptions - Transform options
   * @param generalGcpToP - Return type function
   * @returns Backward transform of input geometry
   */
  transformBackward<P = Point>(
    geometry: Geometry,
    partialTransformOptions?: Partial<TransformOptions>,
    generalGcpToP: (
      generalGcp: GeneralGcpAndDistortions
    ) => P = generalGcpToPointForBackward as (
      generalGcp: GeneralGcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    return super._transformBackward(
      geometry,
      partialTransformOptions,
      generalGcpToP
    )
  }
}
