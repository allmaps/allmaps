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
  pointToGeojsonPoint,
  lineStringToGeojsonLineString,
  polygonToGeojsonPolygon,
  geojsonPointToPoint,
  geojsonLineStringToLineString,
  geojsonPolygonToPolygon,
  geometriesToFeatureCollection,
  featureCollectionToGeometries,
  stringToSvgGeometriesGenerator,
  svgGeometriesToSvgString,
  expandGeojsonMultiPointToGeojsonPointArray,
  expandGeojsonMultiLineStringToGeojsonLineStringArray,
  expandGeojsonMultiPolygonToGeojsonPolygonArray,
  joinGeojsonPointArrayToGeojsonMultiPoint,
  joinGeojsonLineStringArrayToGeojsonMultiLineString,
  joinGeojsonPolygonArrayToGeojsonMultiPolygon,
  flipY,
  mergeOptions
} from '@allmaps/stdlib'

import { Transformation } from './transformation.js'

import { Straight } from './transformation-types/straight.js'
import { Helmert } from './transformation-types/helmert.js'
import { Polynomial } from './transformation-types/polynomial.js'
import { Projective } from './transformation-types/projective.js'
import { RBF } from './transformation-types/radial-basis-function.js'

import { thinPlateKernel } from './shared/kernel-functions.js'
import { euclideanNorm } from './shared/norm-functions.js'

import {
  defaultTransformOptions,
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
  GeojsonFeatureCollection,
  SvgGeometry
} from '@allmaps/types'

import type {
  GeneralGcp,
  TransformationType,
  TransformOptions
} from './shared/types.js'

/**
 * A Ground Control Point Transformer, containing a forward and backward transformation and
 * specifying functions to transform geometries using these transformations.
 * */
export class GcpTransformer {
  gcps: GeneralGcp[]
  sourcePoints: Point[]
  destinationPoints: Point[]
  type: TransformationType
  options: TransformOptions

  forwardTransformation?: Transformation
  backwardTransformation?: Transformation

