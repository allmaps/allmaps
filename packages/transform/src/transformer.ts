import {
  convertPointToGeojsonPoint,
  convertLineStringToGeojsonLineString,
  convertPolygonToGeojsonPolygon,
  convertGeojsonPointToPoint,
  convertGeojsonLineStringToLineString,
  convertGeojsonPolygonToPolygon,
  isPoint,
  isLineString,
  isPolygon,
  isGeojsonPoint,
  isGeojsonLineString,
  isGeojsonPolygon,
  flipY
} from '@allmaps/stdlib'

import Helmert from './shared/helmert.js'
import Polynomial from './shared/polynomial.js'
import Projective from './shared/projective.js'
import RBF from './shared/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  transformLineStringForwardToLineString,
  transformLineStringBackwardToLineString,
  transformPolygonForwardToPolygon,
  transformPolygonBackwardToPolygon
} from './shared/transform-helper-functions.js'

import type {
  Point,
  LineString,
  Polygon,
  Geometry,
  Gcp,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  GeojsonGeometry,
  SvgGeometry
} from '@allmaps/types'

import type {
  TransformGcp,
  TransformationType,
  PartialTransformOptions,
  GcpTransformerInterface,
  Transformation
} from './shared/types.js'

/**
 * A Ground Control Point Transformer, containing a forward and backward transformation and
 * specifying functions to transform geometries using these transformations.
 * */
export default class GcpTransformer implements GcpTransformerInterface {
  gcps: TransformGcp[]
  sourcePoints: Point[]
  destinationPoints: Point[]
  type: TransformationType
  options?: PartialTransformOptions

  forwardTransformation?: Transformation
  backwardTransformation?: Transformation

