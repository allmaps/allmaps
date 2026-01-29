import inside from 'point-in-polygon-hao'

import { TriangulatedWarpedMap, WarpedMap } from '@allmaps/render'

import {
  isEqualArray,
  isEqualPoint,
  isRing,
  polygonSelfIntersectionPoints,
  arrayRepeated,
  bboxToDiameter,
  isPoint,
  closeRing,
  mergeOptions
} from '@allmaps/stdlib'
import { Helmert, Polynomial1 } from '@allmaps/transform'
import {
  AnalysisOptions,
  AnalysisItem,
  Analysis,
  Distortions,
  Measures
} from './shared/types'

import type { GeoreferencedMap } from '@allmaps/annotation'

// Note: construction errors and failures to get info, warning or errors are always reported
const DEFAULT_INFO_CODES = ['maskequalsfullmask']
const DEFAULT_WARNING_CODES = [
  'gcpoutsidemask',
  'maskpointoutsidefullmask',
  // 'destinationrmsetoohigh',
  // 'destinationhelmertrmsetoohigh',
  'polynomial1sheartoohigh',
  'destinationpolynomial1rmsetoohigh',
  'log2sigmadistortiontoohigh',
  'twoomegadistortiontoohigh'
  // 'triangulationfoldsover'
]
const DEFAULT_ERROR_CODES = [
  'constructingwarpedmapfailed',
  'constructingtriangulatedwarpedmapfailed',
  'gcpincompleteresource',
  'gcpincompleteregeo',
  // 'gcpamountlessthen2',
  'gcpamountlessthen3',
  'gcpresourcerepeatedpoint',
  'gcpgeorepeatedpoint',
  'masknotring',
  'maskrepeatedpoint',
  'maskselfintersection'
]

const DEFAULT_OPTIONS: AnalysisOptions = {
  codes: [
    ...DEFAULT_INFO_CODES,
    ...DEFAULT_WARNING_CODES,
    ...DEFAULT_ERROR_CODES
  ],
  maxRmseDiameterFraction: 0.05,
  maxShear: 0.1,
  maxLog2sigma: 1,
  minLog2sigma: -1,
  maxTwoOmega: 0.5
}

/**
 * Class for Analyzer.
 * This class describes how a georeferenced map is warped using a specific transformation.
 */
export class Analyzer {
  mapId?: string

  georeferencedMap: GeoreferencedMap
  warpedMap?: WarpedMap

  options: AnalysisOptions

  protected info: AnalysisItem[] = []
  protected warnings: AnalysisItem[] = []
  protected errors: AnalysisItem[] = []

  protected constructionErrors: AnalysisItem[] = []

  protected measures?: Measures
  protected distortions?: Distortions

