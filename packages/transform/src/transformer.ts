import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  geojsonGeometriesToGeojsonFeatureCollection,
  geojsonFeatureCollectionToGeojsonGeometries,
  stringToSvgGeometriesGenerator,
  svgGeometriesToSvgString,
  flipY,
  mergeOptions,
  geometryToGeojsonGeometry,
  svgGeometryToGeometry,
  geojsonGeometryToGeometry,
  geometryToSvgGeometry
} from '@allmaps/stdlib'

import { Transformation } from './transformation.js'

import { Straight } from './transformation-types/straight.js'
import { Helmert } from './transformation-types/helmert.js'
import { Polynomial } from './transformation-types/polynomial.js'
import { Projective } from './transformation-types/projective.js'
import { RBF } from './transformation-types/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  defaultTransformOptions,
  transformPointForward,
  transformPointBackward,
  transformLineStringForward,
  transformLineStringBackward,
  transformPolygonForward,
  transformPolygonBackward
} from './shared/transform-helper-functions.js'
import {
  generalGcpToPointForForward,
  generalGcpToPointForBackward,
  gcpToPointForToGeo,
  gcpToPointForToResource,
  generalGcpToGcp
} from './shared/conversion-functions.js'

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
  GeojsonPolygon
} from '@allmaps/types'

import type {
  GeneralGcp,
  GeneralGcpAndDistortions,
  GcpAndDistortions,
  TransformationType,
  TransformOptions
} from './shared/types.js'

/**
 * A Ground Control Point Transformer, containing a forward and backward transformation and
 * specifying functions to transform geometries using these transformations.
 * */
export class GcpTransformer {
  gcps: GeneralGcp[]
  sourcePoints: Point[]
  destinationPoints: Point[]
  type: TransformationType
  options: TransformOptions

  protected forwardTransformation?: Transformation
  protected backwardTransformation?: Transformation

  /**
   * Create a GcpTransformer
   * @param gcps - An array of Ground Control Points (GCPs)
   * @param type - The transformation type
   */ constructor(
    gcps: GeneralGcp[] | Gcp[],
    type: TransformationType = 'polynomial',
    options?: Partial<TransformOptions>
  ) {
    this.options = mergeOptions(defaultTransformOptions, options)
    if (gcps.length === 0) {
      throw new Error('No control points')
    }
    this.gcps = gcps.map((gcp) => {
      // TODO: replace by generalGcpToGcp()
      if ('resource' in gcp && 'geo' in gcp) {
        return {
          source: gcp.resource,
          destination: gcp.geo
        }
      } else if ('source' in gcp && 'destination' in gcp) {
        return gcp
      } else {
        throw new Error('Unsupported GCP type')
      }
    })
    this.sourcePoints = this.gcps.map((gcp) => gcp.source)
    this.destinationPoints = this.gcps.map((gcp) => gcp.destination)
    this.type = type
  }

