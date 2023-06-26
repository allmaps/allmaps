import HelmertGCPTransformer from './transformers/helmert-transformer.js'
import PolynomialGCPTransformer from './transformers/polynomial-transformer.js'
import ProjectiveGCPTransformer from './transformers/projective-transformer.js'
import RadialBasisFunctionGCPTransformer from './transformers/radial-basis-function-transformer.js'

import { thinPlateKernel } from './shared/kernel-functions.js'

import {
  toGeoJSONPoint,
  toGeoJSONLineString,
  toGeoJSONPolygon,
  fromGeoJSONPoint,
  fromGeoJSONLineString,
  fromGeoJSONPolygon
} from './shared/geojson.js'

import type {
  GCPTransformerInterface,
  TransformationType,
  OptionalTransformOptions,
  Position,
  ImageWorldPosition,
  GeoJSONGeometry,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon
} from './shared/types.js'

export default class GCPTransformer implements GCPTransformerInterface {
  gcps: ImageWorldPosition[]
  transformer: GCPTransformerInterface

  constructor(
    gcps: ImageWorldPosition[],
    type: TransformationType = 'polynomial'
    // options: TransformationOptions
  ) {
    this.gcps = gcps

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
    } else if (type === 'thin-plate-spline') {
      this.transformer = new RadialBasisFunctionGCPTransformer(
        gcps,
        thinPlateKernel
      )
    } else {
      throw new Error(`Unsupported transformation type: ${type}`)
    }
  }

  toWorld(point: Position): Position {
    return this.transformer.toWorld(point)
  }

  toResource(point: Position): Position {
    return this.transformer.toResource(point)
  }

  toGeoJSON(point: Position): GeoJSONGeometry
  toGeoJSON(
    points: Position[],
    options?: OptionalTransformOptions
  ): GeoJSONGeometry

  toGeoJSON(
    pointOrPoints: Position[] | Position,
    options?: OptionalTransformOptions
  ): GeoJSONGeometry {
    // TODO: also support empty point and points arrays by throwing error
    const isPoints = Array.isArray(pointOrPoints[0])

    let point: Position
    let points: Position[]

    if (isPoints) {
      points = pointOrPoints as Position[]
      const close = options && options.close

      if (close) {
        return toGeoJSONPolygon(this, points, options)
      } else {
        return toGeoJSONLineString(this, points, options)
      }
    } else {
      point = pointOrPoints as Position
      return toGeoJSONPoint(this, point)
    }
  }

  toGeoJSONPoint(point: Position): GeoJSONPoint {
    return toGeoJSONPoint(this, point)
  }

  toGeoJSONLineString(
    points: Position[],
    options?: OptionalTransformOptions
  ): GeoJSONLineString {
    return toGeoJSONLineString(this, points, options)
  }

  toGeoJSONPolygon(
    points: Position[],
    options?: OptionalTransformOptions
  ): GeoJSONPolygon {
    return toGeoJSONPolygon(this, points, options)
  }

  fromGeoJSON(
    geometry: GeoJSONGeometry,
    options?: OptionalTransformOptions
  ): Position | Position[] {
    if (geometry.type === 'Point') {
      return fromGeoJSONPoint(this, geometry)
    } else if (geometry.type === 'LineString') {
      return fromGeoJSONLineString(this, geometry, options)
    } else if (geometry.type === 'Polygon') {
      return fromGeoJSONPolygon(this, geometry, options)
    } else {
      throw new Error(`Unsupported geometry`)
    }
  }

  fromGeoJSONPoint(geometry: GeoJSONPoint): Position {
    return fromGeoJSONPoint(this, geometry)
  }

  fromGeoJSONLineString(
    geometry: GeoJSONLineString,
    options?: OptionalTransformOptions
  ): Position[] {
    return fromGeoJSONLineString(this, geometry, options)
  }

  fromGeoJSONPolygon(
    geometry: GeoJSONPolygon,
    options?: OptionalTransformOptions
  ): Position[] {
    return fromGeoJSONPolygon(this, geometry, options)
  }
}
