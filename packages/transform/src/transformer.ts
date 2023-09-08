import HelmertGCPTransformer from './transformers/helmert-transformer.js'
import PolynomialGCPTransformer from './transformers/polynomial-transformer.js'
import ProjectiveGCPTransformer from './transformers/projective-transformer.js'
import RadialBasisFunctionGCPTransformer from './transformers/radial-basis-function-transformer.js'

import { thinPlateKernel } from './shared/kernel-functions.js'

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
  type: TransformationType
  transformer: GCPTransformerInterface

  constructor(
    gcps: GCP[],
    type: TransformationType = 'polynomial'
    // options: TransformationOptions
  ) {
    this.gcps = gcps
    this.type = type

    if (type === 'helmert') {
      this.transformer = new HelmertGCPTransformer(gcps)
    } else if (type === 'polynomial1' || type === 'polynomial') {
      this.transformer = new PolynomialGCPTransformer(gcps)
    } else if (type === 'polynomial2') {
      this.transformer = new PolynomialGCPTransformer(gcps, 2)
    } else if (type === 'polynomial3') {
      this.transformer = new PolynomialGCPTransformer(gcps, 3)
    } else if (type === 'projective') {
      this.transformer = new ProjectiveGCPTransformer(gcps)
    } else if (type === 'thinPlateSpline') {
      this.transformer = new RadialBasisFunctionGCPTransformer(
        gcps,
        thinPlateKernel
      )
    } else {
      throw new Error(`Unsupported transformation type: ${type}`)
    }
  }

  // Base

  transformForward(point: Position): Position {
    return this.transformer.transformForward(point)
  }

  transformBackward(point: Position): Position {
    return this.transformer.transformBackward(point)
  }

  // Alternatives

  toGeo(point: Position): Position {
    return this.transformer.toGeo(point)
  }

  toResource(point: Position): Position {
    return this.transformer.toResource(point)
  }

  // Position

  transformForwardPositionToPosition(position: Position): Position {
    return this.transformer.transformForward(position)
  }

  transformForwardPositionToGeoJSONPoint(position: Position): GeoJSONPoint {
    return convertPositionToGeoJSONPoint(
      this.transformer.transformForward(position)
    )
  }

  transformBackwardPositionToPosition(position: Position): Position {
    return this.transformer.transformBackward(position)
  }

  transformBackwardGeoJSONPointToPosition(geometry: GeoJSONPoint): Position {
    return this.transformer.transformBackward(
      convertGeoJSONPointToPosition(geometry)
    )
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
