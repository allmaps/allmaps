import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { triangulateToUnique } from '@allmaps/triangulate'
import { computeDistortionFromPartialDerivatives } from '@allmaps/transform'
import {
  geometryToDiameter,
  mixNumbers,
  mixPoints,
  getPropertyFromCacheOrComputation,
  getPropertyFromDoubleCacheOrComputation
} from '@allmaps/stdlib'

import WarpedMap from './WarpedMap.js'

import type { WarpedMapOptions } from '../shared/types.js'

import type { Point, Ring } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'

// TODO: Consider making this tunable by the user.
const DIAMETER_FRACTION = 300

const MAX_TRIANGULATE_ERROR_COUNT = 10

function createDefaultTriangulatedWarpedMapOptions(): Partial<WarpedMapOptions> {
  return {}
}

export function createTriangulatedWarpedMapFactory() {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => new TriangulatedWarpedMap(mapId, georeferencedMap, options)
}

/**
 * Class for triangulated warped maps.
 *
 * @export
 * @class TriangulatedWarpedMap
 * @param {Point[]} resourceTrianglepoints - Triangle points of the triangles the triangulated resourceMask (at the current bestScaleFactor)
 * @param {Point[]} resourceUniquepoints - Unique points of the triangles the triangulated resourceMask (at the current bestScaleFactor)
 * @param {number[]} trianglePointsUniquePointsIndex - Index in resourceUniquepoints where a specific resourceTrianglepoint can be found
 * @param {number} triangulateErrorCount - Number of time the triangulation has resulted in an error
 * @param {Point[]} projectedGeoPreviousTrianglePoints - The projectedGeoTrianglePoints of the previous transformation type, used during transformation transitions
 * @param {Point[]} projectedGeoTrianglePoints - The resourceTrianglePoints in geo coordinates
 * @param {Point[]} projectedGeoUniquePoints - The resourceUniquePoints in geo coordinates
 * @param {Point[]} projectedGeoUniquePointsPartialDerivativeX - Partial Derivative to X at the projectedGeoUniquePoints
 * @param {Point[]} projectedGeoUniquePointsPartialDerivativeY - Partial Derivative to Y at the projectedGeoUniquePoints
 * @param {number[]} previousTrianglePointsDistortion - The trianglePointsDistortion of the previous transformation type, used during transformation transitions
 * @param {number[]} trianglePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoTrianglePoints
 * @param {number[]} uniquePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoUniquePoints
 */
export default class TriangulatedWarpedMap extends WarpedMap {
  resourceTrianglePoints: Point[] = []
  resourceUniquePoints: Point[] = []
  trianglePointsUniquePointsIndex: number[] = []
  private triangulationByBestScaleFactor: Map<
    number,
    { trianglePointsUniquePointsIndex: number[]; resourceUniquePoints: Point[] }
  > = new Map()
  triangulateErrorCount = 0

  projectedGeoPreviousTrianglePoints: Point[] = []
  projectedGeoTrianglePoints: Point[] = []
  projectedGeoUniquePoints: Point[] = []
  private projectedGeoUniquePointsByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  projectedGeoUniquePointsPartialDerivativeX: Point[] = []
  projectedGeoUniquePointsPartialDerivativeY: Point[] = []
  private projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()
  private projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType: Map<
    number,
    Map<TransformationType, Point[]>
  > = new Map()

  previousTrianglePointsDistortion: number[] = []
  trianglePointsDistortion: number[] = []
  uniquePointsDistortion: number[] = []

  /**
   * Creates an instance of WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferende map this warped map is build on
   * @param {?Cache} [imageInfoCache] - Cache of the image info of this image
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) {
    options = {
      ...createDefaultTriangulatedWarpedMapOptions(),
      ...options
    }

    super(mapId, georeferencedMap, options)
  }

  /**
   * Update the resourceMask loaded from a georeferenced map to a new mask.
   *
   * @param {Ring} resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    super.setResourceMask(resourceMask)
    this.triangulationByBestScaleFactor = new Map()
    this.projectedGeoUniquePointsByBestScaleFactorAndTransformationType =
      new Map()
    this.projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType =
      new Map()
    this.projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType =
      new Map()
    this.updateTriangulation()
  }

  /**
   * Set the bestScaleFactor at the current viewport
   *
   * @param {number} scaleFactor - scale factor
   * @returns {boolean}
   */
  setBestScaleFactor(scaleFactor: number): boolean {
    const updating = super.setBestScaleFactor(scaleFactor)
    if (updating) {
      this.updateTriangulation(true)
    }
    return updating
  }

