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
   */
  transformForward(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformPositionForwardToPosition(input as Position)
    } else if (isGeoJSONPoint(input)) {
      return this.transformGeoJSONPointForwardToPosition(input as GeoJSONPoint)
    } else if (isLineString(input)) {
      return this.transformLineStringForwardToLineString(
        input as LineString,
        options
      )
    } else if (isGeoJSONLineString(input)) {
      return this.transformGeoJSONLineStringForwardToLineString(
        input as GeoJSONLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformPolygonForwardToPolygon(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformGeoJSONPolygonForwardToPolygon(
        input as GeoJSONPolygon,
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
   */
  transformForwardAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return this.transformPositionForwardToGeoJSONPoint(input as Position)
    } else if (isGeoJSONPoint(input)) {
      return this.transformGeoJSONPointForwardToGeoJSONPoint(
        input as GeoJSONPoint
      )
    } else if (isLineString(input)) {
      return this.transformLineStringForwardToGeoJSONLineString(
        input as LineString,
        options
      )
    } else if (isGeoJSONLineString(input)) {
      return this.transformGeoJSONLineStringForwardToGeoJSONLineString(
        input as GeoJSONLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformPolygonForwardToGeoJSONPolygon(
        input as Polygon,
        options
      )
    } else if (isGeoJSONPolygon(input)) {
      return this.transformGeoJSONPolygonForwardToGeoJSONPolygon(
        input as GeoJSONPolygon,
        options
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
   */
  transformBackward(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): Geometry {
    if (isPosition(input)) {
      return this.transformPositionBackwardToPosition(input as Position)
    } else if (isGeoJSONPoint(input)) {
      return this.transformGeoJSONPointBackwardToPosition(input as GeoJSONPoint)
    } else if (isLineString(input)) {
      return this.transformLineStringBackwardToLineString(
        input as LineString,
        options
      )
    } else if (isGeoJSONLineString(input)) {
      return this.transformGeoJSONLineStringBackwardToLineString(
        input as GeoJSONLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformPolygonBackwardToPolygon(input as Polygon, options)
    } else if (isGeoJSONPolygon(input)) {
      return this.transformGeoJSONPolygonBackwardToPolygon(
        input as GeoJSONPolygon,
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
   */
  transformBackwardAsGeoJSON(
    input: Geometry | GeoJSONGeometry,
    options?: PartialTransformOptions
  ): GeoJSONGeometry {
    if (isPosition(input)) {
      return this.transformPositionBackwardToGeoJSONPoint(input as Position)
    } else if (isGeoJSONPoint(input)) {
      return this.transformGeoJSONPointBackwardToGeoJSONPoint(
        input as GeoJSONPoint
      )
    } else if (isLineString(input)) {
      return this.transformLineStringBackwardToGeoJSONLineString(
        input as LineString,
        options
      )
    } else if (isGeoJSONLineString(input)) {
      return this.transformGeoJSONLineStringBackwardToGeoJSONLineString(
        input as GeoJSONLineString,
        options
      )
    } else if (isPolygon(input)) {
      return this.transformPolygonBackwardToGeoJSONPolygon(
        input as Polygon,
        options
      )
    } else if (isGeoJSONPolygon(input)) {
      return this.transformGeoJSONPolygonBackwardToGeoJSONPolygon(
        input as GeoJSONPolygon,
        options
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

  // Position - Forward

  /**
   * Transforms position forward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformPositionForwardToPosition(position: Position): Position {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.createForwardTransformation()
    }

    return this.forwardTransformation.interpolant(position)
  }

  /**
   * Transforms position forward to GeoJSON point
   * @param {Position} position - Position to transform
   * @returns {GeoJSONPoint} Forward transform of input position, as GeoJSON point
   */
  transformPositionForwardToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformPositionForwardToPosition(position)
    )
  }

  /**
   * Transforms GeoJSON point forward to position
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {Position} Forward transform of input position
   */
  transformGeoJSONPointForwardToPosition(geometry: GeoJSONPoint): Position {
    return this.transformPositionForwardToPosition(
      convertGeoJSONPointToPosition(geometry)
    )
  }

  /**
   * Transforms GeoJSON point forward to GeoJSON point
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {GeoJSONPoint} Forward transform of input position, as GeoJSON point
   */
  transformGeoJSONPointForwardToGeoJSONPoint(
    geometry: GeoJSONPoint
  ): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformPositionForwardToPosition(
        convertGeoJSONPointToPosition(geometry)
      )
    )
  }

  // Position - Backward

  /**
   * Transforms position backward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Backward transform of input position
   */
  transformPositionBackwardToPosition(position: Position): Position {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.createBackwardTransformation()
    }

    return this.backwardTransformation.interpolant(position)
  }

  /**
   * Transforms GeoJSON point backward to position
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {Position} Backward transform of input position
   */
  transformGeoJSONPointBackwardToPosition(geometry: GeoJSONPoint): Position {
    return this.transformPositionBackwardToPosition(
      convertGeoJSONPointToPosition(geometry)
    )
  }

  /**
   * Transforms position backward to GeoJSON point
   * @param {Position} position - Position to transform
   * @returns {GeoJSONPoint} Backward transform of input position, as GeoJSON point
   */
  transformPositionBackwardToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformPositionBackwardToPosition(position)
    )
  }

  /**
   * Transforms GeoJSON point backward to GeoJSON point
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {GeoJSONPoint} Backward transform of input position, as GeoJSON point
   */
  transformGeoJSONPointBackwardToGeoJSONPoint(
    geometry: GeoJSONPoint
  ): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformPositionBackwardToPosition(
        convertGeoJSONPointToPosition(geometry)
      )
    )
  }

  // LineString - Forward

  /**
   * Transforms lineString forward to lineString
   * @param {LineString} lineString - LineString to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {LineString} Forward transform of input lineString
   */
  transformLineStringForwardToLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): LineString {
    return transformLineStringForwardToLineString(this, lineString, options)
  }

  /**
   * Transforms lineString forward to GeoJSON lineString
   * @param {LineString} lineString - LineString to transform
   * @returns {GeoJSONLineString} Forward transform of input lineString, as GeoJSON lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformLineStringForwardToGeoJSONLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformLineStringForwardToLineString(this, lineString, options)
    )
  }

  /**
   * Transforms GeoJSON lineString forward to lineString
   * @param {GeoJSONLineString} geometry - LineString to transform, as GeoJSON lineString
   * @returns {LineString} Forward transform of input lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONLineStringForwardToLineString(
    geometry: GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return transformLineStringForwardToLineString(
      this,
      convertGeoJSONLineStringToLineString(geometry),
      options
    )
  }

  /**
   * Transforms GeoJSON lineString forward to GeoJSON lineString
   * @param {GeoJSONLineString} geometry - LineString to transform, as GeoJSON lineString
   * @returns {GeoJSONLineString} Forward transform of input lineString, as GeoJSON lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options, as GeoJSON lineString
   */
  transformGeoJSONLineStringForwardToGeoJSONLineString(
    geometry: GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformLineStringForwardToLineString(
        this,
        convertGeoJSONLineStringToLineString(geometry),
        options
      )
    )
  }

  // LineString - Backward

  /**
   * Transforms lineString backward to lineString
   * @param {LineString} lineString - LineString to transform
   * @returns {LineString} Backward transform of input lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformLineStringBackwardToLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): LineString {
    return transformLineStringBackwardToLineString(this, lineString, options)
  }

  /**
   * Transforms GeoJSON lineString backward to lineString
   * @param {GeoJSONLineString} geometry - LineString to transform, as GeoJSON lineString
   * @returns {LineString} Backward transform of input lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONLineStringBackwardToLineString(
    geometry: GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return transformLineStringBackwardToLineString(
      this,
      convertGeoJSONLineStringToLineString(geometry),
      options
    )
  }

  /**
   * Transforms lineString backward to GeoJSON lineString
   * @param {LineString} lineString - LineString to transform
   * @returns {GeoJSONLineString} Backward transform of input lineString, as GeoJSON lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformLineStringBackwardToGeoJSONLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformLineStringBackwardToLineString(this, lineString, options)
    )
  }

  /**
   * Transforms GeoJSON lineString backward to GeoJSON lineString
   * @param {GeoJSONLineString} geometry - LineString to transform, as GeoJSON lineString
   * @returns {GeoJSONLineString} Backward transform of input lineString, as GeoJSON lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options, as GeoJSON lineString
   */
  transformGeoJSONLineStringBackwardToGeoJSONLineString(
    geometry: GeoJSONLineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformLineStringBackwardToLineString(
        this,
        convertGeoJSONLineStringToLineString(geometry),
        options
      )
    )
  }

  // Polygon - Forward

  /**
   * Transforms polygon forward to polygon
   * @param {Polygon} polygon - polygon to transform
   * @returns {Polygon} Forward transform of input polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformPolygonForwardToPolygon(
    polygon: Polygon,
    options?: PartialTransformOptions
  ): Polygon {
    return transformPolygonForwardToPolygon(this, polygon, options)
  }

  /**
   * Transforms polygon forward to GeoJSON polygon
   * @param {Polygon} polygon - Polygon to transform
   * @returns {GeoJSONPolygon} Forward transform of input polygon, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformPolygonForwardToGeoJSONPolygon(
    polygon: Polygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertPolygonToGeoJSONPolygon(
      transformPolygonForwardToPolygon(this, polygon, options)
    )
  }

  /**
   * Transforms GeoJSON polygon forward to polygon
   * @param {GeoJSONPolygon} geometry - Polygon to transform, as GeoJSON polygon
   * @returns {Polygon} Forward transform of input polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonForwardToPolygon(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return transformPolygonForwardToPolygon(
      this,
      convertGeoJSONPolygonToPolygon(geometry),
      options
    )
  }

  /**
   * Transforms GeoJSON polygon forward to GeoJSON polygon
   * @param {GeoJSONPolygon} geometry - Polygon to transform, as GeoJSON polygon
   * @returns {GeoJSONPolygon} Forward transform of input polygon, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonForwardToGeoJSONPolygon(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertPolygonToGeoJSONPolygon(
      transformPolygonForwardToPolygon(
        this,
        convertGeoJSONPolygonToPolygon(geometry),
        options
      )
    )
  }

  // Polygon - Backward

  /**
   * Transforms polygon backward to polygon
   * @param {Polygon} polygon - Polygon to transform
   * @returns {Polygon} Backward transform of input polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformPolygonBackwardToPolygon(
    polygon: Polygon,
    options?: PartialTransformOptions
  ): Polygon {
    return transformPolygonBackwardToPolygon(this, polygon, options)
  }

  /**
   * Transforms GeoJSONPolygon backward to polygon
   * @param {GeoJSONPolygon} geometry - Polygon to transform, as GeoJSON polygon
   * @returns {Polygon} Backward transform of input polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonBackwardToPolygon(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Polygon {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return transformPolygonBackwardToPolygon(
      this,
      convertGeoJSONPolygonToPolygon(geometry),
      options
    )
  }

  /**
   * Transforms polygon backward to GeoJSON polygon
   * @param {Polygon} polygon - Polygon to transform
   * @returns {GeoJSONPolygon} Backward transform of input polygon, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformPolygonBackwardToGeoJSONPolygon(
    polygon: Polygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return convertPolygonToGeoJSONPolygon(
      transformPolygonBackwardToPolygon(this, polygon, options)
    )
  }

  /**
   * Transforms GeoJSON polygon backward to GeoJSON polygon
   * @param {GeoJSONPolygon} geometry - Polygon to transform, as GeoJSON polygon
   * @returns {GeoJSONPolygon} Backward transform of input polygon, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonBackwardToGeoJSONPolygon(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertPolygonToGeoJSONPolygon(
      transformPolygonBackwardToPolygon(
        this,
        convertGeoJSONPolygonToPolygon(geometry),
        options
      )
    )
  }
}
