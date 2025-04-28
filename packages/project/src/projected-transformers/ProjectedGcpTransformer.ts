import proj4 from 'proj4'

import { mergeOptions, mergePartialOptions } from '@allmaps/stdlib'
import {
  GcpAndDistortions,
  GcpTransformer,
  GcpTransformerOptions,
  ProjectionFunction,
  TransformationType
} from '@allmaps/transform'

import {
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from '../shared/types.js'
import {
  defaultProjectedTransformerOptions,
  lonLatProjection
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
  TypedGeometry
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
 * @param projection - the projection of the 'projected geo' space, in which the 'toGeo()' methods results its results.
 * @param internalProjectionToProjection - the postToGeo used to go from the internal projection to the projection.
 * @param projectionToInternalProjection - the preToResource function used to go from the projection to the internal projection.
 */
export class ProjectedGcpTransformer extends GcpTransformer {
  internalProjection: Projection
  projection: Projection

  internalProjectionToProjection: ProjectionFunction
  projectionToInternalProjection: ProjectionFunction
  lonLatToProjection: ProjectionFunction
  projectionToLatLon: ProjectionFunction

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
    const projectedGcpTransformerOptions = mergeOptions(
      defaultProjectedTransformerOptions,
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
    const projectionToLatLon = lonLatToProjectionConverter.inverse

    const partialGcpTransformerOptions = {
      ...partialProjectedGcpTransformerOptions,
      postToGeo,
      preToResource
    }

    gcps = gcps.map((gcp) => {
      return {
        resource: gcp.resource,
        geo: lonLatToProjection(gcp.geo)
      }
    })

    super(gcps, type, partialGcpTransformerOptions)

    this.internalProjection = projectedGcpTransformerOptions.internalProjection
    this.projection = projectedGcpTransformerOptions.projection

    this.internalProjectionToProjection = postToGeo
    this.projectionToInternalProjection = preToResource
    this.lonLatToProjection = lonLatToProjection
    this.projectionToLatLon = projectionToLatLon
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
   * a projected gcp transformer's projection using this method
   *
   * Combine this with a deep clone of the transformer instance
   * to keep the original transformer as well.
   *
   * @returns this
   */
  setProjection(projection: Projection) {
    if (projection == this.projection) {
      return this
    }

    const internalProjectionToProjectionConverter = proj4(
      this.internalProjection.definition,
      projection.definition
    )
    const postToGeo = internalProjectionToProjectionConverter.forward
    const preToResource = internalProjectionToProjectionConverter.inverse

    const lonLatToProjectionConverter = proj4(
      lonLatProjection.definition,
      projection.definition
    )
    const lonLatToProjection = lonLatToProjectionConverter.forward
    const projectionToLatLon = lonLatToProjectionConverter.inverse

    const partialGcpTransformerOptions: Partial<GcpTransformerOptions> = {
      postToGeo,
      preToResource
    }

    // Note: no need to change the GCPs!
    // They have already been converted to the internal projection
    // in the GCP Transformer constructor

    this._setTransformerOptions(partialGcpTransformerOptions)

    this.projection = projection

    this.internalProjectionToProjection = postToGeo
    this.projectionToInternalProjection = preToResource
    this.lonLatToProjection = lonLatToProjection
    this.projectionToLatLon = projectionToLatLon

    return this
  }

  transformToGeo<P = Point>(
    point: Point,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToGeo<P = Point>(
    lineString: LineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToGeo<P = Point>(
    polygon: Polygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToGeo<P = Point>(
    multiPoint: MultiPoint,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToGeo<P = Point>(
    multiLineString: MultiLineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToGeo<P = Point>(
    multiPoint: MultiPolygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToGeo<P = Point>(
    geometry: Geometry,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry to projected geo space
   *
   * @param geometry - Geometry to transform
   * @param partialProjectedGcpTransformOptions - Projected GCP Transform options
   * @param gcpToP - Return type function
   * @returns Input geometry transformed to projected geo space
   */
  transformToGeo<P = Point>(
    geometry: Geometry,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P> {
    const projection = partialProjectedGcpTransformOptions?.projection

    let partialGcpTransformOptions = partialProjectedGcpTransformOptions

    if (projection) {
      const internalProjectionToProjectionConverter = proj4(
        this.internalProjection.definition,
        projection.definition
      )
      const postToGeo = internalProjectionToProjectionConverter.forward
      const preToResource = internalProjectionToProjectionConverter.inverse

      partialGcpTransformOptions = mergePartialOptions(
        partialGcpTransformOptions,
        {
          postToGeo,
          preToResource
        }
      )
    }

    return super.transformToGeo(geometry, partialGcpTransformOptions, gcpToP)
  }

  transformToResource<P = Point>(
    point: Point,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToResource<P = Point>(
    lineString: LineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToResource<P = Point>(
    polygon: Polygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToResource<P = Point>(
    multiPoint: MultiPoint,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToResource<P = Point>(
    multiLineString: MultiLineString,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToResource<P = Point>(
    multiPolygon: MultiPolygon,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToResource<P = Point>(
    geometry: Geometry,
    partialGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry to resource space
   *
   * @param geometry - Geometry to transform
   * @param partialProjectedGcpTransformOptions - Projected GCP Transform options
   * @param gcpToP - Return type function
   * @returns Input geometry transformed to resource space
   */
  transformToResource<P>(
    geometry: Geometry,
    partialProjectedGcpTransformOptions?: Partial<ProjectedGcpTransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P> {
    const projection = partialProjectedGcpTransformOptions?.projection

    let partialGcpTransformOptions = partialProjectedGcpTransformOptions

    if (projection) {
      const internalProjectionToProjectionConverter = proj4(
        this.internalProjection.definition,
        projection.definition
      )
      const postToGeo = internalProjectionToProjectionConverter.forward
      const preToResource = internalProjectionToProjectionConverter.inverse

      partialGcpTransformOptions = mergePartialOptions(
        partialGcpTransformOptions,
        {
          postToGeo,
          preToResource
        }
      )
    }

    return super.transformToResource(
      geometry,
      partialGcpTransformOptions,
      gcpToP
    )
  }

  /**
   * Create a Projected GCP Transformer from a Georeferenced Map
   *
   * @param georeferencedMap - A Georeferenced Map
   * @param partialProjectedGcpTransformerOptions - Projected GCP Transformer Options
   * @returns A Projected GCP Transformer
   */
  static fromGeoreferencedMap(
    georeferencedMap: GeoreferencedMap,
    partialProjectedGcpTransformerOptions?: Partial<ProjectedGcpTransformerOptions>
  ): ProjectedGcpTransformer {
    // TODO: read and pass projection from georeferencedMap
    // TODO: add to readme, similar to transform readme

    return new ProjectedGcpTransformer(
      georeferencedMap.gcps,
      georeferencedMap.transformation?.type,
      partialProjectedGcpTransformerOptions
    )
  }
}
