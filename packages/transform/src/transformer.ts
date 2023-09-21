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
  convertPositionToGeoJSONPoint,
  convertLineStringToGeoJSONLineString,
  convertPolygonToGeoJSONPolygon,
  convertGeoJSONPointToPosition,
  convertGeoJSONLineStringToLineString,
  convertGeoJSONPolygonToPolygon,
  isPosition,
  isLineString,
  isPolygon,
  isGeoJSONPoint,
  isGeoJSONLineString,
  isGeoJSONPolygon
} from '@allmaps/stdlib'

import type {
  TransformGCP,
  TransformationType,
  PartialTransformOptions,
  GCPTransformerInterface,
  Transformation
} from './shared/types.js'

import type {
  Position,
  LineString,
  Polygon,
  Geometry,
  GCP,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon,
  GeoJSONGeometry
} from '@allmaps/types'

/** A Ground Controle Point Transformer, containing a forward and backward transformation and specifying functions to transform geometries using these transformations. */
export default class GCPTransformer implements GCPTransformerInterface {
  gcps: TransformGCP[]
  sourcePositions: Position[]
  destinationPositions: Position[]
  type: TransformationType

  forwardTransformation?: Transformation
  backwardTransformation?: Transformation

  /**
   * Create a GCPTransforer
   * @param {TransformGCP[] | GCP[]} gcps - An array of Ground Control Points (GCPs)
   * @param {TransformationType} type='polynomial' - The transformation type
   */ constructor(
    gcps: TransformGCP[] | GCP[],
    type: TransformationType = 'polynomial'
  ) {
    if (gcps.length == 0) {
      throw new Error('No control points.')
    }
    if ('resource' in gcps[0]) {
      this.gcps = gcps.map((p) => ({
        source: (p as GCP).resource,
        destination: (p as GCP).geo
      }))
    } else {
      this.gcps = gcps as TransformGCP[]
    }
    this.sourcePositions = this.gcps.map((gcp) => gcp.source)
    this.destinationPositions = this.gcps.map((gcp) => gcp.destination)
    this.type = type
  }

  createForwardTransformation(): Transformation {
    return this.createTransformation(
      this.sourcePositions,
      this.destinationPositions
    )
  }

  createBackwardTransformation(): Transformation {
    return this.createTransformation(
      this.destinationPositions,
      this.sourcePositions
    )
  }

