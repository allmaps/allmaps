import inside from 'point-in-polygon-hao'
import Matrix, { QrDecomposition } from 'ml-matrix'

import { validateGeoreferencedMap } from '@allmaps/annotation'
import { TriangulatedWarpedMap, WarpedMap } from '@allmaps/render'

import {
  isEqualArray,
  isEqualPoint,
  isRing,
  polygonSelfIntersectionPoints,
  arrayRepeated,
  arrayContains,
  bboxToDiameter,
  isPoint,
  closeRing,
  mergeOptions
} from '@allmaps/stdlib'
import { Helmert, Polynomial1 } from '@allmaps/transform'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'

import type {
  AnalysisOptions,
  AnalysisItem,
  Analysis,
  Distortions,
  Measures,
  ProtoGeoreferencedMap,
  InfoCode,
  WarningCode,
  ErrorCode
} from './shared/types'

// Note: construction errors and failures to get info, warning or errors are always reported
const DEFAULT_INFO_CODES: InfoCode[] = [
  'maskequalsfullmask',
  'gcpresourcepointismaskpoint'
]
const DEFAULT_WARNING_CODES: WarningCode[] = [
  'maskmissing',
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
const DEFAULT_ERROR_CODES: ErrorCode[] = [
  'constructinggeoreferencedmapfailed',
  'constructingtriangulatedwarpedmapfailed',
  'constructingwarpedmapfailed',
  'gcpincompleteresource',
  'gcpincompleteregeo',
  'gcpsnotlinearlyindependent',
  'gcpsmissing',
  // 'gcpsamountlessthen2',
  'gcpsamountlessthen3',
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

  protoGeoreferencedMap: ProtoGeoreferencedMap
  georeferencedMap?: GeoreferencedMap
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
   * @param map - A (proto) Georeferenced Map or a Warped Map
   */
  constructor(
    protoGeoreferencedMap: ProtoGeoreferencedMap,
    options?: AnalysisOptions
  )
  constructor(georeferenceddMap: GeoreferencedMap, options?: AnalysisOptions)
  constructor(warpedMap: WarpedMap, options?: AnalysisOptions)
  constructor(
    map: ProtoGeoreferencedMap | GeoreferencedMap | WarpedMap,
    options?: Partial<AnalysisOptions>
  ) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options)

    if (map instanceof WarpedMap) {
      this.warpedMap = map
      this.georeferencedMap = map.georeferencedMap
      this.protoGeoreferencedMap = this.georeferencedMap
    } else if ('type' in map && map.type === 'GeoreferencedMap') {
      this.georeferencedMap = map as GeoreferencedMap
      this.protoGeoreferencedMap = map
    } else {
      this.protoGeoreferencedMap = map
    }

    // Note: since we cannot await in a constructor,
    // we can't compute a missing mapId here using generateChecksum()
    // and hence it can be undefined in this entire package
    // (also because georeferencedMap is not guaranteed to exist)
    this.mapId = this.georeferencedMap?.id

    // Analyzing whether a GeoreferencedMap can be constructed (from a ProtoGeoreferencedMap)
    // for a ProtoGeoreferencedMap
    if (this.georeferencedMap === undefined) {
      try {
        const mapOrMaps = validateGeoreferencedMap(this.protoGeoreferencedMap)
        this.georeferencedMap = Array.isArray(mapOrMaps)
          ? mapOrMaps[0]
          : mapOrMaps
      } catch (error) {
        this.constructionErrors.push({
          mapId: this.mapId,
          code: 'constructinggeoreferencedmapfailed',
          message: 'Constructing a GeoreferencedMap failed.',
          originalMessage: String(error)
        })
      }
    }

    // Analyzing whether a TriangulatedWarpedMap can be constructed (from a GeoreferencedMap)
    // for a GeoreferencedMap, or for a WarpedMap that is not a TriangulatedWarpedMap
    if (
      this.georeferencedMap &&
      (this.warpedMap == undefined ||
        !(this.warpedMap instanceof TriangulatedWarpedMap))
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

    // Analyzing whether a WarpedMap can be constructed (from a GeoreferencedMap)
    // for a GeoreferencedMap
    if (this.georeferencedMap && this.warpedMap === undefined) {
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
   * Analyzanalye
   *
   * Applying extra caution: wrapping the getters in a try catch
   *
   * @param partialOptions - Analysis options
   * @returns Analysis with info, warnings and errors
   */
  public analyze(partialOptions?: Partial<AnalysisOptions>): Analysis {
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
    let code

    this.info = []

    code = 'maskequalsfullmask'
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

    code = 'gcpresourcepointismaskpoint'
    if (
      codes.includes(code) &&
      this.protoGeoreferencedMap.gcps &&
      this.protoGeoreferencedMap.resourceMask
    ) {
      const gcpsResourcePointAlsoMaskPoint: {
        gcpIndex: number
        maskPointIndex: number
        resourcePoint: Point
      }[] = []
      for (const [gcpIndex, gcp] of this.protoGeoreferencedMap.gcps.entries()) {
        if (gcp.resource) {
          const contains = arrayContains(
            this.protoGeoreferencedMap.resourceMask,
            gcp.resource,
            isEqualPoint
          )
          if (contains) {
            gcpsResourcePointAlsoMaskPoint.push({
              gcpIndex,
              maskPointIndex: contains.index,
              resourcePoint: contains.item
            })
          }
        }
      }
      gcpsResourcePointAlsoMaskPoint.forEach(
        ({ gcpIndex, maskPointIndex, resourcePoint }) => {
          this.info.push({
            mapId: this.mapId,
            code,
            resourcePoint,
            gcpIndex,
            maskPointIndex,
            message: `GCP ${gcpIndex} with resource coordinates [${resourcePoint}] is mask point ${maskPointIndex}.`
          })
        }
      )
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

    code = 'maskmissing'
    if (codes.includes(code)) {
      if (!this.protoGeoreferencedMap.resourceMask) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `A mask is missing.`
        })
      }
    }

    code = 'gcpoutsidemask'
    if (
      codes.includes(code) &&
      this.protoGeoreferencedMap.gcps &&
      this.protoGeoreferencedMap.resourceMask
    ) {
      const gcpsOutside = []
      for (const [gcpIndex, gcp] of this.protoGeoreferencedMap.gcps.entries()) {
        if (
          gcp.resource &&
          inside(gcp.resource, [
            closeRing(this.protoGeoreferencedMap.resourceMask)
          ]) === false
        ) {
          gcpsOutside.push({ gcp, gcpIndex })
        }
      }
      gcpsOutside.forEach(({ gcp, gcpIndex }) => {
        this.warnings.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcp.resource,
          gcpIndex: gcpIndex,
          message: `GCP ${gcpIndex} with resource coordinates [${gcp.resource}] outside mask.`
        })
      })
    }

    code = 'maskpointoutsidefullmask'
    if (codes.includes(code) && this.warpedMap) {
      const resourceMaskOutsideFullMaskPoints = []

      const closedResourceFullMask = [
        closeRing(this.warpedMap.resourceFullMask)
      ]

      for (const [
        maskPointIndex,
        resourceMaskPoint
      ] of this.warpedMap.resourceMask.entries()) {
        if (inside(resourceMaskPoint, closedResourceFullMask) === false) {
          resourceMaskOutsideFullMaskPoints.push({
            resourceMaskPoint,
            maskPointIndex
          })
        }
      }
      resourceMaskOutsideFullMaskPoints.forEach(
        ({ resourceMaskPoint, maskPointIndex }) => {
          this.warnings.push({
            mapId: this.mapId,
            code,
            resourcePoint: resourceMaskPoint,
            maskPointIndex,
            message: `Mask point ${maskPointIndex} with resource coordinates [${resourceMaskPoint}] outside full mask.`
          })
        }
      )
    }

    code = 'destinationrmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationRmse / measures.projectedGeoMaskBboxDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter.`
        })
      }
    }

    code = 'destinationhelmertrmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationHelmertRmse /
          measures.projectedGeoMaskBboxDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter for a Helmert transformation.`
        })
      }
    }

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

    code = 'destinationpolynomial1rmsetoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        measures.destinationPolynomial1Rmse /
          measures.projectedGeoMaskBboxDiameter >
          options.maxRmseDiameterFraction
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message: `The RMSE is higher then ${options.maxRmseDiameterFraction} times the map diameter for a polynomial transformation.`
        })
      }
    }

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
          geoPoint: this.warpedMap.projectedTransformer.projectionToLonLat(
            gcpUniquePointsFiltered[0].geo
          ),
          message: `The area distortion (log2sigma) is higher then ${options.maxLog2sigma} or lower then ${options.minLog2sigma}.`
        })
      }
    }

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
          geoPoint: this.warpedMap.projectedTransformer.projectionToLonLat(
            gcpUniquePointsFiltered[0].geo
          ),
          message: `The angular (twoOmega) distortion is higher then ${options.maxTwoOmega}.`
        })
      }
    }

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
          geoPoint: this.warpedMap.projectedTransformer.projectionToLonLat(
            gcpUniquePointsFiltered[0].geo
          ),
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

    code = 'gcpsmissing'
    if (codes.includes(code) && !this.protoGeoreferencedMap.gcps) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message: `GCPs are missing.`
      })
    }

    code = 'gcpincompleteresource'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const gcpsIncompleteResource = []
      for (const [gcpIndex, gcp] of this.protoGeoreferencedMap.gcps.entries()) {
        if (gcp.resource == undefined || !isPoint(gcp.resource)) {
          gcpsIncompleteResource.push({ gcp, gcpIndex })
        }
      }
      gcpsIncompleteResource.forEach(({ gcp, gcpIndex }) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          geoPoint: gcp.geo,
          gcpIndex,
          message: `GCP ${gcpIndex} missing resource coordinates.`
        })
      })
    }

    code = 'gcpincompletegeo'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const gcpsIncompleteGeo = []
      for (const [gcpIndex, gcp] of this.protoGeoreferencedMap.gcps.entries()) {
        if (gcp.geo == undefined || !isPoint(gcp.geo)) {
          gcpsIncompleteGeo.push({ gcp, gcpIndex })
        }
      }
      gcpsIncompleteGeo.forEach(({ gcp, gcpIndex }) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: gcp.resource,
          gcpIndex,
          message: `GCP ${gcpIndex} missing geo coordinates.`
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

    code = 'gcpsamountlessthen2'
    if (
      codes.includes(code) &&
      this.protoGeoreferencedMap.gcps &&
      this.protoGeoreferencedMap.gcps.length < 2
    ) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message: `There are ${this.protoGeoreferencedMap.gcps.length} GCPs, but a minimum of 2 are required (for a Helmert transform).`
      })
    }

    code = 'gcpsamountlessthen3'
    if (
      codes.includes(code) &&
      this.protoGeoreferencedMap.gcps &&
      this.protoGeoreferencedMap.gcps.length < 3
    ) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message: `There are ${this.protoGeoreferencedMap.gcps.length} GCPs, but a minimum of 3 are required.`
      })
    }

    code = 'gcpresourcerepeatedpoint'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const resourceRepeatedPoints = arrayRepeated(
        this.protoGeoreferencedMap.gcps
          .filter((gcp) => gcp.resource)
          .map((gcp) => gcp.resource as Point),
        isEqualPoint
      )
      resourceRepeatedPoints.forEach((resourceRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: resourceRepeatedPoint.item,
          gcpIndex: resourceRepeatedPoint.index,
          message: `GCP ${resourceRepeatedPoint.index} with resource coordinates [${resourceRepeatedPoint.item}] is repeated.`
        })
      })
    }

    code = 'gcpgeorepeatedpoint'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const geoRepeatedPoints = arrayRepeated(
        this.protoGeoreferencedMap.gcps
          .filter((gcp) => gcp.geo)
          .map((gcp) => gcp.geo as Point),
        isEqualPoint
      )
      geoRepeatedPoints.forEach((geoRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          geoPoint: geoRepeatedPoint.item,
          gcpIndex: geoRepeatedPoint.index,
          message: `GCP ${geoRepeatedPoint.index} with geo coordinates [${geoRepeatedPoint.item}] is repeated.`
        })
      })
    }

    code = 'gcpsresourcenotlinearlyindependent'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const resourcePoints = this.protoGeoreferencedMap.gcps
        .filter((gcp) => gcp.resource)
        .map((gcp) => gcp.resource as Point)
      if (
        resourcePoints.length > 0 &&
        new QrDecomposition(new Matrix(resourcePoints)).isFullRank()
      ) {
        this.errors.push({
          mapId: this.mapId,
          code,
          message: `GCP resource coordinates are not linearly independent.`
        })
      }
    }
    code = 'gcpsgeonotlinearlyindependent'
    if (codes.includes(code) && this.protoGeoreferencedMap.gcps) {
      const geoPoints = this.protoGeoreferencedMap.gcps
        .filter((gcp) => gcp.geo)
        .map((gcp) => gcp.geo as Point)
      if (
        geoPoints.length > 0 &&
        new QrDecomposition(new Matrix(geoPoints)).isFullRank()
      ) {
        this.errors.push({
          mapId: this.mapId,
          code,
          message: `GCP geo coordinates are not linearly independent.`
        })
      }
    }

    code = 'masknotring'
    if (codes.includes(code) && this.protoGeoreferencedMap.resourceMask) {
      const maskIsRing = isRing(this.protoGeoreferencedMap.resourceMask)
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

    code = 'maskrepeatedpoint'
    if (codes.includes(code) && this.protoGeoreferencedMap.resourceMask) {
      const resourceMaskRepeatedPoints = arrayRepeated(
        this.protoGeoreferencedMap.resourceMask,
        isEqualPoint
      )
      resourceMaskRepeatedPoints.forEach((resourceMaskRepeatedPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code,
          resourcePoint: resourceMaskRepeatedPoint.item,
          maskPointIndex: resourceMaskRepeatedPoint.index,
          message: `Mask point ${resourceMaskRepeatedPoint.index} with resource coordinates [${resourceMaskRepeatedPoint.item}] is repeated.`
        })
      })
    }

    code = 'maskselfintersection'
    if (codes.includes(code) && this.protoGeoreferencedMap.resourceMask) {
      const resourceMaskSelfIntersectionPoints = polygonSelfIntersectionPoints([
        this.protoGeoreferencedMap.resourceMask
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

    const resourceMaskBboxDiameter = bboxToDiameter(
      this.warpedMap.resourceMaskBbox
    )
    const projectedGeoMaskBboxDiameter = bboxToDiameter(
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
    const destinationRmse = toProjectedGeoTransformation.getDestinationRmse()
    const destinationErrors = toProjectedGeoTransformation.getErrors()
    // Note: this could be spead up, since it recomputes this.warpedMap.projectedGeoTransformedResourcePoints
    // Note: we scale using the helmert transform instead of computing errors in resource
    // TODO: check if it's indeed deviding by scale
    const resourceErrors = destinationErrors.map(
      (error) => error / helmertMeasures.scale
    )
    // TODO: check if this is correct. Currenlty when we give one GCP a big offset, the others have larger resourceRelativeErrors
    const resourceRelativeErrors = destinationErrors.map(
      (error) => error / (helmertMeasures.scale * resourceMaskBboxDiameter)
    )

    this.measures = {
      mapId: this.mapId,
      projectedGeoMaskBboxDiameter,
      resourceMaskBboxDiameter,
      destinationPolynomial1Rmse,
      polynomial1Measures,
      destinationHelmertRmse,
      helmertMeasures,
      destinationRmse,
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
