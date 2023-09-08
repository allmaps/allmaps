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
  OptionalTransformOptions,
  GCPTransformerInterface,
  Transform
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
  gcps: TransformGCP[]
  sourcePositions: Position[]
  destinationPositions: Position[]
  type: TransformationType

  forwardTransform?: Transform
  backwardTransform?: Transform

  constructor(
    gcps: TransformGCP[] | GCP[],
    type: TransformationType = 'polynomial'
  ) {
    if (gcps.length == 0) {
      throw new Error('No controle points.')
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

  createForwardTransform(): Transform {
    return this.createTransform(this.sourcePositions, this.destinationPositions)
  }

  createBackwardTransform(): Transform {
    return this.createTransform(this.destinationPositions, this.sourcePositions)
  }

  createTransform(
    sourcePositions: Position[],
    destinationPositions: Position[]
  ): Transform {
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
