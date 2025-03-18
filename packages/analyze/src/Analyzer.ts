import classifyPoint from 'robust-point-in-polygon'

import { TriangulatedWarpedMap, WarpedMap } from '@allmaps/render'

import {
  isEqualArray,
  getPropertyFromCacheOrComputation,
  isEqualPoint,
  isRing,
  polygonSelfIntersectionPoints,
  arrayRepeated,
  bboxToDiameter,
  isPoint
} from '@allmaps/stdlib'
import {
  GcpTransformer,
  Helmert,
  Polynomial,
  Transformation
} from '@allmaps/transform'
import {
  AnalysisOptions,
  AnalysisItem,
  Analysis,
  Distortions,
  Measures
} from './shared/types'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'

const MAX_SHEAR = 0.1

// Note: construction errors and failures to get info, warning or errors are always reported
const defaultInfoCodes = ['maskequalsfullmask']
const defaultWarningCodes = [
  'gcpoutsidemask',
  'maskpointoutsidefullmask'
  // 'triangulationfoldsover'
  // 'polynomialsheartoohigh'
]
const defaultErrorCodes = [
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
const defaultCodes = [
  ...defaultInfoCodes,
  ...defaultWarningCodes,
  ...defaultErrorCodes
]

/**
 * Class for Analyzer.
 * This class describes how a georeferenced map is warped using a specific transformation.
 */
export class Analyzer {
  mapId: string

  georeferencedMap: GeoreferencedMap
  warpedMap?: WarpedMap

  options: AnalysisOptions = { codes: defaultCodes }

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
    options?: AnalysisOptions
  ) {
    if (options !== undefined) {
      this.options = options
    }

    if (georeferencedOrWarpedMap instanceof WarpedMap) {
      this.georeferencedMap = georeferencedOrWarpedMap.georeferencedMap
      this.warpedMap = georeferencedOrWarpedMap
    } else {
      this.georeferencedMap = georeferencedOrWarpedMap
    }

    // TODO: create mapId properly
    this.mapId = this.georeferencedMap.id || ''

    if (
      this.warpedMap == undefined ||
      !(this.warpedMap instanceof TriangulatedWarpedMap)
    ) {
      try {
        this.warpedMap = new TriangulatedWarpedMap(
          this.mapId,
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
        this.warpedMap = new WarpedMap(this.mapId, this.georeferencedMap)
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
   * @param options - Analysis options
   * @returns Analysis with info, warnings and errors
   */
  public analyse(options?: AnalysisOptions): Analysis {
    let errors: AnalysisItem[] = []
    let info: AnalysisItem[] = []
    let warnings: AnalysisItem[] = []

    try {
      errors = this.getErrors(options)
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
        info = this.getInfo(options)
      } catch (error) {
        this.errors.push({
          mapId: this.mapId,
          code: 'infofailed',
          message: 'Failed to get info.',
          originalMessage: String(error)
        })
      }
      try {
        warnings = this.getWarnings(options)
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
   * @param options - Analysis options
   * @returns Analysis items with info
   */
  public getInfo(options?: AnalysisOptions): AnalysisItem[] {
    options = options || this.options
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
   * @param options - Analysis options
   * @returns Analysis items with warning
   */
  public getWarnings(options?: AnalysisOptions): AnalysisItem[] {
    options = options || this.options
    const codes = options.codes
    let code: string

    this.warnings = []

    // GCPs not outside mask
    code = 'gcpoutsidemask'
    if (codes.includes(code)) {
      const gcpsOutside = []
      for (const gcp of this.georeferencedMap.gcps) {
        if (
          classifyPoint(this.georeferencedMap.resourceMask, gcp.resource) == 1
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
          message:
            'GCP ' +
            index +
            ' with resource coordinates [' +
            gcp.resource +
            '] outside mask.'
        })
      })
    }

    // Mask points not outside full mask
    code = 'maskpointoutsidefullmask'
    if (codes.includes(code) && this.warpedMap) {
      const resourceMaskOutsideFullMaskPoints = []
      for (const resourcePoint of this.warpedMap.resourceMask) {
        if (
          classifyPoint(this.warpedMap.resourceFullMask, resourcePoint) == 1
        ) {
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
            message:
              'Mask point ' +
              index +
              ' with resource coordinates [' +
              resourceMaskOutsideFullMaskPoint +
              '] outside full mask.'
          })
        }
      )
    }

    // Transformation folds over
    // TODO: set to compute signDetJ for this test (ideally by updating from existing distortions)
    // TODO: add to readme when implemented
    // code = 'triangulationfoldsover'
    // if (
    //   codes.includes(code) &&
    //   this.warpedMap instanceof TriangulatedWarpedMap
    // ) {
    //   const signDetJs =
    //     this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.map(
    //       (gcpUniquePoint) => gcpUniquePoint.distortions.get('signDetJ')
    //     )
    //   if (signDetJs && signDetJs.some((signDetJ) => signDetJ == -1)) {
    //     this.warnings.push({
    //       mapId: this.mapId,
    //       code,
    //       message: 'The map folds over itself, for the selected transformation type.'
    //     })
    //   }
    // }

    // Polynomial shear not too high
    code = 'polynomialsheartoohigh'
    if (codes.includes(code)) {
      const measures = this.getMeasures()
      if (
        measures &&
        (measures.polynomialShear[0] > MAX_SHEAR ||
          measures.polynomialShear[1] > MAX_SHEAR)
      ) {
        this.warnings.push({
          mapId: this.mapId,
          code,
          message:
            'A polynomial transformation shows a shear higher then ' +
            MAX_SHEAR +
            '.'
        })
      }
    }

    return this.warnings
  }

  /**
   * Get analysis errors
   *
   * @param options - Analysis options
   * @returns Analysis items with errors
   */
  public getErrors(options?: AnalysisOptions): AnalysisItem[] {
    options = options || this.options
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
          message: 'GCP ' + index + ' missing resource coordinates.'
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
          message: 'GCP ' + index + ' missing geo coordinates.'
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
        message:
          'There are ' +
          this.georeferencedMap.gcps.length +
          ' GCPs, but a minimum of 2 are required (for a Helmert transform).'
      })
    }

    // GCPs amount not less then 3
    code = 'gcpamountlessthen3'
    if (codes.includes(code) && this.georeferencedMap.gcps.length < 3) {
      this.errors.push({
        mapId: this.mapId,
        code,
        message:
          'There are ' +
          this.georeferencedMap.gcps.length +
          ' GCPs, but a minimum of 3 are required.'
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
          message:
            'GCP resource coordinates [' +
            resourceRepeatedPoint +
            '] are repeated.'
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
          message:
            'GCP geo coordinates [' + geoRepeatedPoint + '] are repeated.'
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
          message:
            'Mask resource coordinates [' +
            resourceMaskRepeatedPoint +
            '] are repeated.'
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
            message:
              'The mask self-intersects at resource coordinates [' +
              resourceMaskSelfIntersectionPoint +
              '].'
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

    const warpedMap = this.warpedMap

    // Polynomial
    const projectedPolynomialTransformer = getPropertyFromCacheOrComputation(
      this.warpedMap.projectedTransformerByTransformationType,
      'polynomial',
      () =>
        new GcpTransformer(warpedMap.projectedGcps, 'polynomial', {
          differentHandedness: true
        }) // TODO: load default options? Or differentHandedness becomes default?
    )

    // TODO: createForwardTransformation() will soon check, compute and return the transformation
    if (!projectedPolynomialTransformer.forwardTransformation) {
      projectedPolynomialTransformer.createForwardTransformation()
    }
    const forwardPolynomialTransformation =
      // We assume rmse, scale, shear exist since this is a first order polynomial transformation
      projectedPolynomialTransformer.forwardTransformation as Polynomial
    const polynomialRmse = forwardPolynomialTransformation.rmse
    const polynomialParameters =
      forwardPolynomialTransformation.polynomialParameters
    const polynomialScale = forwardPolynomialTransformation.scale as Point
    const polynomialRotation =
      forwardPolynomialTransformation.rotation as number
    const polynomialShear = forwardPolynomialTransformation.shear as Point
    const polynomialTranslation =
      forwardPolynomialTransformation.translation as Point

    // Helmert
    const projectedHelmertTransformer = getPropertyFromCacheOrComputation(
      this.warpedMap.projectedTransformerByTransformationType,
      'helmert',
      () =>
        new GcpTransformer(warpedMap.projectedGcps, 'helmert', {
          differentHandedness: true
        }) // TODO: load default options? Or differentHandedness becomes default?
    )

    // TODO: createForwardTransformation() will soon check, compute and return the transformation
    if (!projectedHelmertTransformer.forwardTransformation) {
      projectedHelmertTransformer.createForwardTransformation()
    }
    const forwardHelmertTransformation =
      projectedHelmertTransformer.forwardTransformation as Helmert

    const helmertRmse = forwardHelmertTransformation.rmse
    const helmertParameters = forwardHelmertTransformation.helmertParameters
    const helmertScale = forwardHelmertTransformation.scale
    const helmertRotation = forwardHelmertTransformation.rotation
    const helmertTranslation = forwardHelmertTransformation.translation

    // Current transformation type
    const projectedTransformer = this.warpedMap.projectedTransformer
    // TODO: createForwardTransformation() will soon check, compute and return the transformation
    if (!projectedTransformer.forwardTransformation) {
      projectedTransformer.createForwardTransformation()
    }
    const forwardTransformation =
      projectedTransformer.forwardTransformation as Transformation
    const rmse = forwardTransformation.rmse
    const destinationErrors = forwardTransformation.errors
    // Note: we scale using the helmert transform instead of computing errors in resource
    // TODO: check if it's indeed deviding by scale
    const resourceErrors = forwardTransformation.errors.map(
      (error) => error / forwardHelmertTransformation.scale
    )
    // TODO: check if this is correct. Currenlty when we give one GCP a big offset, the others have larger resourceRelativeErrors
    const resourceRelativeErrors = forwardTransformation.errors.map(
      (error) =>
        error /
        (forwardHelmertTransformation.scale *
          bboxToDiameter(warpedMap.resourceMaskBbox))
    )

    this.measures = {
      mapId: this.mapId,
      polynomialRmse,
      polynomialParameters,
      polynomialScale,
      polynomialRotation,
      polynomialShear,
      polynomialTranslation,
      helmertRmse,
      helmertParameters,
      helmertScale,
      helmertRotation,
      helmertTranslation,
      rmse,
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

    const distortionMeasures = Array.from(
      this.warpedMap.projectedGcpTriangulation.gcpUniquePoints[0].distortions.keys()
    )

    for (const distortionMeasure of distortionMeasures) {
      if (!distortions.meanDistortions) {
        distortions.meanDistortions = new Map()
      }
      const triangulationDistortions =
        this.warpedMap.projectedGcpTriangulation.gcpUniquePoints
          .map((gcpUniquePoint) =>
            gcpUniquePoint.distortions.get(distortionMeasure)
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
