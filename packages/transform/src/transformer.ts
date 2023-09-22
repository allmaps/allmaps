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

import {
  convertPositionToGeojsonPoint,
  convertLineStringToGeojsonLineString,
  convertPolygonToGeojsonPolygon,
  convertGeojsonPointToPosition,
  convertGeojsonLineStringToLineString,
  convertGeojsonPolygonToPolygon,
  isPosition,
  isLineString,
  isPolygon,
  isGeojsonPoint,
  isGeojsonLineString,
  isGeojsonPolygon
} from '@allmaps/stdlib'

import type {
  TransformGcp,
  TransformationType,
  PartialTransformOptions,
  GcpTransformerInterface,
  Transformation
} from './shared/types.js'

import type {
  Position,
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

/** A Ground Controle Point Transformer, containing a forward and backward transformation and specifying functions to transform geometries using these transformations. */
export default class GcpTransformer implements GcpTransformerInterface {
  gcps: TransformGcp[]
  sourcePositions: Position[]
  destinationPositions: Position[]
  type: TransformationType

  forwardTransformation?: Transformation
  backwardTransformation?: Transformation

  /**
   * Create a GcpTransformer
   * @param {TransformGcp[] | Gcp[]} gcps - An array of Ground Control Points (GCPs)
   * @param {TransformationType} type='polynomial' - The transformation type
   */ constructor(
    gcps: TransformGcp[] | Gcp[],
    type: TransformationType = 'polynomial'
  ) {
    if (gcps.length == 0) {
      throw new Error('No control points.')
    }
    this.gcps = gcps.map((p) => {
      if ('resource' in p && 'geo' in p) {
        return {
          source: (p as Gcp).resource,
          destination: (p as Gcp).geo
        }
      } else if ('source' in p && 'destination' in p) {
        return p as TransformGcp
      } else {
        throw new Error('Unsupported GCP type')
      }
    })
    this.sourcePositions = this.gcps.map((gcp) => gcp.source)
    this.destinationPositions = this.gcps.map((gcp) => gcp.destination)
    this.type = type
  }

  #createForwardTransformation(): Transformation {
    return this.#createTransformation(
      this.sourcePositions,
      this.destinationPositions
    )
  }

  #createBackwardTransformation(): Transformation {
    return this.#createTransformation(
      this.destinationPositions,
      this.sourcePositions
    )
  }

  #createTransformation(
    sourcePositions: Position[],
    destinationPositions: Position[]
  ): Transformation {
    if (this.type === 'helmert') {
      return new Helmert(sourcePositions, destinationPositions)
    } else if (this.type === 'polynomial1' || this.type === 'polynomial') {
      return new Polynomial(sourcePositions, destinationPositions)
    } else if (this.type === 'polynomial2') {
      return new Polynomial(sourcePositions, destinationPositions, 2)
    } else if (this.type === 'polynomial3') {
      return new Polynomial(sourcePositions, destinationPositions, 3)
    } else if (this.type === 'projective') {
      return new Projective(sourcePositions, destinationPositions)
    } else if (this.type === 'thinPlateSpline') {
      return new RBF(
        sourcePositions,
        destinationPositions,
        thinPlateKernel,
        euclideanNorm
      )
    } else {
      throw new Error(`Unsupported transformation type: ${this.type}`)
    }
  }

  // Base functions

  transformForward(
    input: Position | GeojsonPoint,
    options?: PartialTransformOptions
  ): Position
  transformForward(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformForward(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson geometry forward to geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {Geometry} Forward transform of input as geometry
   * @type {{
   * (input:Position | GeojsonPoint) => Position;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformForward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      if (!this.forwardTransformation) {
        this.forwardTransformation = this.#createForwardTransformation()
      }
      return this.forwardTransformation.interpolate(input)
    } else if (isGeojsonPoint(input)) {
      return this.transformForward(convertGeojsonPointToPosition(input))
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
    input: Position | GeojsonPoint,
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
   * Transforms geometry or geojson geometry forward to geojson geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {GeojsonGeometry} Forward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformForwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPosition(input)) {
      return convertPositionToGeojsonPoint(this.transformForward(input))
    } else if (isGeojsonPoint(input)) {
      return convertPositionToGeojsonPoint(
        this.transformForward(convertGeojsonPointToPosition(input))
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
    input: Position | GeojsonPoint,
    options?: PartialTransformOptions
  ): Position
  transformBackward(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformBackward(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson geometry backward to geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {Geometry} backward transform of input, as geometry
   * @type {{
   * (input:Position | GeojsonPoint) => Position;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformBackward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      if (!this.backwardTransformation) {
        this.backwardTransformation = this.#createBackwardTransformation()
      }

      return this.backwardTransformation.interpolate(input)
    } else if (isGeojsonPoint(input)) {
      return this.transformBackward(convertGeojsonPointToPosition(input))
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
    input: Position | GeojsonPoint,
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
   * Transforms geometry or geojson geometry backward to geojson geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {GeojsonGeometry} backward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformBackwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPosition(input)) {
      return convertPositionToGeojsonPoint(this.transformBackward(input))
    } else if (isGeojsonPoint(input)) {
      return convertPositionToGeojsonPoint(
        this.transformBackward(convertGeojsonPointToPosition(input))
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
    input: Position | GeojsonPoint,
    options?: PartialTransformOptions
  ): Position
  transformToGeo(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToGeo(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson gemetry forward (i.e. to geo), as geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as geometry
   * @type {{
   * (input:Position | GeojsonPoint) => Position;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformToGeo(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformForward(input as Position, options)
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
    input: Position | GeojsonPoint,
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
   * Transforms geometry or geojson gemetry forward (i.e. to geo), as geojson geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformToGeoAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPosition(input)) {
      return this.transformForwardAsGeojson(input as Position, options)
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
    input: Position | GeojsonPoint,
    options?: PartialTransformOptions
  ): Position
  transformToResource(
    input: LineString | GeojsonLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToResource(
    input: Polygon | GeojsonPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson gemetry backward (i.e. to geo), as geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Backward transform of input, as geometry
   * @type {{
   * (input:Position | GeojsonPoint) => Position;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * }}
   */
  transformToResource(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformBackward(input as Position, options)
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
    input: Position | GeojsonPoint,
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
   * Transforms geometry or geojson gemetry backward (i.e. to geo), as geojson gemetry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {GeojsonGeometry} Backward transform of input, as geojson gemetry
   * @type {{
   * (input:Position | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * }}
   */
  transformToResourceAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (isPosition(input)) {
      return this.transformBackwardAsGeojson(input as Position, options)
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
   * Transforms svg geometry forward to geojson geometry
   * @param {SvgGeometry} input - Input to transform
   * @returns {GeojsonGeometry} Forward transform of input, as geojson gemetry
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
   * Transforms geojson geometry backward to svg geometry
   * @param {GeojsonGeometry} input - Input to transform
   * @returns {SvgGeometry} Backward transform of input, as svg gemetry
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
