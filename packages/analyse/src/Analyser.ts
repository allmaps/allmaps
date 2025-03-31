import classifyPoint from 'robust-point-in-polygon'

import { TriangulatedWarpedMap, WarpedMap } from '@allmaps/render'

import {
  isEqualArray,
  isEqualPoint,
  isRing,
  polygonSelfIntersectionPoints,
  arrayRepeated,
  bboxToDiameter
} from '@allmaps/stdlib'
import { GcpTransformer, Helmert, Polynomial } from '@allmaps/transform'
import { AnalysisItem, Distortions, Measures } from './shared/types'

const MAX_SHEAR = 0.1

/**
 * Class for Analyser.
 * This class describes how a georeferenced map is warped using a specific transformation.
 */
export default class Analyser<W extends WarpedMap> {
  warpedMap: W

  protected infos?: AnalysisItem[]
  protected warnings?: AnalysisItem[]
  protected errors?: AnalysisItem[]

  protected measures?: Measures
  protected distortions?: Distortions

  /**
   * Creates an instance of Analyser.
   *
   * @constructor
   * @param warpedMap - A Warped Map
   */
  constructor(warpedMap: W) {
    this.warpedMap = warpedMap
  }

  /**
   * Creates an instance of Analyser from a Warped Map.
   *
   * @constructor
   * @param warpedMap - A Warped Map
   */
  public static fromWarpedMap<W extends WarpedMap>(warpedMap: W): Analyser<W> {
    return new Analyser(warpedMap)
  }

  /**
   * Check if analysis has infos.
   */
  public hasInfos(): boolean {
    if (!this.infos) {
      this.getInfos()
    }

    return this.infos!.length != 0
  }

  /**
   * Check if analysis has warnings.
   */
  public hasWarnings(): boolean {
    if (!this.warnings) {
      this.getWarnings()
    }

    return this.warnings!.length != 0
  }

  /**
   * Check if analysis has errors.
   */
  public hasErrors(): boolean {
    if (!this.errors) {
      this.getErrors()
    }

    return this.errors!.length != 0
  }

  /**
   * Get analysis informations.
   */
  public getInfos(): AnalysisItem[] {
    if (this.infos) {
      return this.infos
    }
    this.infos = []

    // Mask equals full Mask
    if (
      isEqualArray(
        this.warpedMap.resourceMask,
        this.warpedMap.resourceFullMask,
        isEqualPoint
      )
    ) {
      this.infos.push({
        mapId: this.warpedMap.mapId,
        code: 'maskequalsfullmask',
        text: 'The mask contains the full image.'
      })
    }

    return this.infos
  }

