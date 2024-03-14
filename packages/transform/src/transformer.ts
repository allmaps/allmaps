import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  isGeojsonPoint,
  isGeojsonLineString,
  isGeojsonPolygon,
  isGeojsonMultiPoint,
  isGeojsonMultiLineString,
  isGeojsonMultiPolygon,
  convertPointToGeojsonPoint,
  convertLineStringToGeojsonLineString,
  convertPolygonToGeojsonPolygon,
  convertGeojsonPointToPoint,
  convertGeojsonLineStringToLineString,
  convertGeojsonPolygonToPolygon,
  expandGeojsonMultiPointToGeojsonPointArray,
  expandGeojsonMultiLineStringToGeojsonLineStringArray,
  expandGeojsonMultiPolygonToGeojsonPolygonArray,
  joinGeojsonPointArrayToGeojsonMultiPoint,
  joinGeojsonLineStringArrayToGeojsonMultiLineString,
  joinGeojsonPolygonArrayToGeojsonMultiPolygon,
  flipY
} from '@allmaps/stdlib'

import Transformation from './transformation.js'

import Straight from './shared/straight.js'
import Helmert from './shared/helmert.js'
import Polynomial from './shared/polynomial.js'
import Projective from './shared/projective.js'
import RBF from './shared/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  mergeOptions,
  transformLineStringForwardToLineString,
  transformLineStringBackwardToLineString,
  transformPolygonForwardToPolygon,
  transformPolygonBackwardToPolygon
} from './shared/transform-helper-functions.js'

import type {
  Point,
  LineString,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Geometry,
  Gcp,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  GeojsonMultiPoint,
  GeojsonMultiLineString,
  GeojsonMultiPolygon,
  GeojsonGeometry,
  SvgGeometry
} from '@allmaps/types'

import type {
  TransformGcp,
  TransformationType,
  PartialTransformOptions
} from './shared/types.js'

/**
 * A Ground Control Point Transformer, containing a forward and backward transformation and
 * specifying functions to transform geometries using these transformations.
 * */
export default class GcpTransformer {
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

  /**
   * Create forward transformation
   */
  createForwardTransformation(): void {
    this.forwardTransformation = this.computeTransformation(
      this.sourcePoints.map((point) => this.assureEqualHandedness(point)),
      this.destinationPoints
    )
  }