  /**
   * Get forward transformation. Create if it doesn't exist yet.
   */
  getForwardTransformation(): Transformation {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.computeTransformation(
        this.sourcePoints.map((point) =>
          this.options?.differentHandedness ? flipY(point) : point
        ),
        this.destinationPoints
      )
    }
    return this.forwardTransformation
  }

  /**
   * Get backward transformation. Create if it doesn't exist yet.
   */
  getBackwardTransformation(): Transformation {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.computeTransformation(
        this.destinationPoints,
        this.sourcePoints.map((point) =>
          this.options?.differentHandedness ? flipY(point) : point
        )
      )
    }
    return this.backwardTransformation
  }

  transformForward<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformForward<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformForward<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformForward<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformForward<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformForward<P = Point>(
    multiPolygon: MultiPolygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformForward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transforms a Geometry forward
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @returns Forward transform of input geometry
   */
  transformForward<P = Point>(
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
        return transformPointForward(
          geometry,
          this,
          mergedOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return transformLineStringForward(
          geometry,
          this,
          mergedOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return transformPolygonForward(
          geometry,
          this,
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
          this.transformForward(element, options, generalGcpToP)
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this.transformForward(element, options, generalGcpToP)
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this.transformForward(element, options, generalGcpToP)
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  transformBackward<P = Point>(
    point: Point,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): P
  transformBackward<P = Point>(
    lineString: LineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedLineString<P>
  transformBackward<P = Point>(
    polygon: Polygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedPolygon<P>
  transformBackward<P = Point>(
    multiPoint: MultiPoint,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPoint<P>
  transformBackward<P = Point>(
    multiLineString: MultiLineString,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiLineString<P>
  transformBackward<P = Point>(
    multiPolygon: MultiPolygon,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedMultiPolygon<P>
  transformBackward<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    generalGcpToP?: (generalGcp: GeneralGcpAndDistortions) => P
  ): TypedGeometry<P>
  /**
   * Transforms a Geometry backward
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @returns Backward transform of input geometry
   */
  transformBackward<P = Point>(
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
        return transformPointBackward(
          geometry,
          this,
          mergedOptions,
          generalGcpToP
        )
      } else if (isLineString(geometry)) {
        return transformLineStringBackward(
          geometry,
          this,
          mergedOptions,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return transformPolygonBackward(
          geometry,
          this,
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
          this.transformBackward(element, options, generalGcpToP)
        )
      } else if (isMultiLineString(geometry)) {
        return geometry.map((element) =>
          this.transformBackward(element, options, generalGcpToP)
        )
      } else if (isMultiPolygon(geometry)) {
        return geometry.map((element) =>
          this.transformBackward(element, options, generalGcpToP)
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  // Alias

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
   * Transforms Geometry to geo space
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @returns Input geometry transformed to geo space
   */
  transformToGeo<P = Point>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP: (gcp: GcpAndDistortions) => P = gcpToPointForToGeo as (
      gcp: GcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const mergedOptions = mergeOptions(this.options, options)
    const generalGcpToP = (generalGcp: GeneralGcpAndDistortions) =>
      gcpToP(generalGcpToGcp(generalGcp))
    if (!mergedOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this.transformForward(geometry as Point, options, generalGcpToP)
      } else if (isLineString(geometry)) {
        return this.transformForward(
          geometry as LineString,
          options,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this.transformForward(
          geometry as Polygon,
          options,
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
        return this.transformForward(
          geometry as MultiPoint,
          options,
          generalGcpToP
        )
      } else if (isMultiLineString(geometry)) {
        return this.transformForward(
          geometry as MultiLineString,
          options,
          generalGcpToP
        )
      } else if (isMultiPolygon(geometry)) {
        return this.transformForward(
          geometry as MultiPolygon,
          options,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
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
   * Transforms a Geometry to resource space
   * @param geometry - Geometry to transform
   * @param options - Transform options
   * @returns Input geometry transformed to resource space
   */
  transformToResource<P>(
    geometry: Geometry,
    options?: Partial<TransformOptions>,
    gcpToP: (gcp: GcpAndDistortions) => P = gcpToPointForToResource as (
      gcp: GcpAndDistortions
    ) => P
  ): TypedGeometry<P> {
    const mergedOptions = mergeOptions(this.options, options)
    const generalGcpToP = (generalGcp: GeneralGcpAndDistortions) =>
      gcpToP(generalGcpToGcp(generalGcp))
    if (!mergedOptions.isMultiGeometry) {
      if (isPoint(geometry)) {
        return this.transformBackward(geometry as Point, options, generalGcpToP)
      } else if (isLineString(geometry)) {
        return this.transformBackward(
          geometry as LineString,
          options,
          generalGcpToP
        )
      } else if (isPolygon(geometry)) {
        return this.transformBackward(
          geometry as Polygon,
          options,
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
        return this.transformBackward(
          geometry as MultiPoint,
          options,
          generalGcpToP
        )
      } else if (isMultiLineString(geometry)) {
        return this.transformBackward(
          geometry as MultiLineString,
          options,
          generalGcpToP
        )
      } else if (isMultiPolygon(geometry)) {
        return this.transformBackward(
          geometry as MultiPolygon,
          options,
          generalGcpToP
        )
      } else {
        throw new Error('Geometry type not supported')
      }
    }
  }

  // Shortcut static methods for SVG <> GeoJSON

  /**
   * Transforms a SVG geometry to geo space as a GeoJSON Geometry
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
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
    // This middle step is needed to make typescript happy
    const transformedGeometry = transformer.transformToGeo(
      svgGeometryToGeometry(svgGeometry),
      options
    )
    return geometryToGeojsonGeometry(transformedGeometry)
  }

  /**
   * Transforms an SVG string to geo space to a GeoJSON FeatureCollection
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
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
   * Transforms a GeoJSON Geometry to resource space to a SVG geometry
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
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
    // This middle step is needed to make typescript happy
    const transformedGeometry = transformer.transformToResource(
      geojsonGeometryToGeometry(geojsonGeometry),
      options
    )
    return geometryToSvgGeometry(transformedGeometry)
  }

  /**
   * Transforms a GeoJSON FeatureCollection to resource space to a SVG string
   *
   * This is a shortcut method, available as static method in order not to overpopulate intellisense suggestions
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

  private computeTransformation(
    sourcePoints: Point[],
    destinationPoints: Point[]
  ): Transformation {
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
}