  /**
   * Get analysis warnings.
   */
  public getWarnings(): AnalysisItem[] {
    if (this.warnings) {
      return this.warnings
    }
    this.warnings = []

    // GCPs not incomplete
    const gcpsUndefinedResource = []
    for (const gcp of this.warpedMap.gcps) {
      if (gcp.resource == undefined || gcp.geo == undefined) {
        gcpsUndefinedResource.push(gcp)
      }
    }
    gcpsUndefinedResource.forEach((gcp, index) => {
      this.warnings!.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpincompleteresource',
        geoPoint: gcp.geo,
        gcpIndex: index,
        text: 'GCP ' + index + ' missing resource coordinates.'
      })
    })
    const gcpsUndefinedGeo = []
    for (const gcp of this.warpedMap.gcps) {
      if (gcp.resource == undefined || gcp.geo == undefined) {
        gcpsUndefinedGeo.push(gcp)
      }
    }
    gcpsUndefinedGeo.forEach((gcp, index) => {
      this.warnings!.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpincompletegeo',
        resourcePoint: gcp.resource,
        gcpIndex: index,
        text: 'GCP ' + index + ' missing geo coordinates.'
      })
    })

    // GCPs not outside mask
    const gcpsOutside = []
    for (const gcp of this.warpedMap.gcps) {
      if (classifyPoint(this.warpedMap.resourceMask, gcp.resource) == 1) {
        gcpsOutside.push(gcp)
      }
    }
    gcpsOutside.forEach((gcp, index) => {
      this.warnings!.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpoutsidemask',
        resourcePoint: gcp.resource,
        gcpIndex: index,
        text:
          'GCP ' +
          index +
          ' with resource coordinates [' +
          gcp.resource +
          '] outside mask.'
      })
    })

    // Mask points not outside full mask
    const resourceMaskOutsideFullMaskPoints = []
    for (const resourcePoint of this.warpedMap.resourceMask) {
      if (classifyPoint(this.warpedMap.resourceFullMask, resourcePoint) == 1) {
        resourceMaskOutsideFullMaskPoints.push(resourcePoint)
      }
    }
    resourceMaskOutsideFullMaskPoints.forEach(
      (resourceMaskOutsideFullMaskPoint, index) => {
        this.warnings!.push({
          mapId: this.warpedMap.mapId,
          code: 'maskpointoutsidefullmask',
          resourcePoint: resourceMaskOutsideFullMaskPoint,
          gcpIndex: index,
          text:
            'Mask point ' +
            index +
            ' with resource coordinates [' +
            resourceMaskOutsideFullMaskPoint +
            '] outside full mask.'
        })
      }
    )

    // Transformation folds over
    // TODO: compute signDetJ only for this test instead of by default, e.g. by updating from existing distortions
    if (this.warpedMap instanceof TriangulatedWarpedMap) {
      const signDetJs =
        this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.map(
          (gcpUniquePoint) => gcpUniquePoint.distortions?.get('signDetJ')
        )
      if (signDetJs && signDetJs.some((signDetJ) => signDetJ == -1)) {
        this.warnings.push({
          mapId: this.warpedMap.mapId,
          code: 'triangulationfoldsover',
          text: 'The map folds over itself, for the selected transformation type.'
        })
      }
    }

    // Polynomial shear not too high
    if (!this.measures) {
      this.getMeasures()
    }
    if (
      this.measures!.polynomialShear![0] > MAX_SHEAR ||
      this.measures!.polynomialShear![1] > MAX_SHEAR
    ) {
      this.warnings.push({
        mapId: this.warpedMap.mapId,
        code: 'polynomialsheartoohigh',
        text:
          'A polynomial transformation shows a shear higher then ' +
          MAX_SHEAR +
          '.'
      })
    }

    return this.warnings
  }

  /**
   * Get analysis errors.
   */
  public getErrors(): AnalysisItem[] {
    if (this.errors) {
      return this.errors
    }
    this.errors = []

    // GCPs amount not to low
    if (this.warpedMap.gcps.length < 3) {
      this.errors.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpamounttoolow',
        text:
          'There are only ' +
          this.warpedMap.gcps.length +
          ' GCPs, but a minimum of 3 are required.'
      })
    }

    // GCPs no repeated points
    const resourceRepeatedPoints = arrayRepeated(this.warpedMap.resourcePoints)
    const geoRepeatedPoints = arrayRepeated(this.warpedMap.geoPoints)
    resourceRepeatedPoints.forEach((resourceRepeatedPoint) => {
      this.errors!.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpresourcerepeatedpoint',
        resourcePoint: resourceRepeatedPoint,
        text:
          'GCP resource coordinates [' +
          resourceRepeatedPoint +
          '] are repeated.'
      })
    })
    geoRepeatedPoints.forEach((geoRepeatedPoint) => {
      this.errors!.push({
        mapId: this.warpedMap.mapId,
        code: 'gcpgeorepeatedpoint',
        geoPoint: geoRepeatedPoint,
        text: 'GCP geo coordinates [' + geoRepeatedPoint + '] are repeated.'
      })
    })

    // Mask valid as ring
    if (!isRing(this.warpedMap.resourceMask)) {
      this.errors.push({
        mapId: this.warpedMap.mapId,
        code: 'masknotring',
        text: 'The mask is not a valid ring (an array of points).'
      })
    }

    // Mask no repeated points
    const resourceMaskRepeatedPoints = arrayRepeated(
      this.warpedMap.resourceMask
    )
    resourceMaskRepeatedPoints.forEach((resourceMaskRepeatedPoint) => {
      this.errors!.push({
        mapId: this.warpedMap.mapId,
        code: 'maskrepeatedpoint',
        resourcePoint: resourceMaskRepeatedPoint,
        text:
          'Mask resource coordinates [' +
          resourceMaskRepeatedPoint +
          '] are repeated.'
      })
    })

    // Mask no self-intersection
    const resourceMaskSelfIntersectionPoints = polygonSelfIntersectionPoints([
      this.warpedMap.resourceMask
    ])
    resourceMaskSelfIntersectionPoints.forEach(
      (resourceMaskSelfIntersectionPoint) => {
        this.errors!.push({
          mapId: this.warpedMap.mapId,
          code: 'maskselfintersection',
          resourcePoint: resourceMaskSelfIntersectionPoint,
          text:
            'The mask self-intersects at resource coordinates [' +
            resourceMaskSelfIntersectionPoint +
            '].'
        })
      }
    )

    return this.errors
  }

  /**
   * Get analysis measures.
   */
  public getMeasures(): Measures {
    if (this.measures) {
      return this.measures
    }

    const measures: Partial<Measures> = {
      mapId: this.warpedMap.mapId
    }

    // Polynomial
    const projectedPolynomialTransformer =
      this.warpedMap.getProjectedTransformer('polynomial')
    const toProjectedGeoPolynomialTransformation =
      projectedPolynomialTransformer.getToGeoTransformation() as Polynomial

    measures.polynomialRmse = toProjectedGeoPolynomialTransformation.rmse
    measures.polynomialParameters =
      toProjectedGeoPolynomialTransformation.polynomialParameters
    measures.polynomialScale = toProjectedGeoPolynomialTransformation.scale
    measures.polynomialRotation =
      toProjectedGeoPolynomialTransformation.rotation
    measures.polynomialShear = toProjectedGeoPolynomialTransformation.shear
    measures.polynomialTranslation =
      toProjectedGeoPolynomialTransformation.translation

    // Helmert
    const projectedHelmertTransformer =
      this.warpedMap.getProjectedTransformer('helmert')
    const toProjectedGeoHelmertTransformation =
      projectedHelmertTransformer.getToGeoTransformation() as Helmert

    measures.helmertRmse = toProjectedGeoHelmertTransformation.rmse
    measures.helmertParameters =
      toProjectedGeoHelmertTransformation.helmertParameters
    measures.helmertScale = toProjectedGeoHelmertTransformation.scale
    measures.helmertRotation = toProjectedGeoHelmertTransformation.rotation
    measures.helmertTranslation =
      toProjectedGeoHelmertTransformation.translation

    // Current transformation type
    const projectedTransformer = this.warpedMap.projectedTransformer
    const toProjectedGeoTransformation =
      projectedTransformer.getToGeoTransformation()
    measures.rmse = toProjectedGeoTransformation.rmse
    measures.destinationErrors = toProjectedGeoTransformation.errors
    // Note: we scale using the helmert transform instead of computing errors in resource
    // TODO: check if it's indeed deviding by scale
    measures.resourceErrors = toProjectedGeoTransformation.errors.map(
      (error) => error / toProjectedGeoHelmertTransformation.scale
    )
    // TODO: check if this is correct. Currenlty when we give one GCP a big offset, the others have larger resourceRelativeErrors
    measures.resourceRelativeErrors = toProjectedGeoTransformation.errors.map(
      (error) =>
        error /
        (toProjectedGeoHelmertTransformation.scale *
          bboxToDiameter(this.warpedMap.resourceMaskBbox))
    )

    this.measures = measures as Measures

    return this.measures
  }

  /**
   * Get distortions.
   */
  public getDistortions(): Distortions {
    if (this.distortions) {
      return this.distortions
    }

    if (
      !(this.warpedMap instanceof TriangulatedWarpedMap) ||
      !this.warpedMap.projectedGcpTriangulation
    ) {
      throw new Error("Distortions can't be analysed")
    }

    const distortions: Partial<Distortions> = {
      mapId: this.warpedMap.mapId
    }

    const distortionsAtFirstPoint =
      this.warpedMap.projectedGcpTriangulation.gcpUniquePoints[0].distortions
    const distortionMeasures = Array.from(
      distortionsAtFirstPoint ? distortionsAtFirstPoint.keys() : []
    )

    for (const distortionMeasure of distortionMeasures) {
      if (!distortions.meanDistortions) {
        distortions.meanDistortions = new Map()
      }
      const triangulationDistortions =
        this.warpedMap.projectedGcpTriangulation.gcpUniquePoints
          .map((gcpUniquePoint) =>
            gcpUniquePoint.distortions?.get(distortionMeasure)
          )
          .filter((distortion) => distortion !== undefined)
      const meanTriangulationDistortion =
        triangulationDistortions.reduce((a, c) => a + c, 0) /
        triangulationDistortions.length
      distortions.meanDistortions?.set(
        distortionMeasure,
        meanTriangulationDistortion
      )
    }

    this.distortions = distortions as Distortions

    return this.distortions
  }
}