  /**
   * Creates an instance of Analyzer.
   *
   * @param georeferencedOrWarpedMap - A Georeferenced Map or a Warped Map
   */
  constructor(georeferenceddMap: GeoreferencedMap, options?: AnalysisOptions)
  constructor(warpedMap: WarpedMap, options?: AnalysisOptions)
  constructor(
    georeferencedOrWarpedMap: GeoreferencedMap | WarpedMap,
    options?: Partial<AnalysisOptions>
  ) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options)

    if (georeferencedOrWarpedMap instanceof WarpedMap) {
      this.georeferencedMap = georeferencedOrWarpedMap.georeferencedMap
      this.warpedMap = georeferencedOrWarpedMap
    } else {
      this.georeferencedMap = georeferencedOrWarpedMap
    }

    // Note: since we cannot await in a constructor,
    // we can't compute a missing mapId here using generateChecksum()
    // and hence it can be undefined in this entire package
    this.mapId = this.georeferencedMap.id

    if (
      this.warpedMap == undefined ||
      !(this.warpedMap instanceof TriangulatedWarpedMap)
    ) {
      try {
        this.warpedMap = new TriangulatedWarpedMap(
          this.mapId || '',
          this.georeferencedMap
        )
      } catch (error) {
        this.constructionErrors.push({
          mapId: this.mapId,
          code: 'constructingtriangulatedwarpedmapfailed',
          message:
            'Constructing a TriangulatedWarpedMap failed (possibly because triangulating the resourceMask failed).',
          originalMessage: String(error)
        })
      }
    }

    if (this.warpedMap === undefined) {
      try {
        this.warpedMap = new WarpedMap(this.mapId || '', this.georeferencedMap)
      } catch (error) {
        this.constructionErrors.push({
          mapId: this.mapId,
          code: 'constructingwarpedmapfailed',
          message: 'Constructing a WarpedMap failed.',
          originalMessage: String(error)
        })
      }
    }
  }

  /**
   * Analyse
   *
   * Applying extra caution: wrapping the getters in a try catch
   *
   * @param partialOptions - Analysis options
   * @returns Analysis with info, warnings and errors
   */
  public analyse(partialOptions?: Partial<AnalysisOptions>): Analysis {
    let errors: AnalysisItem[] = []
    let info: AnalysisItem[] = []
    let warnings: AnalysisItem[] = []

    try {
      errors = this.getErrors(partialOptions)
    } catch (error) {
      this.errors.push({
        mapId: this.mapId,
        code: 'errorsfailed',
        message: 'Failed to get errors.',
        originalMessage: String(error)
      })
    }
    if (this.errors.length != 0) {
      try {
        info = this.getInfo(partialOptions)
      } catch (error) {
        this.errors.push({
          mapId: this.mapId,
          code: 'infofailed',
          message: 'Failed to get info.',
          originalMessage: String(error)
        })
      }
      try {
        warnings = this.getWarnings(partialOptions)
      } catch (error) {
        this.errors.push({
          mapId: this.mapId,
          code: 'warningsfailed',
          message: 'Failed to get warnings.',
          originalMessage: String(error)
        })
      }
    }
    return {
      info,
      warnings,
      errors
    }
  }

  /**
   * Get analysis informations
   *
   * @param partialOptions - Analysis options
   * @returns Analysis items with info
   */
  public getInfo(partialOptions?: Partial<AnalysisOptions>): AnalysisItem[] {
    const options = mergeOptions(this.options, partialOptions)
    const codes = options.codes

    this.info = []

    // Mask equals full Mask
    const code = 'maskequalsfullmask'
    if (
      codes.includes(code) &&
      this.warpedMap &&
      isEqualArray(
        this.warpedMap.resourceMask,
        this.warpedMap.resourceFullMask,
        isEqualPoint
      )
    ) {
      this.info.push({
        mapId: this.mapId,
        code,
        message: 'The mask contains the full image.'
      })
    }

    return this.info
  }

  /**
   * Get analysis warnings
   *
   * @param partialOptions - Analysis options
   * @returns Analysis items with warning
   */
  public getWarnings(
    partialOptions?: Partial<AnalysisOptions>
  ): AnalysisItem[] {
    const options = mergeOptions(this.options, partialOptions)
    const codes = options.codes
    let code: string

    this.warnings = []

    // GCPs not outside mask
    code = 'gcpoutsidemask'
    if (codes.includes(code)) {
      const gcpsOutside = []
      for (const gcp of this.georeferencedMap.gcps) {
        if (
          inside(gcp.resource, [
            closeRing(this.georeferencedMap.resourceMask)
          ]) === false
        ) {
          gcpsOutside.push(gcp)
        }
      }
      gcpsOutside.forEach((gcp, index) => {
        this.warnings.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcp.resource,
          gcpIndex: index,
          message: `GCP ${index} with resource coordinates [${gcp.resource}] outside mask.`
        })
      })
    }

    // Mask points not outside full mask
    code = 'maskpointoutsidefullmask'
    if (codes.includes(code) && this.warpedMap) {
      const resourceMaskOutsideFullMaskPoints = []

      const closedResourceFullMask = [
        closeRing(this.warpedMap.resourceFullMask)
      ]

      for (const resourcePoint of this.warpedMap.resourceMask) {
        if (inside(resourcePoint, closedResourceFullMask) === false) {
          resourceMaskOutsideFullMaskPoints.push(resourcePoint)
        }
      }
      resourceMaskOutsideFullMaskPoints.forEach(
        (resourceMaskOutsideFullMaskPoint, index) => {
          this.warnings.push({
            mapId: this.mapId,
            code,
            resourcePoint: resourceMaskOutsideFullMaskPoint,
            gcpIndex: index,
            message: `Mask point ${index} with resource coordinates [${resourceMaskOutsideFullMaskPoint}] outside full mask.`
          })
        }
      )
    }

    // Destination RSME too high
    code = 'destinationrmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationRmse / measures.projectedGeoDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter.`
        })
      }
    }

    // Destination RSME too high for Helmert transformation
    code = 'destinationhelmertrmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationHelmertRmse / measures.projectedGeoDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter for a Helmert transformation.`
        })
      }
    }

    // Shear too high for Polynomial1 transformation
    code = 'polynomial1sheartoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.polynomial1Measures &&
        (measures.polynomial1Measures.shears[0] > options.maxShear ||
          measures.polynomial1Measures.shears[1] > options.maxShear)
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The shear is higher then ${options.maxShear} for a polynomial transformation.`
        })
      }
    }

    // Destination RSME too high for Polynomial1 transformation
    code = 'destinationpolynomial1rmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationPolynomial1Rmse / measures.projectedGeoDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter for a polynomial transformation.`
        })
      }
    }

    // log2sigma distortion too high
    code = 'log2sigmadistortiontoohigh'
    if (
      codes.includes(code) &&
      this.warpedMap instanceof TriangulatedWarpedMap
    ) {
      this.warpedMap.setMapOptions({
        distortionMeasures: this.warpedMap.options.distortionMeasures.concat([
          'log2sigma'
        ])
      })
      const gcpUniquePointsFiltered =
        this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.filter(
          (gcpUniquePoint) => {
            const log2sigma = gcpUniquePoint.distortions?.get('log2sigma')
            return (
              log2sigma &&
              (log2sigma > options.maxLog2sigma ||
                log2sigma < options.minLog2sigma)
            )
          }
        )
      if (gcpUniquePointsFiltered && gcpUniquePointsFiltered.length > 0) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcpUniquePointsFiltered[0].resource,
          projectedGeoPoint: gcpUniquePointsFiltered[0].geo,
          message: `The area distortion (log2sigma) is higher then ${options.maxLog2sigma} or lower then ${options.minLog2sigma}.`
        })
      }
    }

    // twoOmega distortion too high
    code = 'twoomegadistortiontoohigh'
    if (
      codes.includes(code) &&
      this.warpedMap instanceof TriangulatedWarpedMap
    ) {
      this.warpedMap.setMapOptions({
        distortionMeasures: this.warpedMap.options.distortionMeasures.concat([
          'twoOmega'
        ])
      })
      const gcpUniquePointsFiltered =
        this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.filter(
          (gcpUniquePoint) => {
            const twoOmega = gcpUniquePoint.distortions?.get('twoOmega')
            return twoOmega && twoOmega > options.maxTwoOmega
          }
        )
      if (gcpUniquePointsFiltered && gcpUniquePointsFiltered.length > 0) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcpUniquePointsFiltered[0].resource,
          projectedGeoPoint: gcpUniquePointsFiltered[0].geo,
          message: `The angular (twoOmega) distortion is higher then ${options.maxTwoOmega}.`
        })
      }
    }

    // Transformation folds over
    code = 'triangulationfoldsover'
    if (
      codes.includes(code) &&
      this.warpedMap instanceof TriangulatedWarpedMap
    ) {
      this.warpedMap.setMapOptions({
        distortionMeasures: this.warpedMap.options.distortionMeasures.concat([
          'signDetJ'
        ])
      })
      const gcpUniquePointsFiltered =
        this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.filter(
          (gcpUniquePoint) => {
            const signDetJ = gcpUniquePoint.distortions?.get('signDetJ')
            return signDetJ && signDetJ == -1
          }
        )
      if (gcpUniquePointsFiltered && gcpUniquePointsFiltered.length > 0) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcpUniquePointsFiltered[0].resource,
          projectedGeoPoint: gcpUniquePointsFiltered[0].geo,
          message: 'The warped map folds over itself.'
        })
      }
    }

    return this.warnings
  }

  /**
   * Get analysis errors
   *
   * @param partialOptions - Analysis options
   * @returns Analysis items with errors
   */
  public getErrors(partialOptions?: Partial<AnalysisOptions>): AnalysisItem[] {
    const options = mergeOptions(this.options, partialOptions)
    const codes = options.codes
    let code: string

    this.errors = this.constructionErrors

    // GCPs not incomplete
    code = 'gcpincompleteresource'
    if (codes.includes(code)) {
      const gcpsIncompleteResource = []
      for (const gcp of this.georeferencedMap.gcps) {
        if (gcp.resource == undefined || !isPoint(gcp.resource)) {
          gcpsIncompleteResource.push(gcp)
        }
      }
      gcpsIncompleteResource.forEach((gcp, index) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          geoPoint: gcp.geo,
          gcpIndex: index,
          message: `GCP ${index} missing resource coordinates.`
        })
      })
    }
    code = 'gcpincompletegeo'
    if (codes.includes(code)) {
      const gcpsIncompleteGeo = []
      for (const gcp of this.georeferencedMap.gcps) {
        if (gcp.geo == undefined || !isPoint(gcp.geo)) {
          gcpsIncompleteGeo.push(gcp)
        }
      }
      gcpsIncompleteGeo.forEach((gcp, index) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcp.resource,
          gcpIndex: index,
          message: `GCP ${index} missing geo coordinates.`
        })
      })
    }
    // Return if gcp incomplete, since other checks would fail then
    const errorCodes = this.errors.map((i) => i.code)
    if (
      errorCodes.includes('gcpincompleteresource') ||
      errorCodes.includes('gcpincompletegeo')
    ) {
      return this.errors
    }

    // GCPs amount not less then 2
    code = 'gcpamountlessthen2'
    if (codes.includes(code) && this.georeferencedMap.gcps.length < 2) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message: `There are ${this.georeferencedMap.gcps.length} GCPs, but a minimum of 2 are required (for a Helmert transform).`
      })
    }

    // GCPs amount not less then 3
    code = 'gcpamountlessthen3'
    if (codes.includes(code) && this.georeferencedMap.gcps.length < 3) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message: `There are ${this.georeferencedMap.gcps.length} GCPs, but a minimum of 3 are required.`
      })
    }

    // GCPs no repeated points
    code = 'gcpresourcerepeatedpoint'
    if (codes.includes(code)) {
      const resourceRepeatedPoints = arrayRepeated(
        this.georeferencedMap.gcps.map((gcp) => gcp.resource),
        isEqualPoint
      )
      resourceRepeatedPoints.forEach((resourceRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: resourceRepeatedPoint,
          message: `GCP resource coordinates [${resourceRepeatedPoint}] are repeated.`
        })
      })
    }
    code = 'gcpgeorepeatedpoint'
    if (codes.includes(code)) {
      const geoRepeatedPoints = arrayRepeated(
        this.georeferencedMap.gcps.map((gcp) => gcp.geo),
        isEqualPoint
      )
      geoRepeatedPoints.forEach((geoRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          geoPoint: geoRepeatedPoint,
          message: `GCP geo coordinates [${geoRepeatedPoint}] are repeated.`
        })
      })
    }

    // Mask valid as ring
    code = 'masknotring'
    if (codes.includes(code)) {
      const maskIsRing = isRing(this.georeferencedMap.resourceMask)
      if (!maskIsRing) {
        this.errors.push({
          mapId: this.mapId,
          code,
          message: 'The mask is not a valid ring (an array of points).'
        })
      }
    }
    // Return if mask not ring, since other checks would fail then
    if (this.errors.map((i) => i.code).includes(code)) {
      return this.errors
    }

    // Mask no repeated points
    code = 'maskrepeatedpoint'
    if (codes.includes(code)) {
      const resourceMaskRepeatedPoints = arrayRepeated(
        this.georeferencedMap.resourceMask,
        isEqualPoint
      )
      resourceMaskRepeatedPoints.forEach((resourceMaskRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: resourceMaskRepeatedPoint,
          message: `Mask resource coordinates [${resourceMaskRepeatedPoint}] are repeated.`
        })
      })
    }

    // Mask no self-intersection
    code = 'maskselfintersection'
    if (codes.includes(code)) {
      const resourceMaskSelfIntersectionPoints = polygonSelfIntersectionPoints([
        this.georeferencedMap.resourceMask
      ])
      resourceMaskSelfIntersectionPoints.forEach(
        (resourceMaskSelfIntersectionPoint) => {
          this.errors.push({
            mapId: this.mapId,
            code,
            resourcePoint: resourceMaskSelfIntersectionPoint,
            message: `The mask self-intersects at resource coordinates [${resourceMaskSelfIntersectionPoint}].`
          })
        }
      )
    }

    return this.errors
  }

  /**
   * Get analysis measures
   *
   * @returns Analysis measures
   */
  public getMeasures(): Measures | undefined {
    if (!this.warpedMap) {
      return
    }

    const projectedGeoDiameter = bboxToDiameter(
      this.warpedMap.projectedGeoMaskBbox
    )

    // Polynomial
    const projectedPolynomialTransformer =
      this.warpedMap.getProjectedTransformer('polynomial')
    const toProjectedGeoPolynomialTransformation =
      projectedPolynomialTransformer.getToGeoTransformation() as Polynomial1

    const destinationPolynomial1Rmse =
      toProjectedGeoPolynomialTransformation.getDestinationRmse()
    const polynomial1Measures =
      toProjectedGeoPolynomialTransformation.getMeasures()

    // Helmert
    const projectedHelmertTransformer =
      this.warpedMap.getProjectedTransformer('helmert')
    const toProjectedGeoHelmertTransformation =
      projectedHelmertTransformer.getToGeoTransformation() as Helmert

    const destinationHelmertRmse =
      toProjectedGeoHelmertTransformation.getDestinationRmse()
    const helmertMeasures = toProjectedGeoHelmertTransformation.getMeasures()

    // Current transformation type
    const projectedTransformer = this.warpedMap.projectedTransformer
    const toProjectedGeoTransformation =
      projectedTransformer.getToGeoTransformation()
    const rmse = toProjectedGeoTransformation.getDestinationRmse()
    const destinationErrors = toProjectedGeoTransformation.getErrors()
    // Note: this could be spead up, since it recomputes this.warpedMap.projectedGeoTransformedResourcePoints
    // Note: we scale using the helmert transform instead of computing errors in resource
    // TODO: check if it's indeed deviding by scale
    const resourceErrors = destinationErrors.map(
      (error) => error / helmertMeasures.scale
    )
    // TODO: check if this is correct. Currenlty when we give one GCP a big offset, the others have larger resourceRelativeErrors
    const resourceMaskBboxDiameter = bboxToDiameter(
      this.warpedMap.resourceMaskBbox
    )
    const resourceRelativeErrors = destinationErrors.map(
      (error) => error / (helmertMeasures.scale * resourceMaskBboxDiameter)
    )

    this.measures = {
      mapId: this.mapId,
      projectedGeoDiameter,
      destinationPolynomial1Rmse,
      polynomial1Measures,
      destinationHelmertRmse,
      helmertMeasures,
      destinationRmse: rmse,
      destinationErrors,
      resourceErrors,
      resourceRelativeErrors
    }

    return this.measures
  }

  /**
   * Get distortions.
   *
   * @returns Analysis distortions
   */
  public getDistortions(): Distortions | undefined {
    if (
      !(this.warpedMap instanceof TriangulatedWarpedMap) ||
      !this.warpedMap.projectedGcpTriangulation
    ) {
      return
    }

    const distortions: Partial<Distortions> = {
      mapId: this.mapId
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
