import {
  geojsonGeometryToGeometry,
  geojsonGeometriesToGeojsonFeatureCollection,
  geojsonFeatureCollectionToGeojsonGeometries,
  geometryToGeojsonGeometry,
  geometryToSvgGeometry,
  stringToSvgGeometriesGenerator,
  svgGeometriesToSvgString,
  svgGeometryToGeometry,
  mergePartialOptions
} from '@allmaps/stdlib'

import { BaseGcpTransformer } from './BaseGcpTransformer.js'

import { BaseTransformation } from '../transformation-types/BaseTransformation.js'

import {
  gcpToGeneralGcp,
  gcpToPointForToGeo,
  gcpToPointForToResource,
  generalGcpToGcp
} from '../shared/conversion-functions.js'

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
  GeojsonGeometry,
  GeojsonFeatureCollection,
  SvgGeometry,
  SvgCircle,
  SvgLine,
  SvgPolyLine,
  SvgRect,
  SvgPolygon,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  Bbox
} from '@allmaps/types'

import type {
  GeneralGcpAndDistortions,
  GcpAndDistortions,
  TransformationType,
  TransformOptions
} from '../shared/types.js'

/**
 * Class for Ground Control Point Transformers.
 *
 * A GCP Transformer can transform input geometries between 'resource' and 'geo' spaces.
 *
 * It does this using a transformation (of a certain type) built from
 * a set of Ground Control Points (with coordinates in
 * resource and geo space) and a transformation type.
 *
 * It has a method to transform 'toGeo' (from resource to geo space)
 * and 'toResource' (from geo to resource space),
 *
 * This class differs from the GeneralGcpTransformer class in that
 * it specifically handles the typical Allmaps case where:
 * - We read in Ground Control Points using the Gcp type, with `resource` and `geo` fields.
 * - We use the terms 'toGeo' for the 'forward' transformation and 'toResource' for the 'backward' transformation.
 * - The `differentHandedness` setting is `true` by default, since we expect the resource coordinates to identify pixels on an image, with origin in the top left and the y-axis pointing down.
 * */
export class GcpTransformer extends BaseGcpTransformer {
  /**
   * Create a GcpTransformer
   *
   * @param gcps - An array of Ground Control Points (GCPs)
   * @param type - The transformation type
   * @param options - Partial transform options
   */ constructor(
    gcps: Gcp[],
    type: TransformationType = 'polynomial',
    options?: Partial<TransformOptions>
  ) {
    const generalGcps = gcps.map(gcpToGeneralGcp)
    options = mergePartialOptions({ differentHandedness: true }, options)
    super(generalGcps, type, options)
  }

  public get gcps(): Gcp[] {
    return this._generalGcps.map(generalGcpToGcp)
  }

  /**
   * Get the forward transformation. Create if it doesn't exist yet.
   */
  getToGeoTransformation(): BaseTransformation {
    return super._getForwardTransformation()
  }

  /**
   * Get the backward transformation. Create if it doesn't exist yet.
   */
  getToResourceTransformation(): BaseTransformation {
    return super._getBackwardTransformation()
  }

  /**
   * Get the resolution of the toGeo transformation in resource space, within a given bbox.
   *
   * This informs you in how fine the warping is, in resource space.
   * It can be useful e.g. to create a triangulation in resource space
   * that is fine enough for this warping.
   *
   * It is obtained by transforming toGeo two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The toGeo transformation will refine these lines:
   * it will break then in small enough pieces to obtain a near continous result.
   * Returned in the lenght of the shortest piece, measured in resource coordinates.
   *
   * @param resourceBbox - BBox in resource space where the resolution is requested
   * @param  partialTransformOptions - extra parameters to consider
   * @returns
   */
  getToGeoTransformationResolution(
    resourceBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    return super._getForwardTransformationResolution(
      resourceBbox,
      partialTransformOptions
    )
  }

  /**
   * Get the resolution of the toResource transformation in geo space, within a given bbox.
   *
   * This informs you in how fine the warping is, in geo space.
   * It can be useful e.g. to create a triangulation in geo space
   * that is fine enough for this warping.
   *
   * It is obtained by transforming toResource two linestring,
   * namely the horizontal and vertical midlines of the given bbox.
   * The toResource transformation will refine these lines:
   * it will break then in small enough pieces to obtain a near continous result.
   * Returned in the lenght of the shortest piece, measured in geo coordinates.
   *
   * @param geoBbox - BBox in geo space where the resolution is requested
   * @param  partialTransformOptions - extra parameters to consider
   * @returns
   */
  getToResourceTransformationResolution(
    geoBbox: Bbox,
    partialTransformOptions: Partial<TransformOptions>
  ): number | undefined {
    return super._getBackwardTransformationResolution(
      geoBbox,
      partialTransformOptions
    )
  }