  /**
   * Create a GcpTransformer
   * @param {TransformGcp[] | Gcp[]} gcps - An array of Ground Control Points (GCPs)
   * @param {TransformationType} [type='polynomial'] - The transformation type
   */ constructor(
    gcps: TransformGcp[] | Gcp[],
    type: TransformationType = 'polynomial',
    options?: PartialTransformOptions
  ) {
    if (options) {
      this.options = options
    }
    if (gcps.length == 0) {
      throw new Error('No control points.')
    }
    this.gcps = gcps.map((gcp) => {
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

  assureEqualHandedness(point: Point): Point {
    return this.options?.differentHandedness ? flipY(point) : point
  }

  #createForwardTransformation(): Transformation {
    return this.#createTransformation(
      this.sourcePoints.map((point) => this.assureEqualHandedness(point)),
      this.destinationPoints
    )
  }

  #createBackwardTransformation(): Transformation {
    return this.#createTransformation(
      this.destinationPoints,
      this.sourcePoints.map((point) => this.assureEqualHandedness(point))
    )
  }

  #createTransformation(
    sourcePoints: Point[],
    destinationPoints: Point[]
  ): Transformation {
    if (this.type === 'helmert') {
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

  // Base functions
  transformForward(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): Point
  transformForward(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformForward(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {Geometry} Forward transform of input as Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformForward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPoint(input)) {
      if (!this.forwardTransformation) {
        this.forwardTransformation = this.#createForwardTransformation()
      }
      return this.forwardTransformation.interpolate(
        this.assureEqualHandedness(input)
      )
    } else if (isGeojsonPoint(input)) {
      return this.transformForward(convertGeojsonPointToPoint(input))
    } else if (isLineString(input)) {
      return transformLineStringForwardToLineString(this, input, options)
    } else if (isGeojsonLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return transformLineStringForwardToLineString(
        this,
        convertGeojsonLineStringToLineString(input),
        options
      )
    } else if (isPolygon(input)) {
      return transformPolygonForwardToPolygon(this, input, options)
    } else if (isGeojsonPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return transformPolygonForwardToPolygon(
        this,
        convertGeojsonPolygonToPolygon(input),
        options
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformForwardAsGeojson(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): GeojsonPoint
  transformForwardAsGeojson(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): GeojsonLineString
  transformForwardAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): GeojsonPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {GeojsonGeometry} Forward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformForwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPoint(input)) {
      return convertPointToGeojsonPoint(this.transformForward(input))
    } else if (isGeojsonPoint(input)) {
      return convertPointToGeojsonPoint(
        this.transformForward(convertGeojsonPointToPoint(input))
      )
    } else if (isLineString(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeojsonLineString(
        transformLineStringForwardToLineString(this, input, options)
      )
    } else if (isGeojsonLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeojsonLineString(
        transformLineStringForwardToLineString(
          this,
          convertGeojsonLineStringToLineString(input),
          options
        )
      )
    } else if (isPolygon(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeojsonPolygon(
        transformPolygonForwardToPolygon(this, input, options)
      )
    } else if (isGeojsonPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeojsonPolygon(
        transformPolygonForwardToPolygon(
          this,
          convertGeojsonPolygonToPolygon(input),
          options
        )
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformBackward(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): Point
  transformBackward(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformBackward(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms a geometry or a GeoJSON geometry backward to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {Geometry} backward transform of input, as geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformBackward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPoint(input)) {
      if (!this.backwardTransformation) {
        this.backwardTransformation = this.#createBackwardTransformation()
      }

      return this.assureEqualHandedness(
        this.backwardTransformation.interpolate(input)
      )
    } else if (isGeojsonPoint(input)) {
      return this.transformBackward(convertGeojsonPointToPoint(input))
    } else if (isLineString(input)) {
      return transformLineStringBackwardToLineString(this, input, options)
    } else if (isGeojsonLineString(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return transformLineStringBackwardToLineString(
        this,
        convertGeojsonLineStringToLineString(input),
        options
      )
    } else if (isPolygon(input)) {
      return transformPolygonBackwardToPolygon(this, input, options)
    } else if (isGeojsonPolygon(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return transformPolygonBackwardToPolygon(
        this,
        convertGeojsonPolygonToPolygon(input),
        options
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformBackwardAsGeojson(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): GeojsonPoint
  transformBackwardAsGeojson(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): GeojsonLineString
  transformBackwardAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): GeojsonPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {GeojsonGeometry} backward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformBackwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPoint(input)) {
      return convertPointToGeojsonPoint(this.transformBackward(input))
    } else if (isGeojsonPoint(input)) {
      return convertPointToGeojsonPoint(
        this.transformBackward(convertGeojsonPointToPoint(input))
      )
    } else if (isLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return convertLineStringToGeojsonLineString(
        transformLineStringBackwardToLineString(this, input, options)
      )
    } else if (isGeojsonLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeojsonLineString(
        transformLineStringBackwardToLineString(
          this,
          convertGeojsonLineStringToLineString(input),
          options
        )
      )
    } else if (isPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return convertPolygonToGeojsonPolygon(
        transformPolygonBackwardToPolygon(this, input, options)
      )
    } else if (isGeojsonPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeojsonPolygon(
        transformPolygonBackwardToPolygon(
          this,
          convertGeojsonPolygonToPolygon(input),
          options
        )
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  // Alias

  transformToGeo(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): Point
  transformToGeo(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToGeo(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms Geometry or GeoJSON geometry forward, as Geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformToGeo(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPoint(input)) {
      return this.transformForward(input as Point, options)
    } else if (isGeojsonPoint(input)) {
      return this.transformForward(input as GeojsonPoint, options)
    } else if (isLineString(input)) {
      return this.transformForward(input as LineString, options)
    } else if (isGeojsonLineString(input)) {
      return this.transformForward(input as GeojsonLineString, options)
    } else if (isPolygon(input)) {
      return this.transformForward(input as Polygon, options)
    } else if (isGeojsonPolygon(input)) {
      return this.transformForward(input as GeojsonPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToGeoAsGeojson(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): GeojsonPoint
  transformToGeoAsGeojson(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): GeojsonLineString
  transformToGeoAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): GeojsonPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward, to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformToGeoAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPoint(input)) {
      return this.transformForwardAsGeojson(input as Point, options)
    } else if (isGeojsonPoint(input)) {
      return this.transformForwardAsGeojson(input as GeojsonPoint, options)
    } else if (isLineString(input)) {
      return this.transformForwardAsGeojson(input as LineString, options)
    } else if (isGeojsonLineString(input)) {
      return this.transformForwardAsGeojson(input as GeojsonLineString, options)
    } else if (isPolygon(input)) {
      return this.transformForwardAsGeojson(input as Polygon, options)
    } else if (isGeojsonPolygon(input)) {
      return this.transformForwardAsGeojson(input as GeojsonPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToResource(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): Point
  transformToResource(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToResource(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Backward transform of input, as a Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformToResource(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPoint(input)) {
      return this.transformBackward(input as Point, options)
    } else if (isGeojsonPoint(input)) {
      return this.transformBackward(input as GeojsonPoint, options)
    } else if (isLineString(input)) {
      return this.transformBackward(input as LineString, options)
    } else if (isGeojsonLineString(input)) {
      return this.transformBackward(input as GeojsonLineString, options)
    } else if (isPolygon(input)) {
      return this.transformBackward(input as Polygon, options)
    } else if (isGeojsonPolygon(input)) {
      return this.transformBackward(input as GeojsonPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToResourceAsGeojson(
    input: Point | GeojsonPoint,
    options?: PartialTransformOptions
  ): GeojsonPoint
  transformToResourceAsGeojson(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): GeojsonLineString
  transformToResourceAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): GeojsonPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {GeojsonGeometry} Backward transform of input, as a GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformToResourceAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPoint(input)) {
      return this.transformBackwardAsGeojson(input as Point, options)
    } else if (isGeojsonPoint(input)) {
      return this.transformBackwardAsGeojson(input as GeojsonPoint, options)
    } else if (isLineString(input)) {
      return this.transformBackwardAsGeojson(input as LineString, options)
    } else if (isGeojsonLineString(input)) {
      return this.transformBackwardAsGeojson(
        input as GeojsonLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformBackwardAsGeojson(input as Polygon, options)
    } else if (isGeojsonPolygon(input)) {
      return this.transformBackwardAsGeojson(input as GeojsonPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  // Shortcuts for SVG <> GeoJSON

  /**
   * Transforms a SVG geometry forward to a GeoJSON geometry
   * @param {SvgGeometry} geometry - SVG geometry to transform
   * @returns {GeojsonGeometry} Forward transform of input, as a GeoJSON geometry
   */
  transformSvgToGeojson(
    geometry: SvgGeometry,
    transformOptions?: PartialTransformOptions
  ): GeojsonGeometry {
    if (geometry.type === 'circle') {
      return this.transformForwardAsGeojson(geometry.coordinates)
    } else if (geometry.type === 'line') {
      return this.transformForwardAsGeojson(
        geometry.coordinates,
        transformOptions
      )
    } else if (geometry.type === 'polyline') {
      return this.transformForwardAsGeojson(
        geometry.coordinates,
        transformOptions
      )
    } else if (geometry.type === 'rect') {
      return this.transformForwardAsGeojson(
        [geometry.coordinates],
        transformOptions
      )
    } else if (geometry.type === 'polygon') {
      return this.transformForwardAsGeojson(
        [geometry.coordinates],
        transformOptions
      )
    } else {
      throw new Error(`Unsupported SVG geometry`)
    }
  }

  /**
   * Transforms a GeoJSON geometry backward to a SVG geometry
   * @param {GeojsonGeometry} geometry - GeoJSON geometry to transform
   * @returns {SvgGeometry} Backward transform of input, as SVG geometry
   */
  transformGeojsonToSvg(
    geometry: GeojsonGeometry,
    transformOptions?: PartialTransformOptions
  ): SvgGeometry {
    if (geometry.type === 'Point') {
      return {
        type: 'circle',
        coordinates: this.transformBackward(geometry)
      }
    } else if (geometry.type === 'LineString') {
      return {
        type: 'polyline',
        coordinates: this.transformBackward(geometry, transformOptions)
      }
    } else if (geometry.type === 'Polygon') {
      return {
        type: 'polygon',
        coordinates: this.transformBackward(geometry, transformOptions)[0]
      }
    } else {
      throw new Error(`Unsupported GeoJSON geometry`)
    }
  }
}
