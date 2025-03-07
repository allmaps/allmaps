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
import { AnalysisItem, Distortions, Measures } from './shared/types'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'

const MAX_SHEAR = 0.1

/**
 * Class for Analyzer.
 * This class describes how a georeferenced map is warped using a specific transformation.
 */
export class Analyzer {
  mapId: string

  georeferencedMap: GeoreferencedMap
  warpedMap?: WarpedMap

  protected info: AnalysisItem[] = []
  protected warnings: AnalysisItem[] = []
  protected errors: AnalysisItem[] = []

  protected measures?: Measures
  protected distortions?: Distortions

  protected infoComputed: boolean = false
  protected warningsComputed: boolean = false
  protected errorsComputed: boolean = false

  protected measuresComputed: boolean = false
  protected distortionsComputed: boolean = false

  /**
   * Creates an instance of Analyzer.
   *
   * @param georeferencedOrWarpedMap - A Georeferenced Map or a Warped Map
   */
  constructor(georeferenceddMap: GeoreferencedMap)
  constructor(warpedMap: WarpedMap)
  constructor(georeferencedOrWarpedMap: GeoreferencedMap | WarpedMap) {
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
        this.errors.push({
          mapId: this.mapId,
          code: 'buildingtriangulatedwarpedmapfailed',
          text:
            'Building a TriangulatedWarpedMap failed (possibly because triangulating the resourceMask failed). Error: ' +
            error
        })
      }
    }

    if (this.warpedMap === undefined) {
      try {
        this.warpedMap = new WarpedMap(this.mapId, this.georeferencedMap)
      } catch (error) {
        this.errors.push({
          mapId: this.mapId,
          code: 'buildingwarpedmapfailed',
          text: 'Building a WarpedMap failed. Error: ' + error
        })
      }
    }
  }

  /**
   * Check if analysis has info
   *
   * @returns Whether the analysis has info
   */
  public hasInfo(): boolean {
    if (!this.infoComputed) {
      this.getInfo()
    }

    return this.info.length != 0
  }

  /**
   * Check if analysis has warnings.
   *
   * @returns {boolean}
   */
  public hasWarnings(): boolean {
    if (!this.warningsComputed) {
      this.getWarnings()
    }

    return this.warnings.length != 0
  }

  /**
   * Check if analysis has errors
   *
   * @returns Whether the analysis has errors
   */
  public hasErrors(): boolean {
    if (!this.errorsComputed) {
      this.getErrors()
    }

    return this.errors.length != 0
  }

  /**
   * Get analysis informations
   *
   * @returns Analysis items with info
   */
  public getInfo(): AnalysisItem[] {
    if (this.infoComputed && this.info) {
      return this.info
    }

    // Mask equals full Mask
    if (
      this.warpedMap &&
      isEqualArray(
        this.warpedMap.resourceMask,
        this.warpedMap.resourceFullMask,
        isEqualPoint
      )
    ) {
      this.info.push({
        mapId: this.mapId,
        code: 'maskequalsfullmask',
        text: 'The mask contains the full image.'
      })
    }

    this.infoComputed = true

    return this.info
  }

  /**
   * Get zis warnings
   *
   * @returns Analysis items with warning
   */
  public getWarnings(): AnalysisItem[] {
    if (this.warningsComputed && this.warnings) {
      return this.warnings
    }

    // GCPs not outside mask
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
    if (this.warpedMap) {
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
    }

    // Transformation folds over
    // TODO: compute signDetJ only for this test instead of by default, e.g. by updating from existing distortions
    if (this.warpedMap instanceof TriangulatedWarpedMap) {
      const signDetJs =
        this.warpedMap.projectedGcpTriangulation?.gcpUniquePoints.map(
          (gcpUniquePoint) => gcpUniquePoint.distortions.get('signDetJ')
        )
      if (signDetJs && signDetJs.some((signDetJ) => signDetJ == -1)) {
        this.warnings.push({
          mapId: this.mapId,
          code: 'triangulationfoldsover',
          text: 'The map folds over itself, for the selected transformation type.'
        })
      }
    }

    // Polynomial shear not too high
    const measures = this.getMeasures()
    if (
      measures &&
      (measures.polynomialShear[0] > MAX_SHEAR ||
        measures.polynomialShear[1] > MAX_SHEAR)
    ) {
      this.warnings.push({
        mapId: this.mapId,
        code: 'polynomialsheartoohigh',
        text:
          'A polynomial transformation shows a shear higher then ' +
          MAX_SHEAR +
          '.'
      })
    }

    this.warningsComputed = true

    return this.warnings
  }

  /**
   * Get analysis errors
   *
   * @returns Analysis items with errors
   */
  public getErrors(): AnalysisItem[] {
    if (this.errorsComputed && this.errors) {
      return this.errors
    }

    // GCPs not incomplete
    const gcpsIncompleteResource = []
    for (const gcp of this.georeferencedMap.gcps) {
      if (gcp.resource == undefined || !isPoint(gcp.resource)) {
        gcpsIncompleteResource.push(gcp)
      }
    }
    gcpsIncompleteResource.forEach((gcp, index) => {
      this.errors.push({
        mapId: this.mapId,
        code: 'gcpincompleteresource',
        geoPoint: gcp.geo,
        gcpIndex: index,
        text: 'GCP ' + index + ' missing resource coordinates.'
      })
    })
    const gcpsIncompleteGeo = []
    for (const gcp of this.georeferencedMap.gcps) {
      if (gcp.geo == undefined || !isPoint(gcp.geo)) {
        gcpsIncompleteGeo.push(gcp)
      }
    }
    gcpsIncompleteGeo.forEach((gcp, index) => {
      this.errors.push({
        mapId: this.mapId,
        code: 'gcpincompletegeo',
        resourcePoint: gcp.resource,
        gcpIndex: index,
        text: 'GCP ' + index + ' missing geo coordinates.'
      })
    })
    if (gcpsIncompleteGeo.length > 0 || gcpsIncompleteResource.length > 0) {
      return this.errors
    }

    // GCPs amount not to low
    if (this.georeferencedMap.gcps.length < 3) {
      this.errors.push({
        mapId: this.mapId,
        code: 'gcpamounttoolow',
        text:
          'There are only ' +
          this.georeferencedMap.gcps.length +
          ' GCPs, but a minimum of 3 are required.'
      })
    }

    // GCPs no repeated points
    const resourceRepeatedPoints = arrayRepeated(
      this.georeferencedMap.gcps.map((gcp) => gcp.resource),
      isEqualPoint
    )
    const geoRepeatedPoints = arrayRepeated(
      this.georeferencedMap.gcps.map((gcp) => gcp.geo),
      isEqualPoint
    )
    resourceRepeatedPoints.forEach((resourceRepeatedPoint) => {
      this.errors.push({
        mapId: this.mapId,
        code: 'gcpresourcerepeatedpoint',
        resourcePoint: resourceRepeatedPoint,
        text:
          'GCP resource coordinates [' +
          resourceRepeatedPoint +
          '] are repeated.'
      })
    })
    geoRepeatedPoints.forEach((geoRepeatedPoint) => {
      this.errors.push({
        mapId: this.mapId,
        code: 'gcpgeorepeatedpoint',
        geoPoint: geoRepeatedPoint,
        text: 'GCP geo coordinates [' + geoRepeatedPoint + '] are repeated.'
      })
    })

    // Mask valid as ring
    const maskIsRing = isRing(this.georeferencedMap.resourceMask)
    if (!maskIsRing) {
      this.errors.push({
        mapId: this.mapId,
        code: 'masknotring',
        text: 'The mask is not a valid ring (an array of points).'
      })
    }
    if (!maskIsRing) {
      return this.errors
    }

    // Mask no repeated points
    const resourceMaskRepeatedPoints = arrayRepeated(
      this.georeferencedMap.resourceMask,
      isEqualPoint
    )
    resourceMaskRepeatedPoints.forEach((resourceMaskRepeatedPoint) => {
      this.errors.push({
        mapId: this.mapId,
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
      this.georeferencedMap.resourceMask
    ])
    resourceMaskSelfIntersectionPoints.forEach(
      (resourceMaskSelfIntersectionPoint) => {
        this.errors.push({
          mapId: this.mapId,
          code: 'maskselfintersection',
          resourcePoint: resourceMaskSelfIntersectionPoint,
          text:
            'The mask self-intersects at resource coordinates [' +
            resourceMaskSelfIntersectionPoint +
            '].'
        })
      }
    )

    this.errorsComputed = true

    return this.errors
  }

  /**
   * Get analysis measures
   *
   * @returns Analysis measures
   */
  public getMeasures(): Measures | undefined {
    if (this.measuresComputed && this.measures) {
      return this.measures
    }

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

    this.measuresComputed = true

    return this.measures
  }

  /**
   * Get distortions.
   *
   * @returns Analysis distortions
   */
  public getDistortions(): Distortions | undefined {
    if (this.distortionsComputed && this.distortions) {
      return this.distortions
    }

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

    this.distortionsComputed = true

    return this.distortions
  }
}