  transformToGeo<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToGeo<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToGeo<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToGeo<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToGeo<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToGeo<P = Point>(
    multiPoint: MultiPolygon,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToGeo<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry to geo space
   *
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @param generalGcpToP - Return type function
   * @returns Input geometry transformed to geo space
   */
  transformToGeo<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP: (gcp: GcpAndDistortions) => P = gcpToPointForToGeo as (
      gcp: GcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const generalGcpToP = (generalGcp: GeneralGcpAndDistortions) =>
      gcpToP(generalGcpToGcp(generalGcp))
    return super._transformForward(geometry, options, generalGcpToP)
  }

  transformToResource<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): P
  transformToResource<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedLineString<P>
  transformToResource<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedPolygon<P>
  transformToResource<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformToResource<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformToResource<P = Point>(
    multiPolygon: MultiPolygon,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformToResource<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP?: (gcp: GcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transform a geometry to resource space
   *
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @param generalGcpToP - Return type function
   * @returns Input geometry transformed to resource space
   */
  transformToResource<P>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP: (gcp: GcpAndDistortions) => P = gcpToPointForToResource as (
      gcp: GcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const generalGcpToP = (generalGcp: GeneralGcpAndDistortions) =>
      gcpToP(generalGcpToGcp(generalGcp))
    return super._transformBackward(geometry, options, generalGcpToP)
  }

  // Shortcut static methods for SVG <> GeoJSON

  /**
   * Transform an SVG geometry to geo space as a GeoJSON Geometry
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
   * Note: since this converts to GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
   * Note: Multi-geometries are not supported
   *
   * @param transformer - A GCP Transformer defining the transformation
   * @param geometry - SVG geometry to transform
   * @param options - Transform options
   * @returns Input SVG geometry transformed to geo space, as a GeoJSON Geometry
   */
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgCircle: SvgCircle,
    options?: Partial<TransformOptions>
  ): GeojsonPoint
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgLine: SvgLine,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgPolyLine: SvgPolyLine,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgRect: SvgRect,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgPolygon: SvgPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgGeometry: SvgGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry
  static transformSvgToGeojson(
    transformer: GcpTransformer,
    svgGeometry: SvgGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    options = mergePartialOptions({ destinationIsGeographic: true }, options)
    // This middle step is needed to make typescript happy
    const transformedGeometry = transformer.transformToGeo(
      svgGeometryToGeometry(svgGeometry),
      options
    )
    return geometryToGeojsonGeometry(transformedGeometry)
  }

  /**
   * Transform an SVG string to geo space to a GeoJSON FeatureCollection
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
   * Note: since this converts to GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
   * Note: Multi-geometries are not supported
   *
   * @param transformer - A GCP Transformer defining the transformation
   * @param svg - An SVG string to transform
   * @param options - Transform options
   * @returns Input SVG string transformed to geo space, as a GeoJSON FeatureCollection
   */
  static transformSvgStringToGeojsonFeatureCollection(
    transformer: GcpTransformer,
    svg: string,
    options?: Partial<TransformOptions>
  ): GeojsonFeatureCollection {
    const geojsonGeometries = []
    for (const svgGeometry of stringToSvgGeometriesGenerator(svg)) {
      const geojsonGeometry = this.transformSvgToGeojson(
        transformer,
        svgGeometry,
        options
      )
      geojsonGeometries.push(geojsonGeometry)
    }
    return geojsonGeometriesToGeojsonFeatureCollection(geojsonGeometries)
  }

  /**
   * Transform a GeoJSON Geometry to resource space to a SVG geometry
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
   * Note: since this converts from GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
   * Note: Multi-geometries are not supported
   *
   * @param transformer - A GCP Transformer defining the transformation
   * @param geojsonGeometry - GeoJSON Geometry to transform
   * @param options - Transform options
   * @returns Input GeoJSON Geometry transform to resource space, as SVG geometry
   */
  static transformGeojsonToSvg(
    transformer: GcpTransformer,
    geojsonGeometry: GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): SvgGeometry {
    options = mergePartialOptions({ destinationIsGeographic: true }, options)
    // This middle step is needed to make typescript happy
    const transformedGeometry = transformer.transformToResource(
      geojsonGeometryToGeometry(geojsonGeometry),
      options
    )
    return geometryToSvgGeometry(transformedGeometry)
  }

  /**
   * Transform a GeoJSON FeatureCollection to resource space to a SVG string
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
   * Note: since this converts from GeoJSON we assume geo-space is in lon-lat WGS84 and automatically set `destinationIsGeographic` to use geographically computed midpoints.
   * Note: Multi-geometries are not supported
   *
   * @param transformer - A GCP Transformer defining the transformation
   * @param geojson - GeoJSON FeatureCollection to transform
   * @param options - Transform options
   * @returns Input GeoJSON FeaturesCollection transformed to resource space, as SVG string
   */
  static transformGeojsonFeatureCollectionToSvgString(
    transformer: GcpTransformer,
    geojson: GeojsonFeatureCollection,
    options?: Partial<TransformOptions>
  ): string {
    const svgGeometries = []
    for (const geojsonGeometry of geojsonFeatureCollectionToGeojsonGeometries(
      geojson
    )) {
      const svgGeometry = this.transformGeojsonToSvg(
        transformer,
        geojsonGeometry,
        options
      )
      svgGeometries.push(svgGeometry)
    }

    return svgGeometriesToSvgString(svgGeometries)
  }
}
