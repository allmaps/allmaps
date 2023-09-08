import Helmert from './shared/helmert.js'
import Polynomial from './shared/polynomial.js'
import Projective from './shared/projective.js'
import RBF from './shared/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  convertPositionToGeoJSONPoint,
  convertLineStringToGeoJSONLineString,
  convertRingToGeoJSONPolygon,
  convertGeoJSONPointToPosition,
  convertGeoJSONLineStringToLineString,
  convertGeoJSONPolygonToRing
} from '@allmaps/stdlib'

import {
  transformForwardLineStringToLineString,
  transformBackwardLineStringToLineString,
  transformForwardRingToRing,
  transformBackwardRingToRing
} from './shared/transform-helper-functions.js'

import type {
  GCPTransformerInterface,
  Transform,
  TransformationType,
  OptionalTransformOptions
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

export default class GCPTransformer implements GCPTransformerInterface {
  gcps: GCP[]
  sourcePositions: Position[]
  destinationPositions: Position[]
  type: TransformationType

  forwardTransform?: Transform
  backwardTransform?: Transform

  constructor(gcps: GCP[], type: TransformationType = 'polynomial') {
    this.gcps = gcps
    this.sourcePositions = gcps.map((gcp) => gcp.resource)
    this.destinationPositions = gcps.map((gcp) => gcp.geo)
    this.type = type
  }

  createForwardTransform(): Transform {
    if (this.type === 'helmert') {
      return new Helmert(this.sourcePositions, this.destinationPositions)
    } else if (this.type === 'polynomial1' || this.type === 'polynomial') {
      return new Polynomial(this.sourcePositions, this.destinationPositions)
    } else if (this.type === 'polynomial2') {
      return new Polynomial(this.sourcePositions, this.destinationPositions, 2)
    } else if (this.type === 'polynomial3') {
      return new Polynomial(this.sourcePositions, this.destinationPositions, 3)
    } else if (this.type === 'projective') {
      return new Projective(this.sourcePositions, this.destinationPositions)
    } else if (this.type === 'thinPlateSpline') {
      return new RBF(
        this.sourcePositions,
        this.destinationPositions,
        thinPlateKernel,
        euclideanNorm
      )
    } else {
      throw new Error(`Unsupported transformation type: ${this.type}`)
    }
  }

  createBackwardTransform(): Transform {
    if (this.type === 'helmert') {
      return new Helmert(this.destinationPositions, this.sourcePositions)
    } else if (this.type === 'polynomial1' || this.type === 'polynomial') {
      return new Polynomial(this.destinationPositions, this.sourcePositions)
    } else if (this.type === 'polynomial2') {
      return new Polynomial(this.destinationPositions, this.sourcePositions, 2)
    } else if (this.type === 'polynomial3') {
      return new Polynomial(this.destinationPositions, this.sourcePositions, 3)
    } else if (this.type === 'projective') {
      return new Projective(this.destinationPositions, this.sourcePositions)
    } else if (this.type === 'thinPlateSpline') {
      return new RBF(
        this.destinationPositions,
        this.sourcePositions,
        thinPlateKernel,
        euclideanNorm
      )
    } else {
      throw new Error(`Unsupported transformation type: ${this.type}`)
    }
  }

  // Base

  transformForward(position: Position): Position {
    if (!this.forwardTransform) {
      this.forwardTransform = this.createForwardTransform()
    }

    return this.forwardTransform.interpolant(position)
  }

  transformBackward(position: Position): Position {
    if (!this.backwardTransform) {
      this.backwardTransform = this.createBackwardTransform()
    }

    return this.backwardTransform.interpolant(position)
  }

  // Alias

  toGeo(position: Position): Position {
    return this.transformForward(position)
  }

  toResource(position: Position): Position {
    return this.transformBackward(position)
  }

  // Position

  transformForwardPositionToPosition(position: Position): Position {
    return this.transformForward(position)
  }

  transformForwardPositionToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(this.transformForward(position))
  }

  transformBackwardPositionToPosition(position: Position): Position {
    return this.transformBackward(position)
  }

  transformBackwardGeoJSONPointToPosition(geometry: GeoJSONPoint): Position {
    return this.transformBackward(convertGeoJSONPointToPosition(geometry))
  }

  // LineString

  transformForwardLineStringToLineString(
    lineString: LineString,
    options?: OptionalTransformOptions
  ): LineString {
    return transformForwardLineStringToLineString(this, lineString, options)
  }

  transformForwardLineStringToGeoJSONLineString(
    lineString: LineString,
    options?: OptionalTransformOptions
  ): GeoJSONLineString {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return convertLineStringToGeoJSONLineString(
      transformForwardLineStringToLineString(this, lineString, options)
    )
  }

  transformBackwardLineStringToLineString(
    lineString: LineString,
    options?: OptionalTransformOptions
  ): LineString {
    return transformBackwardLineStringToLineString(this, lineString, options)
  }

  transformBackwardGeoJSONLineStringToLineString(
    geometry: GeoJSONLineString,
    options?: OptionalTransformOptions
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

  transformForwardRingToRing(
    ring: Ring,
    options?: OptionalTransformOptions
  ): Ring {
    return transformForwardRingToRing(this, ring, options)
  }

  transformForwardRingToGeoJSONPolygon(
    ring: Ring,
    options?: OptionalTransformOptions
  ): GeoJSONPolygon {
    if (options && !('geographic' in options)) {
      options.geographic = true
    }
    return convertRingToGeoJSONPolygon(
      transformForwardRingToRing(this, ring, options)
    )
  }

  transformBackwardRingToRing(
    ring: Ring,
    options?: OptionalTransformOptions
  ): Ring {
    return transformBackwardRingToRing(this, ring, options)
  }

  transformBackwardGeoJSONPolygonToRing(
    geometry: GeoJSONPolygon,
    options?: OptionalTransformOptions
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