  /**
   * Create a GcpTransformer
   * @param gcps - An array of Ground Control Points (GCPs)
   * @param type - The transformation type
   */ constructor(
    gcps: GeneralGcp[] | Gcp[],
    type: TransformationType = 'polynomial',
    options?: Partial<TransformOptions>
  ) {
    this.options = mergeOptions(defaultTransformOptions, options)
    if (gcps.length === 0) {
      throw new Error('No control points')
    }
    this.gcps = gcps.map((gcp) => {
      // TODO: replace by generalGcpToGcp()
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
  createForwardTransformation(): Transformation {
    if (!this.forwardTransformation) {
      this.forwardTransformation = this.computeTransformation(
        this.sourcePoints.map((point) => this.assureEqualHandedness(point)),
        this.destinationPoints
      )
    }
    return this.forwardTransformation
  }

  /**
   * Create backward transformation
   */
  createBackwardTransformation(): Transformation {
    if (!this.backwardTransformation) {
      this.backwardTransformation = this.computeTransformation(
        this.destinationPoints,
        this.sourcePoints.map((point) => this.assureEqualHandedness(point))
      )
    }
    return this.backwardTransformation
  }

  // Base functions
  transformForward(
    input: Point | GeojsonPoint,
    options?: Partial<TransformOptions>
  ): Point
  transformForward(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): LineString
  transformForward(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): Polygon
  transformForward(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): MultiPoint
  transformForward(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): MultiLineString
  transformForward(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): MultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a Geometry
   * @param input - Geometry or GeoJSON geometry to transform
   * @param options - Transform options
   * @returns Forward transform of input as Geometry
   */
  transformForward(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): Geometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
      if (isPoint(input)) {
        const forwardTransformation = this.createForwardTransformation()

        return forwardTransformation.evaluate(
          this.assureEqualHandedness(input),
          mergedOptions.evaluationType
        )
      } else if (isGeojsonPoint(input)) {
        return this.transformForward(geojsonPointToPoint(input), mergedOptions)
      } else if (isLineString(input)) {
        return transformLineStringForwardToLineString(
          input,
          this,
          mergedOptions
        )
      } else if (isGeojsonLineString(input)) {
        return transformLineStringForwardToLineString(
          geojsonLineStringToLineString(input),
          this,
          mergeOptions(mergedOptions, {
            sourceIsGeographic: true
          })
        )
      } else if (isPolygon(input)) {
        return transformPolygonForwardToPolygon(input, this, mergedOptions)
      } else if (isGeojsonPolygon(input)) {
        return transformPolygonForwardToPolygon(
          geojsonPolygonToPolygon(input),
          this,
          mergeOptions(mergedOptions, {
            sourceIsGeographic: true
          })
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
    options?: Partial<TransformOptions>
  ): GeojsonPoint
  transformForwardAsGeojson(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  transformForwardAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  transformForwardAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPoint
  transformForwardAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): GeojsonMultiLineString
  transformForwardAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward to a GeoJSON geometry
   * @param input - Geometry or GeoJSON geometry to transform
   * @param options - Transform options
   * @returns Forward transform of input, as GeoJSON geometry
   */
  transformForwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
      if (isPoint(input)) {
        return pointToGeojsonPoint(this.transformForward(input))
      } else if (isGeojsonPoint(input)) {
        return pointToGeojsonPoint(
          this.transformForward(geojsonPointToPoint(input))
        )
      } else if (isLineString(input)) {
        return lineStringToGeojsonLineString(
          transformLineStringForwardToLineString(
            input,
            this,
            mergeOptions(mergedOptions, {
              destinationIsGeographic: true
            })
          )
        )
      } else if (isGeojsonLineString(input)) {
        return lineStringToGeojsonLineString(
          transformLineStringForwardToLineString(
            geojsonLineStringToLineString(input),
            this,
            mergeOptions(mergedOptions, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      } else if (isPolygon(input)) {
        return polygonToGeojsonPolygon(
          transformPolygonForwardToPolygon(
            input,
            this,
            mergeOptions(mergedOptions, {
              destinationIsGeographic: true
            })
          )
        )
      } else if (isGeojsonPolygon(input)) {
        return polygonToGeojsonPolygon(
          transformPolygonForwardToPolygon(
            geojsonPolygonToPolygon(input),
            this,
            mergeOptions(mergedOptions, {
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
    options?: Partial<TransformOptions>
  ): Point
  transformBackward(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): LineString
  transformBackward(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): Polygon
  transformBackward(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): MultiPoint
  transformBackward(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): MultiLineString
  transformBackward(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): MultiPolygon
  /**
   * Transforms a geometry or a GeoJSON geometry backward to a Geometry
   * @param input - Geometry or GeoJSON geometry to transform
   * @param options - Transform options
   * @returns backward transform of input, as geometry
   */
  transformBackward(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): Geometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
      if (isPoint(input)) {
        const backwardTransformation = this.createBackwardTransformation()
        return this.assureEqualHandedness(
          backwardTransformation.evaluate(input)
        )
      } else if (isGeojsonPoint(input)) {
        return this.transformBackward(geojsonPointToPoint(input))
      } else if (isLineString(input)) {
        return transformLineStringBackwardToLineString(
          input,
          this,
          mergedOptions
        )
      } else if (isGeojsonLineString(input)) {
        return transformLineStringBackwardToLineString(
          geojsonLineStringToLineString(input),
          this,
          mergeOptions(mergedOptions, {
            destinationIsGeographic: true
          })
        )
      } else if (isPolygon(input)) {
        return transformPolygonBackwardToPolygon(input, this, mergedOptions)
      } else if (isGeojsonPolygon(input)) {
        return transformPolygonBackwardToPolygon(
          geojsonPolygonToPolygon(input),
          this,
          mergeOptions(mergedOptions, {
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
    options?: Partial<TransformOptions>
  ): GeojsonPoint
  transformBackwardAsGeojson(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  transformBackwardAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  transformBackwardAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPoint
  transformBackwardAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): GeojsonMultiLineString
  transformBackwardAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward to a GeoJSON geometry
   * @param input - Geometry or GeoJSON geometry to transform
   * @param options - Transform options
   * @returns backward transform of input, as GeoJSON geometry
   */
  transformBackwardAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
      if (isPoint(input)) {
        return pointToGeojsonPoint(this.transformBackward(input))
      } else if (isGeojsonPoint(input)) {
        return pointToGeojsonPoint(
          this.transformBackward(geojsonPointToPoint(input))
        )
      } else if (isLineString(input)) {
        return lineStringToGeojsonLineString(
          transformLineStringBackwardToLineString(
            input,
            this,
            mergeOptions(mergedOptions, {
              sourceIsGeographic: true
            })
          )
        )
      } else if (isGeojsonLineString(input)) {
        return lineStringToGeojsonLineString(
          transformLineStringBackwardToLineString(
            geojsonLineStringToLineString(input),
            this,
            mergeOptions(mergedOptions, {
              sourceIsGeographic: true,
              destinationIsGeographic: true
            })
          )
        )
      } else if (isPolygon(input)) {
        return polygonToGeojsonPolygon(
          transformPolygonBackwardToPolygon(
            input,
            this,
            mergeOptions(mergedOptions, {
              sourceIsGeographic: true
            })
          )
        )
      } else if (isGeojsonPolygon(input)) {
        return polygonToGeojsonPolygon(
          transformPolygonBackwardToPolygon(
            geojsonPolygonToPolygon(input),
            this,
            mergeOptions(mergedOptions, {
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
    options?: Partial<TransformOptions>
  ): Point
  transformToGeo(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): LineString
  transformToGeo(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): Polygon
  transformToGeo(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): MultiPoint
  transformToGeo(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): MultiLineString
  transformToGeo(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): MultiPolygon
  /**
   * Transforms Geometry or GeoJSON geometry forward, as Geometry
   * @param input - Input to transform
   * @param options - Transform options
   * @returns Forward transform of input, as Geometry
   */
  transformToGeo(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): Geometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
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
    options?: Partial<TransformOptions>
  ): GeojsonPoint
  transformToGeoAsGeojson(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  transformToGeoAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  transformToGeoAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPoint
  transformToGeoAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): GeojsonMultiLineString
  transformToGeoAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry forward, to a GeoJSON geometry
   * @param input - Input to transform
   * @param options - Transform options
   * @returns Forward transform of input, as GeoJSON geometry
   */
  transformToGeoAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
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
    options?: Partial<TransformOptions>
  ): Point
  transformToResource(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): LineString
  transformToResource(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): Polygon
  transformToResource(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): MultiPoint
  transformToResource(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): MultiLineString
  transformToResource(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): MultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a Geometry
   * @param input - Input to transform
   * @param options - Transform options
   * @returns Backward transform of input, as a Geometry
   */
  transformToResource(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): Geometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
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
    options?: Partial<TransformOptions>
  ): GeojsonPoint
  transformToResourceAsGeojson(
    input: LineString | GeojsonLineString,
    options?: Partial<TransformOptions>
  ): GeojsonLineString
  transformToResourceAsGeojson(
    input: Polygon | GeojsonPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonPolygon
  transformToResourceAsGeojson(
    input: MultiPoint | GeojsonMultiPoint,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPoint
  transformToResourceAsGeojson(
    input: MultiLineString | GeojsonMultiLineString,
    options?: Partial<TransformOptions>
  ): GeojsonMultiLineString
  transformToResourceAsGeojson(
    input: MultiPolygon | GeojsonMultiPolygon,
    options?: Partial<TransformOptions>
  ): GeojsonMultiPolygon
  /**
   * Transforms a Geometry or a GeoJSON geometry backward, to a GeoJSON geometry
   * @param input - Input to transform
   * @param options - Transform options
   * @returns Backward transform of input, as a GeoJSON geometry
   */
  transformToResourceAsGeojson(
    input: Geometry | GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    const mergedOptions = mergeOptions(this.options, options)
    if (!mergedOptions.inputIsMultiGeometry) {
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
   * @param geometry - SVG geometry to transform
   * @param options - Transform options
   * @returns Forward transform of input, as a GeoJSON geometry
   */
  transformSvgToGeojson(
    geometry: SvgGeometry,
    options?: Partial<TransformOptions>
  ): GeojsonGeometry {
    if (geometry.type === 'circle') {
      return this.transformForwardAsGeojson(geometry.coordinates)
    } else if (geometry.type === 'line') {
      return this.transformForwardAsGeojson(geometry.coordinates, options)
    } else if (geometry.type === 'polyline') {
      return this.transformForwardAsGeojson(geometry.coordinates, options)
    } else if (geometry.type === 'rect') {
      return this.transformForwardAsGeojson([geometry.coordinates], options)
    } else if (geometry.type === 'polygon') {
      return this.transformForwardAsGeojson([geometry.coordinates], options)
    } else {
      throw new Error(`Unsupported SVG geometry`)
    }
  }

  /**
   * Transforms a SVG string forward to a GeoJSON FeatureCollection
   *
   * Note: Multi-geometries are not supported
   * @param svg - SVG string to transform
   * @param options - Transform options
   * @returns Forward transform of input, as a GeoJSON FeatureCollection
   */
  transformSvgStringToGeojsonFeatureCollection(
    svg: string,
    options?: Partial<TransformOptions>
  ): GeojsonFeatureCollection {
    const geojsonGeometries = []
    for (const svgGeometry of stringToSvgGeometriesGenerator(svg)) {
      const geojsonGeometry = this.transformSvgToGeojson(svgGeometry, options)
      geojsonGeometries.push(geojsonGeometry)
    }
    return geometriesToFeatureCollection(geojsonGeometries)
  }

  /**
   * Transforms a GeoJSON geometry backward to a SVG geometry
   *
   * Note: Multi-geometries are not supported
   * @param geometry - GeoJSON geometry to transform
   * @param options - Transform options
   * @returns Backward transform of input, as SVG geometry
   */
  transformGeojsonToSvg(
    geometry: GeojsonGeometry,
    options?: Partial<TransformOptions>
  ): SvgGeometry {
    if (geometry.type === 'Point') {
      return {
        type: 'circle',
        coordinates: this.transformBackward(geometry)
      }
    } else if (geometry.type === 'LineString') {
      return {
        type: 'polyline',
        coordinates: this.transformBackward(geometry, options)
      }
    } else if (geometry.type === 'Polygon') {
      return {
        type: 'polygon',
        coordinates: this.transformBackward(geometry, options)[0]
      }
    } else {
      throw new Error(`Unsupported GeoJSON geometry`)
    }
  }

  /**
   * Transforms a GeoJSON FeatureCollection backward to a SVG string
   *
   * Note: Multi-geometries are not supported
   * @param geojson - GeoJSON FeatureCollection to transform
   * @param options - Transform options
   * @returns Backward transform of input, as SVG string
   */
  transformGeojsonFeatureCollectionToSvgString(
    geojson: GeojsonFeatureCollection,
    options?: Partial<TransformOptions>
  ): string {
    const svgGeometries = []
    for (const geojsonGeometry of featureCollectionToGeometries(geojson)) {
      const svgGeometry = this.transformGeojsonToSvg(geojsonGeometry, options)
      svgGeometries.push(svgGeometry)
    }

    return svgGeometriesToSvgString(svgGeometries)
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