  createTransformation(
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
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): Position
  transformForward(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString
  transformForward(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson geometry forward to geometry
   * @param {Geometry | GeoJSONGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {Geometry} Forward transform of input as geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => Position;
   * (input:LineString | GeoJSONLineString) => LineString;
   * (input:Polygon | GeoJSONPolygon) => Polygon;
   * }}
   */
  transformForward(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      if (!this.forwardTransformation) {
        this.forwardTransformation = this.createForwardTransformation()
      }
      return this.forwardTransformation.interpolant(input)
    } else if (isGeoJSONPoint(input)) {
      return this.transformForward(convertGeoJSONPointToPosition(input))
    } else if (isLineString(input)) {
      return transformLineStringForwardToLineString(this, input, options)
    } else if (isGeoJSONLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return transformLineStringForwardToLineString(
        this,
        convertGeoJSONLineStringToLineString(input),
        options
      )
    } else if (isPolygon(input)) {
      return transformPolygonForwardToPolygon(this, input, options)
    } else if (isGeoJSONPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return transformPolygonForwardToPolygon(
        this,
        convertGeoJSONPolygonToPolygon(input),
        options
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformForwardAsGeoJSON(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): GeoJSONPoint
  transformForwardAsGeoJSON(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString
  transformForwardAsGeoJSON(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon
  /**
   * Transforms geometry or geojson geometry forward to geojson geometry
   * @param {Geometry | GeoJSONGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {GeoJSONGeometry} Forward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => GeoJSONPoint;
   * (input:LineString | GeoJSONLineString) => GeoJSONLineString;
   * (input:Polygon | GeoJSONPolygon) => GeoJSONPolygon;
   * }}
   */
  transformForwardAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return convertPositionToGeoJSONPoint(this.transformForward(input))
    } else if (isGeoJSONPoint(input)) {
      return convertPositionToGeoJSONPoint(
        this.transformForward(convertGeoJSONPointToPosition(input))
      )
    } else if (isLineString(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeoJSONLineString(
        transformLineStringForwardToLineString(this, input, options)
      )
    } else if (isGeoJSONLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeoJSONLineString(
        transformLineStringForwardToLineString(
          this,
          convertGeoJSONLineStringToLineString(input),
          options
        )
      )
    } else if (isPolygon(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeoJSONPolygon(
        transformPolygonForwardToPolygon(this, input, options)
      )
    } else if (isGeoJSONPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeoJSONPolygon(
        transformPolygonForwardToPolygon(
          this,
          convertGeoJSONPolygonToPolygon(input),
          options
        )
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformBackward(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): Position
  transformBackward(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString
  transformBackward(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson geometry backward to geometry
   * @param {Geometry | GeoJSONGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {Geometry} backward transform of input, as geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => Position;
   * (input:LineString | GeoJSONLineString) => LineString;
   * (input:Polygon | GeoJSONPolygon) => Polygon;
   * }}
   */
  transformBackward(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      if (!this.backwardTransformation) {
        this.backwardTransformation = this.createBackwardTransformation()
      }

      return this.backwardTransformation.interpolant(input)
    } else if (isGeoJSONPoint(input)) {
      return this.transformBackward(convertGeoJSONPointToPosition(input))
    } else if (isLineString(input)) {
      return transformLineStringBackwardToLineString(this, input, options)
    } else if (isGeoJSONLineString(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return transformLineStringBackwardToLineString(
        this,
        convertGeoJSONLineStringToLineString(input),
        options
      )
    } else if (isPolygon(input)) {
      return transformPolygonBackwardToPolygon(this, input, options)
    } else if (isGeoJSONPolygon(input)) {
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return transformPolygonBackwardToPolygon(
        this,
        convertGeoJSONPolygonToPolygon(input),
        options
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformBackwardAsGeoJSON(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): GeoJSONPoint
  transformBackwardAsGeoJSON(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString
  transformBackwardAsGeoJSON(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon
  /**
   * Transforms geometry or geojson geometry backward to geojson geometry
   * @param {Geometry | GeoJSONGeometry} input - Geometry or geojson geometry to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {GeoJSONGeometry} backward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => GeoJSONPoint;
   * (input:LineString | GeoJSONLineString) => GeoJSONLineString;
   * (input:Polygon | GeoJSONPolygon) => GeoJSONPolygon;
   * }}
   */
  transformBackwardAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return convertPositionToGeoJSONPoint(this.transformBackward(input))
    } else if (isGeoJSONPoint(input)) {
      return convertPositionToGeoJSONPoint(
        this.transformBackward(convertGeoJSONPointToPosition(input))
      )
    } else if (isLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return convertLineStringToGeoJSONLineString(
        transformLineStringBackwardToLineString(this, input, options)
      )
    } else if (isGeoJSONLineString(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertLineStringToGeoJSONLineString(
        transformLineStringBackwardToLineString(
          this,
          convertGeoJSONLineStringToLineString(input),
          options
        )
      )
    } else if (isPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      return convertPolygonToGeoJSONPolygon(
        transformPolygonBackwardToPolygon(this, input, options)
      )
    } else if (isGeoJSONPolygon(input)) {
      if (options && !('sourceIsGeographic' in options)) {
        options.sourceIsGeographic = true
      }
      if (options && !('destinationIsGeographic' in options)) {
        options.destinationIsGeographic = true
      }
      return convertPolygonToGeoJSONPolygon(
        transformPolygonBackwardToPolygon(
          this,
          convertGeoJSONPolygonToPolygon(input),
          options
        )
      )
    } else {
      throw new Error('Input type not supported')
    }
  }

  // Alias

  transformToGeo(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): Position
  transformToGeo(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToGeo(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson gemetry forward (i.e. to geo), as geometry
   * @param {Geometry | GeoJSONGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => Position;
   * (input:LineString | GeoJSONLineString) => LineString;
   * (input:Polygon | GeoJSONPolygon) => Polygon;
   * }}
   */
  transformToGeo(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformForward(input as Position, options)
    } else if (isGeoJSONPoint(input)) {
      return this.transformForward(input as GeoJSONPoint, options)
    } else if (isLineString(input)) {
      return this.transformForward(input as LineString, options)
    } else if (isGeoJSONLineString(input)) {
      return this.transformForward(input as GeoJSONLineString, options)
    } else if (isPolygon(input)) {
      return this.transformForward(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformForward(input as GeoJSONPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToGeoAsGeoJSON(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): GeoJSONPoint
  transformToGeoAsGeoJSON(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString
  transformToGeoAsGeoJSON(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon
  /**
   * Transforms geometry or geojson gemetry forward (i.e. to geo), as geojson geometry
   * @param {Geometry | GeoJSONGeometry} input - Input to transform
   * @returns {Geometry} Forward transform of input, as geojson geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => GeoJSONPoint;
   * (input:LineString | GeoJSONLineString) => GeoJSONLineString;
   * (input:Polygon | GeoJSONPolygon) => GeoJSONPolygon;
   * }}
   */
  transformToGeoAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return this.transformForwardAsGeoJSON(input as Position, options)
    } else if (isGeoJSONPoint(input)) {
      return this.transformForwardAsGeoJSON(input as GeoJSONPoint, options)
    } else if (isLineString(input)) {
      return this.transformForwardAsGeoJSON(input as LineString, options)
    } else if (isGeoJSONLineString(input)) {
      return this.transformForwardAsGeoJSON(input as GeoJSONLineString, options)
    } else if (isPolygon(input)) {
      return this.transformForwardAsGeoJSON(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformForwardAsGeoJSON(input as GeoJSONPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToResource(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): Position
  transformToResource(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString
  transformToResource(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon
  /**
   * Transforms geometry or geojson gemetry backward (i.e. to geo), as geometry
   * @param {Geometry | GeoJSONGeometry} input - Input to transform
   * @returns {Geometry} Backward transform of input, as geometry
   * @type {{
   * (input:Position | GeoJSONPoint) => Position;
   * (input:LineString | GeoJSONLineString) => LineString;
   * (input:Polygon | GeoJSONPolygon) => Polygon;
   * }}
   */
  transformToResource(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformBackward(input as Position, options)
    } else if (isGeoJSONPoint(input)) {
      return this.transformBackward(input as GeoJSONPoint, options)
    } else if (isLineString(input)) {
      return this.transformBackward(input as LineString, options)
    } else if (isGeoJSONLineString(input)) {
      return this.transformBackward(input as GeoJSONLineString, options)
    } else if (isPolygon(input)) {
      return this.transformBackward(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformBackward(input as GeoJSONPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }

  transformToResourceAsGeoJSON(
    input: Position | GeoJSONPoint,
    options?: PartialTransformOptions
  ): GeoJSONPoint
  transformToResourceAsGeoJSON(
    input: LineString | GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString
  transformToResourceAsGeoJSON(
    input: Polygon | GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon
  /**
   * Transforms geometry or geojson gemetry backward (i.e. to geo), as geojson gemetry
   * @param {Geometry | GeoJSONGeometry} input - Input to transform
   * @returns {GeoJSONGeometry} Backward transform of input, as geojson gemetry
   * @type {{
   * (input:Position | GeoJSONPoint) => GeoJSONPoint;
   * (input:LineString | GeoJSONLineString) => GeoJSONLineString;
   * (input:Polygon | GeoJSONPolygon) => GeoJSONPolygon;
   * }}
   */
  transformToResourceAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return this.transformBackwardAsGeoJSON(input as Position, options)
    } else if (isGeoJSONPoint(input)) {
      return this.transformBackwardAsGeoJSON(input as GeoJSONPoint, options)
    } else if (isLineString(input)) {
      return this.transformBackwardAsGeoJSON(input as LineString, options)
    } else if (isGeoJSONLineString(input)) {
      return this.transformBackwardAsGeoJSON(
        input as GeoJSONLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformBackwardAsGeoJSON(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformBackwardAsGeoJSON(input as GeoJSONPolygon, options)
    } else {
      throw new Error('Input type not supported')
    }
  }
}