  /**
   * Update the triangulation of the resourceMask, at the current bestScaleFactor. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false] - whether the previous and new triangulation are the same - true by default, false during a transformation transition
   */
  updateTriangulation(previousIsNew = false) {
    const { trianglePointsUniquePointsIndex, resourceUniquePoints } =
      getPropertyFromCacheOrComputation(
        this.triangulationByBestScaleFactor,
        this.bestScaleFactor,
        () => {
          const diameter =
            (geometryToDiameter(this.resourceMask) * this.bestScaleFactor) /
            DIAMETER_FRACTION

          // TODO: make this obsolete by cleaning mask using conformPolygon() in @allmaps/annotation or in WarpedMap constructor
          try {
            const { uniquePointsIndexTriangles, uniquePoints } =
              triangulateToUnique(this.resourceMask, diameter)

            return {
              trianglePointsUniquePointsIndex:
                uniquePointsIndexTriangles.flat(),
              resourceUniquePoints: uniquePoints
            }
          } catch (err) {
            this.triangulateErrorCount++

            if (this.triangulateErrorCount <= MAX_TRIANGULATE_ERROR_COUNT) {
              // TODO: use function to get Allmaps Editor URL
              console.error(
                `Error computing triangulation for map ${this.mapId}.`,
                `Fix this map with Allmaps Editor: https://editor.allmaps.org/#/collection?url=${this.parsedImage?.uri}/info.json`
              )

              if (this.triangulateErrorCount === 1) {
                console.error(err)
              }
            }
            return {
              trianglePointsUniquePointsIndex:
                this.trianglePointsUniquePointsIndex,
              resourceUniquePoints: this.resourceUniquePoints
            }
          }
        }
      )

    this.resourceTrianglePoints = trianglePointsUniquePointsIndex.map(
      (i) => resourceUniquePoints[i]
    )
    this.resourceUniquePoints = resourceUniquePoints as Point[]
    this.trianglePointsUniquePointsIndex =
      trianglePointsUniquePointsIndex as number[]

    this.updateProjectedGeoTrianglePoints(previousIsNew)
  }

  /**
   * Update the (previous and new) points of the triangulated resourceMask, at the current bestScaleFactor, in projectedGeo coordinates. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false]
   */
  updateProjectedGeoTrianglePoints(previousIsNew = false) {
    this.projectedGeoUniquePoints = getPropertyFromDoubleCacheOrComputation(
      this.projectedGeoUniquePointsByBestScaleFactorAndTransformationType,
      this.bestScaleFactor,
      this.transformationType,
      () =>
        this.resourceUniquePoints.map((point) =>
          this.projectedTransformer.transformToGeo(point)
        )
    )
    this.projectedGeoTrianglePoints = this.trianglePointsUniquePointsIndex.map(
      (i) => this.projectedGeoUniquePoints[i]
    )

    if (previousIsNew || !this.projectedGeoPreviousTrianglePoints.length) {
      this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    }

    this.updateTrianglePointsDistortion(previousIsNew)
  }

  /**
   * Update the (previous and new) distortion at the points of the triangulated resourceMask. Use cache if available.
   *
   * @param {boolean} [previousIsNew=false]
   */
  updateTrianglePointsDistortion(previousIsNew = false) {
    this.projectedGeoUniquePointsPartialDerivativeX =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoUniquePointsPartialDerivativeXByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceUniquePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeX'
            })
          )
      )

    this.projectedGeoUniquePointsPartialDerivativeY =
      getPropertyFromDoubleCacheOrComputation(
        this
          .projectedGeoUniquePointsPartialDerivativeYByBestScaleFactorAndTransformationType,
        this.bestScaleFactor,
        this.transformationType,
        () =>
          this.resourceUniquePoints.map((point) =>
            this.projectedTransformer.transformToGeo(point, {
              evaluationType: 'partialDerivativeY'
            })
          )
      )

    this.uniquePointsDistortion = this.projectedGeoUniquePoints.map(
      (_point, index) =>
        computeDistortionFromPartialDerivatives(
          this.projectedGeoUniquePointsPartialDerivativeX[index],
          this.projectedGeoUniquePointsPartialDerivativeY[index],
          this.distortionMeasure!,
          this.getReferenceScale()
        )
    )
    this.trianglePointsDistortion = this.trianglePointsUniquePointsIndex.map(
      (i) => this.uniquePointsDistortion[i]
    )
    if (previousIsNew || !this.previousTrianglePointsDistortion.length) {
      this.previousTrianglePointsDistortion = this.trianglePointsDistortion
    }
  }

  /**
   * Reset the previous points of the triangulated resourceMask in projectedGeo coordinates.
   */
  resetTrianglePoints() {
    this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion
  }

  /**
   * Mix the previous and new points of the triangulated resourceMask in projectedGeo coordinates
   *
   * @param {number} t
   */
  mixTrianglePoints(t: number) {
    this.projectedGeoPreviousTrianglePoints =
      this.projectedGeoTrianglePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoPreviousTrianglePoints[index],
          t
        )
      })
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion.map(
      (distortion, index) => {
        return mixNumbers(
          distortion,
          this.previousTrianglePointsDistortion[index],
          t
        )
      }
    )
  }
}
