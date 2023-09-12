import Helmert from './shared/helmert.js'
import Polynomial from './shared/polynomial.js'
import Projective from './shared/projective.js'
import RBF from './shared/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  transformLineStringForwardToLineString,
  transformLineStringBackwardToLineString,
  transformRingForwardToRing,
  transformRingBackwardToRing
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

  /**
   * Transforms position forward
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformForward(position: Position): Position {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.createForwardTransformation()
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
      this.backwardTransformation = this.createBackwardTransformation()
    }

    return this.backwardTransformation.interpolant(position)
  }

  // Alias

  /**
   * Transforms position forward (i.e. to geo)
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformToGeo(position: Position): Position {
    return this.transformForward(position)
  }

  /**
   * Transforms position backward (i.e. to resource)
   * @param {Position} position - Position to transform
   * @returns {Position} Backward transform of input position
   */
  transformToResource(position: Position): Position {
    return this.transformBackward(position)
  }

  // Position - Forward

  /**
   * Transforms position forward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Forward transform of input position
   */
  transformPositionForwardToPosition(position: Position): Position {
    return this.transformForward(position)
  }

  /**
   * Transforms position forward to GeoJSON point
   * @param {Position} position - Position to transform
   * @returns {GeoJSONPoint} Forward transform of input position, as GeoJSON point
   */
  transformPositionForwardToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(this.transformForward(position))
  }

  /**
   * Transforms GeoJSON point forward to position
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {Position} Forward transform of input position
   */
  transformGeoJSONPositionForwardToPosition(geometry: GeoJSONPoint): Position {
    return this.transformForward(convertGeoJSONPointToPosition(geometry))
  }

  /**
   * Transforms GeoJSON point forward to GeoJSON point
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {GeoJSONPoint} Forward transform of input position, as GeoJSON point
   */
  transformGeoJSONPositionForwardToGeoJSONPoint(
    geometry: GeoJSONPoint
  ): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformForward(convertGeoJSONPointToPosition(geometry))
    )
  }

  // Position - Backward

  /**
   * Transforms position backward to position
   * @param {Position} position - Position to transform
   * @returns {Position} Backward transform of input position
   */
  transformPositionBackwardToPosition(position: Position): Position {
    return this.transformBackward(position)
  }

  /**
   * Transforms GeoJSON point backward to position
   * @param {GeoJSONPoint} geometry - Position to transform, as GeoJSON point
   * @returns {Position} Backward transform of input position
   */
  transformGeoJSONPointBackwardToPosition(geometry: GeoJSONPoint): Position {
    return this.transformBackward(convertGeoJSONPointToPosition(geometry))
  }

  /**
   * Transforms position backward to GeoJSON point
   * @param {Position} position - Position to transform
   * @returns {GeoJSONPoint} Backward transform of input position, as GeoJSON point
   */
  transformPositionBackwardToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(this.transformBackward(position))
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
      this.transformBackward(convertGeoJSONPointToPosition(geometry))
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

  // Ring - Forward

  /**
   * Transforms ring forward to ring
   * @param {Ring} ring - Ring to transform
   * @returns {Ring} Forward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformRingForwardToRing(
    ring: Ring,
    options?: PartialTransformOptions
  ): Ring {
    return transformRingForwardToRing(this, ring, options)
  }

  /**
   * Transforms ring forward to GeoJSON polygon
   * @param {Ring} ring - Ring to transform
   * @returns {GeoJSONPolygon} Forward transform of input ring, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformRingForwardToGeoJSONPolygon(
    ring: Ring,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return convertRingToGeoJSONPolygon(
      transformRingForwardToRing(this, ring, options)
    )
  }

  /**
   * Transforms GeoJSON polygon forward to ring
   * @param {GeoJSONPolygon} geometry - Ring to transform, as GeoJSON polygon
   * @returns {Ring} Forward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonForwardToRing(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Ring {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return transformRingForwardToRing(
      this,
      convertGeoJSONPolygonToRing(geometry),
      options
    )
  }

  /**
   * Transforms GeoJSON polygon forward to GeoJSON polygon
   * @param {GeoJSONPolygon} geometry - Ring to transform, as GeoJSON polygon
   * @returns {GeoJSONPolygon} Forward transform of input ring, as GeoJSON polygon
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
    return convertRingToGeoJSONPolygon(
      transformRingForwardToRing(
        this,
        convertGeoJSONPolygonToRing(geometry),
        options
      )
    )
  }

  // Ring - Backward

  /**
   * Transforms ring backward to ring
   * @param {Ring} ring - Ring to transform
   * @returns {Ring} Backward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformRingBackwardToRing(
    ring: Ring,
    options?: PartialTransformOptions
  ): Ring {
    return transformRingBackwardToRing(this, ring, options)
  }

  /**
   * Transforms GeoJSONPolygon backward to ring
   * @param {GeoJSONPolygon} geometry - Ring to transform, as GeoJSON polygon
   * @returns {Ring} Backward transform of input ring
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformGeoJSONPolygonBackwardToRing(
    geometry: GeoJSONPolygon,
    options?: PartialTransformOptions
  ): Ring {
    if (options && !('destinationIsGeographic' in options)) {
      options.destinationIsGeographic = true
    }
    return transformRingBackwardToRing(
      this,
      convertGeoJSONPolygonToRing(geometry),
      options
    )
  }

  /**
   * Transforms ring backward to GeoJSON polygon
   * @param {Ring} ring - Ring to transform
   * @returns {GeoJSONPolygon} Backward transform of input ring, as GeoJSON polygon
   * @param {PartialTransformOptions} [options] - Partial Transform Options
   */
  transformRingBackwardToGeoJSONPolygon(
    ring: Ring,
    options?: PartialTransformOptions
  ): GeoJSONPolygon {
    if (options && !('sourceIsGeographic' in options)) {
      options.sourceIsGeographic = true
    }
    return convertRingToGeoJSONPolygon(
      transformRingBackwardToRing(this, ring, options)
    )
  }

  /**
   * Transforms GeoJSON polygon backward to GeoJSON polygon
   * @param {GeoJSONPolygon} geometry - Ring to transform, as GeoJSON polygon
   * @returns {GeoJSONPolygon} Backward transform of input ring, as GeoJSON polygon
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
    return convertRingToGeoJSONPolygon(
      transformRingBackwardToRing(
        this,
        convertGeoJSONPolygonToRing(geometry),
        options
      )
    )
  }
}