  /**
   * Create backward transformation
   */
  createBackwardTransformation(): void {
    this.backwardTransformation = this.computeTransformation(
      this.destinationPoints,
      this.sourcePoints.map((point) => this.assureEqualHandedness(point))
    )
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
  transformForward(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): MultiPoint
  transformForward(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): MultiLineString
  transformForward(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): MultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {Geometry} Forward transform of input as Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * (input:MultiPoint | GeojsonMultiPoint) => MultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => MultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => MultiPolygon;
   * }}
   */
  transformForward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
      if (isPoint(input)) {
        if (!this.forwardTransformation) {
          this.createForwardTransformation()
        }
        return this.forwardTransformation!.evaluate(
          this.assureEqualHandedness(input),
          mergeOptions(options, this.options).evaluationType
        )
      } else if (isGeojsonPoint(input)) {
        return this.transformForward(convertGeojsonPointToPoint(input), options)
      } else if (isLineString(input)) {
        return transformLineStringForwardToLineString(
          this,
          input,
          mergeOptions(options, this.options)
        )
      } else if (isGeojsonLineString(input)) {
        return transformLineStringForwardToLineString(
          this,
          convertGeojsonLineStringToLineString(input),
          mergeOptions(options, this.options, {
            sourceIsGeographic: true
          })
        )
      } else if (isPolygon(input)) {
        return transformPolygonForwardToPolygon(
          this,
          input,
          mergeOptions(options, this.options)
        )
      } else if (isGeojsonPolygon(input)) {
        return transformPolygonForwardToPolygon(
          this,
          convertGeojsonPolygonToPolygon(input),
          mergeOptions(options, this.options, { sourceIsGeographic: true })
        )
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return input.map((element) => this.transformForward(element, options))
    } else if (isGeojsonMultiPoint(input)) {
      return expandGeojsonMultiPointToGeojsonPointArray(input).map((element) =>
        this.transformForward(element, options)
      )
    } else if (isMultiLineString(input)) {
      return input.map((element) => this.transformForward(element, options))
    } else if (isGeojsonMultiLineString(input)) {
      return expandGeojsonMultiLineStringToGeojsonLineStringArray(input).map(
        (element) => this.transformForward(element, options)
      )
    } else if (isMultiPolygon(input)) {
      return input.map((element) => this.transformForward(element, options))
    } else if (isGeojsonMultiPolygon(input)) {
      return expandGeojsonMultiPolygonToGeojsonPolygonArray(input).map(
        (element) => this.transformForward(element, options)
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
  transformForwardAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): GeojsonMultiPoint
  transformForwardAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): GeojsonMultiLineString
  transformForwardAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {GeojsonGeometry} Forward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * (input:MultiPoint | GeojsonMultiPoint) => GeojsonMultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => GeojsonMultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => GeojsonMultiPolygon;
   * }}
   */
  transformForwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
      if (isPoint(input)) {
        return convertPointToGeojsonPoint(this.transformForward(input))
      } else if (isGeojsonPoint(input)) {
        return convertPointToGeojsonPoint(
          this.transformForward(convertGeojsonPointToPoint(input))
        )
      } else if (isLineString(input)) {
        return convertLineStringToGeojsonLineString(
          transformLineStringForwardToLineString(
            this,
            input,
            mergeOptions(options, this.options, {
              destinationIsGeographic: true
            })
          )
        )
      } else if (isGeojsonLineString(input)) {
        return convertLineStringToGeojsonLineString(
          transformLineStringForwardToLineString(
            this,
            convertGeojsonLineStringToLineString(input),
            mergeOptions(options, this.options, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      } else if (isPolygon(input)) {
        return convertPolygonToGeojsonPolygon(
          transformPolygonForwardToPolygon(
            this,
            input,
            mergeOptions(options, this.options, {
              destinationIsGeographic: true
            })
          )
        )
      } else if (isGeojsonPolygon(input)) {
        return convertPolygonToGeojsonPolygon(
          transformPolygonForwardToPolygon(
            this,
            convertGeojsonPolygonToPolygon(input),
            mergeOptions(options, this.options, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return joinGeojsonPointArrayToGeojsonMultiPoint(
        input.map((element) => this.transformForwardAsGeojson(element, options))
      )
    } else if (isGeojsonMultiPoint(input)) {
      return joinGeojsonPointArrayToGeojsonMultiPoint(
        expandGeojsonMultiPointToGeojsonPointArray(input).map((element) =>
          this.transformForwardAsGeojson(element, options)
        )
      )
    } else if (isMultiLineString(input)) {
      return joinGeojsonLineStringArrayToGeojsonMultiLineString(
        input.map((element) => this.transformForwardAsGeojson(element, options))
      )
    } else if (isGeojsonMultiLineString(input)) {
      return joinGeojsonLineStringArrayToGeojsonMultiLineString(
        expandGeojsonMultiLineStringToGeojsonLineStringArray(input).map(
          (element) => this.transformForwardAsGeojson(element, options)
        )
      )
    } else if (isMultiPolygon(input)) {
      return joinGeojsonPolygonArrayToGeojsonMultiPolygon(
        input.map((element) => this.transformForwardAsGeojson(element, options))
      )
    } else if (isGeojsonMultiPolygon(input)) {
      return joinGeojsonPolygonArrayToGeojsonMultiPolygon(
        expandGeojsonMultiPolygonToGeojsonPolygonArray(input).map((element) =>
          this.transformForwardAsGeojson(element, options)
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
  transformBackward(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): MultiPoint
  transformBackward(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): MultiLineString
  transformBackward(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): MultiPolygon
  /**
   * Transforms a geometry or a GeoJSON geometry backward to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {Geometry} backward transform of input, as geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * (input:MultiPoint | GeojsonMultiPoint) => MultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => MultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => MultiPolygon;
   * }}
   */
  transformBackward(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
      if (isPoint(input)) {
        if (!this.backwardTransformation) {
          this.createBackwardTransformation()
        }
        return this.assureEqualHandedness(
          this.backwardTransformation!.evaluate(input)
        )
      } else if (isGeojsonPoint(input)) {
        return this.transformBackward(convertGeojsonPointToPoint(input))
      } else if (isLineString(input)) {
        return transformLineStringBackwardToLineString(
          this,
          input,
          mergeOptions(options, this.options)
        )
      } else if (isGeojsonLineString(input)) {
        return transformLineStringBackwardToLineString(
          this,
          convertGeojsonLineStringToLineString(input),
          mergeOptions(options, this.options, {
            destinationIsGeographic: true
          })
        )
      } else if (isPolygon(input)) {
        return transformPolygonBackwardToPolygon(
          this,
          input,
          mergeOptions(options, this.options)
        )
      } else if (isGeojsonPolygon(input)) {
        return transformPolygonBackwardToPolygon(
          this,
          convertGeojsonPolygonToPolygon(input),
          mergeOptions(options, this.options, {
            destinationIsGeographic: true
          })
        )
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return input.map((element) => this.transformBackward(element, options))
    } else if (isGeojsonMultiPoint(input)) {
      return expandGeojsonMultiPointToGeojsonPointArray(input).map((element) =>
        this.transformBackward(element, options)
      )
    } else if (isMultiLineString(input)) {
      return input.map((element) => this.transformBackward(element, options))
    } else if (isGeojsonMultiLineString(input)) {
      return expandGeojsonMultiLineStringToGeojsonLineStringArray(input).map(
        (element) => this.transformBackward(element, options)
      )
    } else if (isMultiPolygon(input)) {
      return input.map((element) => this.transformBackward(element, options))
    } else if (isGeojsonMultiPolygon(input)) {
      return expandGeojsonMultiPolygonToGeojsonPolygonArray(input).map(
        (element) => this.transformBackward(element, options)
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
  transformBackwardAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): GeojsonMultiPoint
  transformBackwardAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): GeojsonMultiLineString
  transformBackwardAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Geometry or GeoJSON geometry to transform
   * @param {PartialTransformOptions} [options] - Transform options
   * @returns {GeojsonGeometry} backward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * (input:MultiPoint | GeojsonMultiPoint) => GeojsonMultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => GeojsonMultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => GeojsonMultiPolygon;
   * }}
   */
  transformBackwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
      if (isPoint(input)) {
        return convertPointToGeojsonPoint(this.transformBackward(input))
      } else if (isGeojsonPoint(input)) {
        return convertPointToGeojsonPoint(
          this.transformBackward(convertGeojsonPointToPoint(input))
        )
      } else if (isLineString(input)) {
        return convertLineStringToGeojsonLineString(
          transformLineStringBackwardToLineString(
            this,
            input,
            mergeOptions(options, this.options, {
              sourceIsGeographic: true
            })
          )
        )
      } else if (isGeojsonLineString(input)) {
        return convertLineStringToGeojsonLineString(
          transformLineStringBackwardToLineString(
            this,
            convertGeojsonLineStringToLineString(input),
            mergeOptions(options, this.options, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      } else if (isPolygon(input)) {
        return convertPolygonToGeojsonPolygon(
          transformPolygonBackwardToPolygon(
            this,
            input,
            mergeOptions(options, this.options, {
              sourceIsGeographic: true
            })
          )
        )
      } else if (isGeojsonPolygon(input)) {
        return convertPolygonToGeojsonPolygon(
          transformPolygonBackwardToPolygon(
            this,
            convertGeojsonPolygonToPolygon(input),
            mergeOptions(options, this.options, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return joinGeojsonPointArrayToGeojsonMultiPoint(
        input.map((element) =>
          this.transformBackwardAsGeojson(element, options)
        )
      )
    } else if (isGeojsonMultiPoint(input)) {
      return joinGeojsonPointArrayToGeojsonMultiPoint(
        expandGeojsonMultiPointToGeojsonPointArray(input).map((element) =>
          this.transformBackwardAsGeojson(element, options)
        )
      )
    } else if (isMultiLineString(input)) {
      return joinGeojsonLineStringArrayToGeojsonMultiLineString(
        input.map((element) =>
          this.transformBackwardAsGeojson(element, options)
        )
      )
    } else if (isGeojsonMultiLineString(input)) {
      return joinGeojsonLineStringArrayToGeojsonMultiLineString(
        expandGeojsonMultiLineStringToGeojsonLineStringArray(input).map(
          (element) => this.transformBackwardAsGeojson(element, options)
        )
      )
    } else if (isMultiPolygon(input)) {
      return joinGeojsonPolygonArrayToGeojsonMultiPolygon(
        input.map((element) =>
          this.transformBackwardAsGeojson(element, options)
        )
      )
    } else if (isGeojsonMultiPolygon(input)) {
      return joinGeojsonPolygonArrayToGeojsonMultiPolygon(
        expandGeojsonMultiPolygonToGeojsonPolygonArray(input).map((element) =>
          this.transformBackwardAsGeojson(element, options)
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
  transformToGeo(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): MultiPoint
  transformToGeo(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): MultiLineString
  transformToGeo(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): MultiPolygon
  /**
   * Transforms Geometry or GeoJSON geometry forward, as Geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * (input:MultiPoint | GeojsonMultiPoint) => MultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => MultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => MultiPolygon;
   * }}
   */
  transformToGeo(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
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
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return this.transformForward(input as MultiPoint, options)
    } else if (isGeojsonMultiPoint(input)) {
      return this.transformForward(input as GeojsonMultiPoint, options)
    } else if (isMultiLineString(input)) {
      return this.transformForward(input as MultiLineString, options)
    } else if (isGeojsonMultiLineString(input)) {
      return this.transformForward(input as GeojsonMultiLineString, options)
    } else if (isMultiPolygon(input)) {
      return this.transformForward(input as MultiPolygon, options)
    } else if (isGeojsonMultiPolygon(input)) {
      return this.transformForward(input as GeojsonMultiPolygon, options)
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
  transformToGeoAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): GeojsonMultiPoint
  transformToGeoAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): GeojsonMultiLineString
  transformToGeoAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward, to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * (input:MultiPoint | GeojsonMultiPoint) => GeojsonMultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => GeojsonMultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => GeojsonMultiPolygon;
   * }}
   */
  transformToGeoAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
      if (isPoint(input)) {
        return this.transformForwardAsGeojson(input as Point, options)
      } else if (isGeojsonPoint(input)) {
        return this.transformForwardAsGeojson(input as GeojsonPoint, options)
      } else if (isLineString(input)) {
        return this.transformForwardAsGeojson(input as LineString, options)
      } else if (isGeojsonLineString(input)) {
        return this.transformForwardAsGeojson(
          input as GeojsonLineString,
          options
        )
      } else if (isPolygon(input)) {
        return this.transformForwardAsGeojson(input as Polygon, options)
      } else if (isGeojsonPolygon(input)) {
        return this.transformForwardAsGeojson(input as GeojsonPolygon, options)
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return this.transformForwardAsGeojson(input as MultiPoint, options)
    } else if (isGeojsonMultiPoint(input)) {
      return this.transformForwardAsGeojson(input as GeojsonMultiPoint, options)
    } else if (isMultiLineString(input)) {
      return this.transformForwardAsGeojson(input as MultiLineString, options)
    } else if (isGeojsonMultiLineString(input)) {
      return this.transformForwardAsGeojson(
        input as GeojsonMultiLineString,
        options
      )
    } else if (isMultiPolygon(input)) {
      return this.transformForwardAsGeojson(input as MultiPolygon, options)
    } else if (isGeojsonMultiPolygon(input)) {
      return this.transformForwardAsGeojson(
        input as GeojsonMultiPolygon,
        options
      )
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
  transformToResource(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): MultiPoint
  transformToResource(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): MultiLineString
  transformToResource(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): MultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a Geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {Geometry} Backward transform of input, as a Geometry
   * @type {{
   * (input:Point | GeojsonPoint) => Point;
   * (input:LineString | GeojsonLineString) => LineString;
   * (input:Polygon | GeojsonPolygon) => Polygon;
   * (input:MultiPoint | GeojsonMultiPoint) => MultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => MultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => MultiPolygon;
   * }}
   */
  transformToResource(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
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
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return this.transformBackward(input as MultiPoint, options)
    } else if (isGeojsonMultiPoint(input)) {
      return this.transformBackward(input as GeojsonMultiPoint, options)
    } else if (isMultiLineString(input)) {
      return this.transformBackward(input as MultiLineString, options)
    } else if (isGeojsonMultiLineString(input)) {
      return this.transformBackward(input as GeojsonMultiLineString, options)
    } else if (isMultiPolygon(input)) {
      return this.transformBackward(input as MultiPolygon, options)
    } else if (isGeojsonMultiPolygon(input)) {
      return this.transformBackward(input as GeojsonMultiPolygon, options)
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
  transformToResourceAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: PartialTransformOptions
  ): GeojsonMultiPoint
  transformToResourceAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: PartialTransformOptions
  ): GeojsonMultiLineString
  transformToResourceAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: PartialTransformOptions
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a GeoJSON geometry
   * @param {Geometry | GeojsonGeometry} input - Input to transform
   * @returns {GeojsonGeometry} Backward transform of input, as a GeoJSON geometry
   * @type {{
   * (input:Point | GeojsonPoint) => GeojsonPoint;
   * (input:LineString | GeojsonLineString) => GeojsonLineString;
   * (input:Polygon | GeojsonPolygon) => GeojsonPolygon;
   * (input:MultiPoMultiint | GeojsonMultiPoint) => GeojsonMultiPoint;
   * (input:MultiLineString | GeojsonMultiLineString) => GeojsonMultiLineString;
   * (input:MultiPolygon | GeojsonMultiPolygon) => GeojsonMultiPolygon;
   * }}
   */
  transformToResourceAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: PartialTransformOptions
  ): GeojsonGeometry {
    if (!mergeOptions(options, this.options).inputIsMultiGeometry) {
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
      }
    }
    if (options) {
      options.inputIsMultiGeometry = false // false for piecewise single geometries
    }
    if (isMultiPoint(input)) {
      return this.transformBackwardAsGeojson(input as MultiPoint, options)
    } else if (isGeojsonMultiPoint(input)) {
      return this.transformBackwardAsGeojson(
        input as GeojsonMultiPoint,
        options
      )
    } else if (isMultiLineString(input)) {
      return this.transformBackwardAsGeojson(input as MultiLineString, options)
    } else if (isGeojsonMultiLineString(input)) {
      return this.transformBackwardAsGeojson(
        input as GeojsonMultiLineString,
        options
      )
    } else if (isMultiPolygon(input)) {
      return this.transformBackwardAsGeojson(input as MultiPolygon, options)
    } else if (isGeojsonMultiPolygon(input)) {
      return this.transformBackwardAsGeojson(
        input as GeojsonMultiPolygon,
        options
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  // Shortcuts for SVG <> GeoJSON

  /**
   * Transforms a SVG geometry forward to a GeoJSON geometry
   *
   * Note: Multi-geometries are not supported
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
   *
   * Note: Multi-geometries are not supported
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

  private assureEqualHandedness(point: Point): Point {
    return this.options?.differentHandedness ? flipY(point) : point
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
