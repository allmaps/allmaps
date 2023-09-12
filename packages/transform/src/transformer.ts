import Helmert from './shared/helmert.js'
import Polynomial from './shared/polynomial.js'
import Projective from './shared/projective.js'
import RBF from './shared/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  transformForwardLineStringToLineString,
  transformBackwardLineStringToLineString,
  transformForwardRingToRing,
  transformBackwardRingToRing
} from './shared/transform-helper-functions.js'

import {
  convertPositionToGeoJSONPoint,
  convertLineStringToGeoJSONLineString,
  convertRingToGeoJSONPolygon,
  convertGeoJSONPointToPosition,
  convertGeoJSONLineStringToLineString,
  convertGeoJSONPolygonToRing
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
  Ring,
  GCP,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon
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

  createForwardTransform(): Transformation {
    return this.createTransform(this.sourcePositions, this.destinationPositions)
  }

  createBackwardTransform(): Transformation {
    return this.createTransform(this.destinationPositions, this.sourcePositions)
  }

  createTransform(
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

  // Base

  /**
   * Transforms position forward
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformForward(position: Position): Position {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.createForwardTransform()
    }

    return this.forwardTransformation.interpolant(position)
  }

  /**
   * Transforms position backward
   * @param {Position} position - Position to transform
   * @returns {Position} Backard transform of input position
   */
  transformBackward(position: Position): Position {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.createBackwardTransform()
    }

    return this.backwardTransformation.interpolant(position)
  }

  // Alias

  /**
   * Transforms position forward
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  toGeo(position: Position): Position {
    return this.transformForward(position)
  }

  /**
   * Transforms position backward
   * @param {Position} position - Position to transform
   * @returns {Position} Backward transform of input position
   */
  toResource(position: Position): Position {
    return this.transformBackward(position)
  }

  // Position

  /**
   * Transforms position forward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformForwardPositionToPosition(position: Position): Position {
    return this.transformForward(position)
  }

  /**
   * Transforms position forward to GeoJSON point
   * @param {Position} position - Position to transform
   * @returns {GeoJSONPoint} Forward transform of input position, as GeoJSON point
   */
  transformForwardPositionToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(this.transformForward(position))
  }

  /**
   * Transforms position backward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Backward transform of input position
   */
  transformBackwardPositionToPosition(position: Position): Position {
    return this.transformBackward(position)
  }

  /**
   * Transforms GeoJSON point backward to position
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {Position} Backward transform of input position
   */
  transformBackwardGeoJSONPointToPosition(geometry: GeoJSONPoint): Position {
    return this.transformBackward(convertGeoJSONPointToPosition(geometry))
  }

  // LineString

  /**
   * Transforms lineString forward to lineString
   * @param {LineString} lineString - LineString to transform
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   * @returns {LineString} Forward transform of input lineString
   */
  transformForwardLineStringToLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): LineString {
    return transformForwardLineStringToLineString(this, lineString, options)
  }

  /**
   * Transforms lineString forward to GeoJSON lineString
   * @param {LineString} lineString - LineString to transform
   * @returns {GeoJSONLineString} Forward transform of input lineString, as GeoJSON lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformForwardLineStringToGeoJSONLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): GeoJSONLineString {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformForwardLineStringToLineString(this, lineString, options)
    )
  }

  /**
   * Transforms lineString backward to lineString
   * @param {LineString} lineString - LineString to transform
   * @returns {LineString} Backward transform of input lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformBackwardLineStringToLineString(
    lineString: LineString,
    options?: PartialTransformOptions
  ): LineString {
    return transformBackwardLineStringToLineString(this, lineString, options)
  }

  /**
   * Transforms GeoJSON lineString backward to lineString
   * @param {GeoJSONLineString} geometry - LineString to transform, as GeoJSON lineString
   * @returns {LineString} Backward transform of input lineString
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformBackwardGeoJSONLineStringToLineString(
    geometry: GeoJSONLineString,
    options?: PartialTransformOptions
  ): LineString {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return transformBackwardLineStringToLineString(
      this,
      convertGeoJSONLineStringToLineString(geometry),
      options
    )
  }

  // Ring

  /**
   * Transforms ring forward to ring
   * @param {Ring} ring - Ring to transform
   * @returns {Ring} Forward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformForwardRingToRing(
    ring: Ring,
    options?: PartialTransformOptions
  ): Ring {
    return transformForwardRingToRing(this, ring, options)
  }

  /**
   * Transforms ring forward to GeoJSONPolygon
   * @param {Ring} ring - Ring to transform
   * @returns {GeoJSONPolygon} Forward transform of input ring, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformForwardRingToGeoJSONPolygon(
    ring: Ring,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return convertRingToGeoJSONPolygon(
      transformForwardRingToRing(this, ring, options)
    )
  }

  /**
   * Transforms ring backward to ring
   * @param {Ring} ring - Ring to transform
   * @returns {Ring} Backward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformBackwardRingToRing(
    ring: Ring,
    options?: PartialTransformOptions
  ): Ring {
    return transformBackwardRingToRing(this, ring, options)
  }

  /**
   * Transforms GeoJSONPolygon backward to ring
   * @param {GeoJSONPolygon} geometry - Ring to transform, as GeoJSON polygon
   * @returns {Ring} Backward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformBackwardGeoJSONPolygonToRing(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Ring {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return transformBackwardRingToRing(
      this,
      convertGeoJSONPolygonToRing(geometry),
      options
    )
  }
}
