import proj4 from 'proj4'

import {
  mergeOptions,
  mergeOptionsUnlessUndefined,
  mergePartialOptions
} from '@allmaps/stdlib'
import {
  GcpAndDistortions,
  GcpTransformer,
  GcpTransformerOptions,
  nonWarpingTransformationTypes,
  ProjectionFunction,
  TransformationType,
  TransformationTypeInputs
} from '@allmaps/transform'

import {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from '../shared/types.js'
import {
  defaultProjectedGcpTransformerOptions,
  isEqualProjection,
  lonLatProjection,
  projectedGcpTransformOptionsToGcpTransformOptions
} from '../shared/project-functions.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  Gcp,
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

/**
 * Class for Projected Ground Control Point Transformers.
 *
 * A Projected GCP Transformer can transform input geometries between 'resource' and 'projected geo' spaces.
 *
 * It does this using a transformation (of a certain type) built from
 * a set of Ground Control Points (with coordinates in
 * resource and geo space), a transformation type,
 * and an internal projection and projection.
 *
 * GCPs are expected in lon-lat 'EPSG:4326' (and are projected to the internal projection).
 * The default projection for the internal projection and projection is WebMercator 'EPSG:3857'.
 *
 * A postToGeo function is built from the internal projection to the projection (by default an identity projection).
 * A preToResource function is built from the projection to the internal projection (by default an identity projection).
 *
 * Like the GCP Transformer class it extends,
 * it has a method to transform 'toGeo' (from resource to projected geo space)
 * and 'toResource' (from projected geo to resource space),
 *
 * Like the GCP Transformer class it extends,
 * the `differentHandedness` setting is `true` by default,
 * since we expect the resource coordinates to identify pixels on an image,
 * with origin in the top left and the y-axis pointing down.
 *
 * @param internalProjection - the internal projection to which the GCPs (supplied in lon-lat 'EPSG:4326') are projected before building the transformation functions.
 * @param projection - the projection of the 'projected geo' space, in which the 'toProjectedGeo()' methods results its results.
 * @param internalProjectionToProjection - the postToGeo used to go from the internal projection to the projection.
 * @param projectionToInternalProjection - the preToResource function used to go from the projection to the internal projection.
 */
export class ProjectedGcpTransformer extends GcpTransformer {
  internalProjection: Projection
  projection: Projection

  internalProjectionToProjection: ProjectionFunction
  projectionToInternalProjection: ProjectionFunction
  lonLatToProjection: ProjectionFunction
  projectionToLonLat: ProjectionFunction

  /**
   * Create a ProjectedGcpTransformer
   *
   * @param gcps - An array of Ground Control Points (GCPs) in lon-lat 'EPSG:4326'
   * @param type - The transformation type
   * @param partialProjectedGcpTransformerOptions - Projected GCP Transformer options
   */ constructor(
    gcps: Gcp[],
    type: TransformationType = 'polynomial',
    partialProjectedGcpTransformerOptions?: Partial<ProjectedGcpTransformerOptions>
  ) {
    const projectedGcpTransformerOptions = mergeOptionsUnlessUndefined(
      defaultProjectedGcpTransformerOptions,
      partialProjectedGcpTransformerOptions
    )

    const internalProjectionToProjectionConverter = proj4(
      projectedGcpTransformerOptions.internalProjection.definition,
      projectedGcpTransformerOptions.projection.definition
    )
    const postToGeo = internalProjectionToProjectionConverter.forward
    const preToResource = internalProjectionToProjectionConverter.inverse

    const lonLatToProjectionConverter = proj4(
      lonLatProjection.definition,
      projectedGcpTransformerOptions.projection.definition
    )
    const lonLatToProjection = lonLatToProjectionConverter.forward
    const projectionToLonlat = lonLatToProjectionConverter.inverse

    const partialGcpTransformerOptions = {
      ...partialProjectedGcpTransformerOptions,
      postToGeo,
      preToResource
    }

    gcps = gcps
      // Allow incomplete GCPs, but filter them out
      .filter((gcp) => gcp.geo && gcp.resource)
      .map((gcp) => ({
        resource: gcp.resource,
        geo: lonLatToProjection(gcp.geo)
      }))

    super(gcps, type, partialGcpTransformerOptions)

    this.internalProjection = projectedGcpTransformerOptions.internalProjection
    this.projection = projectedGcpTransformerOptions.projection

    this.internalProjectionToProjection = postToGeo
    this.projectionToInternalProjection = preToResource
    this.lonLatToProjection = lonLatToProjection
    this.projectionToLonLat = projectionToLonlat
  }

  /**
   * Get GCPs as they were inputed to the GCP Transformer.
   *
   * For a Projected GCP Transformer, these are the GCPs in projected coordinates.
   */
  public get gcps(): Gcp[] {
    return super.gcps
  }

  /**
   * Get GCPs in interal projected coordinates.
   */
  public get lonlatGcps(): Gcp[] {
    return this.projectedGcps.map(({ resource, geo }) => ({
      resource,
      geo: this.projectionToLonLat(geo)
    }))
  }

  /**
   * Get GCPs in interal projected coordinates.
   */
  public get interalProjectedGcps(): Gcp[] {
    return this.projectedGcps.map(({ resource, geo }) => ({
      resource,
      geo: this.projectionToInternalProjection(geo)
    }))
  }

  /**
   * Get GCPs in projected coordinates.
   */
  public get projectedGcps(): Gcp[] {
    return this.gcps
  }

  transformToProjectedGeo<P = Point>(
    resourcePoint: Point,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToProjectedGeo<P = Point>(
    resourceLineString: LineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToProjectedGeo<P = Point>(
    resourcePolygon: Polygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToProjectedGeo<P = Point>(
    resourceMultiPoint: MultiPoint,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToProjectedGeo<P = Point>(
    resourceMultiLineString: MultiLineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToProjectedGeo<P = Point>(
    resourceMultiPoint: MultiPolygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToProjectedGeo<P = Point>(
    resourceGeometry: Geometry,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry from resource space to projected geo space
   *
   * @param resourceGeometry - Geometry to transform
   * @param partialProjectedGcpTransformOptions - Projected GCP Transform options
   * @param gcpToP - Return type function
   * @returns Input geometry transformed to projected geo space
   */
  transformToProjectedGeo<P = Point>(
    resourceGeometry: Geometry,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P> {
    const partialGcpTransformOptions =
      projectedGcpTransformOptionsToGcpTransformOptions(
        this.internalProjection,
        partialProjectedGcpTransformOptions
      )

    return super.transformToGeo(
      resourceGeometry,
      partialGcpTransformOptions,
      gcpToP
    )
  }

  transformToGeo<P = Point>(
    resourcePoint: Point,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToGeo<P = Point>(
    resourceLineString: LineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToGeo<P = Point>(
    resourcePolygon: Polygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToGeo<P = Point>(
    resourceMultiPoint: MultiPoint,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToGeo<P = Point>(
    resourceMultiLineString: MultiLineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToGeo<P = Point>(
    resourceMultiPoint: MultiPolygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToGeo<P = Point>(
    resourceGeometry: Geometry,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry from resource space to geo space
   *
   * @param resourceGeometry - Geometry to transform
   * @param partialProjectedGcpTransformOptions - Projected GCP Transform options
   * @param gcpToP - Return type function
   * @returns Input geometry transformed to projected geo space
   */
  transformToGeo<P = Point>(
    resourceGeometry: Geometry,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P> {
    return this.transformToProjectedGeo(
      resourceGeometry,
      mergePartialOptions(partialProjectedGcpTransformOptions, {
        projection: lonLatProjection
      }),
      gcpToP
    )
  }

  transformToResource<P = Point>(
    projectedGeoPoint: Point,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToResource<P = Point>(
    projectedGeoLineString: LineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToResource<P = Point>(
    projectedGeoPolygon: Polygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToResource<P = Point>(
    projectedGeoMultiPoint: MultiPoint,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToResource<P = Point>(
    projectedGeoMultiLineString: MultiLineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToResource<P = Point>(
    projectedGeoMultiPolygon: MultiPolygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToResource<P = Point>(
    projectedGeoGeometry: Geometry,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry from projected geo space to resource space
   *
   * @param projectedGeoGeometry - Geometry to transform
   * @param partialProjectedGcpTransformOptions - Projected GCP Transform options
   * @param gcpToP - Return type function
   * @returns Input geometry transformed to resource space
   */
  transformToResource<P>(
    projectedGeoGeometry: Geometry,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P> {
    const partialGcpTransformOptions =
      projectedGcpTransformOptionsToGcpTransformOptions(
        this.internalProjection,
        partialProjectedGcpTransformOptions
      )

    return super.transformToResource(
      projectedGeoGeometry,
      partialGcpTransformOptions,
      gcpToP
    )
  }

  protected isNonWarping(): boolean {
    return (
      isEqualProjection(this.projection, this.internalProjection) === true &&
      nonWarpingTransformationTypes.includes(this.type)
    )
  }

  /**
   * Get the resolution of the toProjectedGeo transformation in resource space, within a given bbox.
   *
   * This informs you in how fine the warping is, in resource space.
   * It can be useful e.g. to create a triangulation in resource space
   * that is fine enough for this warping or set the minSourceDistance options.
   *
   * It is obtained by transforming toProjectedGeo two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The toProjectedGeo transformation will refine these lines:
   * it will break them in small enough pieces to obtain a near continuous result.
   *
   * Resolution returned in the length of the shortest piece, measured in resource coordinates,
   * or undefined if no refinements were needed.
   *
   * @param resourceBbox - BBox in resource space where the resolution is requested, or undefined to get this from the GCPs
   * @param partialGcpTransformOptions - GCP Transform options to consider during the transformation
   * @returns Resolution of the toProjectedGeo transformation in resource space
   */
  getToProjectedGeoTransformationResolution(
    resourceBbox?: Bbox,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>
  ): number | undefined {
    const partialGcpTransformOptions =
      projectedGcpTransformOptionsToGcpTransformOptions(
        this.internalProjection,
        partialProjectedGcpTransformOptions
      )
    return super.getToGeoTransformationResolution(
      resourceBbox,
      partialGcpTransformOptions
    )
  }

  /**
   * Get the resolution of the toGeo transformation in resource space, within a given bbox.
   *
   * This informs you in how fine the warping is, in resource space.
   * It can be useful e.g. to create a triangulation in resource space
   * that is fine enough for this warping or set the minSourceDistance options.
   *
   * It is obtained by transforming toGeo two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The toGeo transformation will refine these lines:
   * it will break them in small enough pieces to obtain a near continuous result.
   *
   * Resolution returned in the length of the shortest piece, measured in resource coordinates,
   * or undefined if no refinements were needed.
   *
   * @param resourceBbox - BBox in resource space where the resolution is requested, or undefined to get this from the GCPs
   * @param partialGcpTransformOptions - GCP Transform options to consider during the transformation
   * @returns Resolution of the toGeo transformation in resource space
   */
  getToGeoTransformationResolution(
    resourceBbox?: Bbox,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>
  ): number | undefined {
    return this.getToProjectedGeoTransformationResolution(
      resourceBbox,
      mergePartialOptions(partialProjectedGcpTransformOptions, {
        projection: lonLatProjection
      })
    )
  }

  /**
   * Get the resolution of the toResource transformation in projected geo space, within a given bbox.
   *
   * This informs you in how fine the warping is, in projected geo space.
   * It can be useful e.g. to create a triangulation in projected geo space
   * that is fine enough for this warping or set the minDestionationDistance options.
   *
   * It is obtained by transforming toResource two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The toResource transformation will refine these lines:
   * it will break them in small enough pieces to obtain a near continuous result.
   *
   * Resolution returned in the length of the shortest piece, measured in internal projected geo coordinates,
   * or undefined if no refinements were needed.
   *
   * @param projectedGeoBbox - BBox in projected geo space where the resolution is requested, or undefined to get this from the GCPs
   * @param partialGcpTransformOptions - GCP Transform options to consider during the transformation
   * @returns Resolution of the toResource transformation in internal projected geo space
   */
  getToResourceTransformationResolution(
    projectedGeoBbox?: Bbox,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>
  ): number | undefined {
    const partialGcpTransformOptions =
      projectedGcpTransformOptionsToGcpTransformOptions(
        this.internalProjection,
        partialProjectedGcpTransformOptions
      )
    return super.getToResourceTransformationResolution(
      projectedGeoBbox,
      partialGcpTransformOptions
    )
  }

  /**
   * Create a Projected GCP Transformer from a Georeferenced Map
   *
   * @param georeferencedMap - A Georeferenced Map
   * @param options - Options, including Projected GCP Transformer Options, and a transformation type to overrule the type defined in the Georeferenced Map
   * @returns A Projected GCP Transformer
   */
  static fromGeoreferencedMap(
    georeferencedMap: GeoreferencedMap,
    options?: Partial<ProjectedGcpTransformerOptions & TransformationTypeInputs>
  ): ProjectedGcpTransformer {
    const georeferencedMapInput = {
      transformationType: georeferencedMap.transformation?.type,
      internalProjection: georeferencedMap.resourceCrs
    }
    options = mergeOptions(georeferencedMapInput, options)

    return new ProjectedGcpTransformer(
      georeferencedMap.gcps,
      options.transformationType,
      options
    )
  }

  /**
   * Set the projection.
   *
   * To transform 'toGeo' or 'toResource' to or from a different projection
   * than set on a transformer's construction (but using the same internal projection)
   * it's possible to specify the requested projection in the transform options.
   *
   * This way we circumvent a possibly expensive recomputation
   * of the toGeo and/or toResource transformations.
   *
   * To do this more systematically, it's possible to set
   * a projected gcp transformer's projection using this method.
   *
   * Combine this with a deep clone of the transformer instance
   * to keep the original transformer as well.
   *
   * @returns this
   */
  static setProjection(
    projectedTransformer: ProjectedGcpTransformer,
    projection: Projection
  ) {
    if (isEqualProjection(projection, projectedTransformer.projection)) {
      return projectedTransformer
    }

    const internalProjectionToProjectionConverter = proj4(
      projectedTransformer.internalProjection.definition,
      projection.definition
    )
    const postToGeo = internalProjectionToProjectionConverter.forward
    const preToResource = internalProjectionToProjectionConverter.inverse

    const lonLatToProjectionConverter = proj4(
      lonLatProjection.definition,
      projection.definition
    )
    const lonLatToProjection = lonLatToProjectionConverter.forward
    const projectionToLonLat = lonLatToProjectionConverter.inverse

    const partialGcpTransformerOptions: Partial<GcpTransformerOptions> = {
      postToGeo,
      preToResource
    }

    // Note: no need to change the GCPs!
    // They have already been converted to the internal projection
    // in the GCP Transformer constructor

    projectedTransformer.setTransformerOptions(partialGcpTransformerOptions)

    projectedTransformer.projection = projection

    projectedTransformer.internalProjectionToProjection = postToGeo
    projectedTransformer.projectionToInternalProjection = preToResource
    projectedTransformer.lonLatToProjection = lonLatToProjection
    projectedTransformer.projectionToLonLat = projectionToLonLat

    return projectedTransformer
  }
}
