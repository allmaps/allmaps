import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { triangulateToUnique } from '@allmaps/triangulate'
import {
  computeDistortionsFromPartialDerivatives,
  getForwardTransformResolution
} from '@allmaps/transform'
import {
  mixNumbers,
  mixPoints,
  getPropertyFromDoubleCacheOrComputation
} from '@allmaps/stdlib'

import WarpedMap from './WarpedMap.js'

import type { WarpedMapOptions } from '../shared/types.js'

import type {
  DistortionMeasure,
  GcpTransformer,
  TransformationType
} from '@allmaps/transform'
import type { Gcp, Point, Ring, TypedPolygon } from '@allmaps/types'

const DEFAULT_RESOURCE_RESOLUTION = undefined // TODO: allow to set via options
const DEFAULT_DISTORTION_MEASURES: DistortionMeasure[] = [
  'log2sigma',
  'twoOmega'
] // TODO: allow to set via options
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

type GcpAndDistortions = Gcp & {
  distortions: Map<DistortionMeasure, number>
  distortion: number
}

type GcpTriangulation = {
  resourceResolution: number | undefined
  gcpUniquePoints: GcpAndDistortions[]
  uniquePointIndices: number[]
  uniquePointIndexInterpolatedPolygon: TypedPolygon<number>
}

/**
 * Class for triangulated WarpedMaps.
 *
 * @export
 * @class TriangulatedWarpedMap
 *
 * @param {number} resourcePreviousResolution - Resolution (or 'distance') used during the previous triangulation of the resource mask
 * @param {number} resourceResolution - Resolution (or 'distance') used during the triangulation of the resource mask, computed as the finest resource segment resulting from a resource-to-geo transformation of the horizontal and vertical midline of the resource bbox using the current transformation type
 * @param {number} triangulateErrorCount - Number of time the triangulation has resulted in an error
 * @param {GcpTriangulation} projectedGcpPreviousTriangulation - Previous triangulation of the resource mask
 * @param {GcpTriangulation} projectedGcpTriangulation - Triangulation of the resource mask of a specific resource resolution, with unique points in resource and projected geospatial coordinates with distortions, and indices pointing to the triangles points and indices pointing to the triangulation-refined resource mask
 * @param {Point[]} resourceTrianglePoints - Triangle points of the triangles the triangulated resourceMask
 * @param {Point[]} projectedGeoPreviousTrianglePoints - The projectedGeoTrianglePoints of the previous transformation type, used during transformation transitions
 * @param {Point[]} projectedGeoTrianglePoints - The resourceTrianglePoints in projected geospatial coordinates
 * @param {number[]} previousTrianglePointsDistortion - The trianglePointsDistortion of the previous transformation type, used during transformation transitions
 * @param {number[]} trianglePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoTrianglePoints
 * @param {Ring[]} projectedGeoPreviousTriangulationMask - The resource mask refined by the previous triangulation, in projected geospatial coordinates
 * @param {Ring[]} projectedGeoTriangulationMask - The resource mask refined by the triangulation, in projected geospatial coordinates
 */
export default class TriangulatedWarpedMap extends WarpedMap {
  previousResourceResolution: number | undefined
  resourceResolution: number | undefined

  triangulateErrorCount = 0

  projectedGcpPreviousTriangulation?: GcpTriangulation
  projectedGcpTriangulation?: GcpTriangulation
  private projectedGcpTriangulationByTransformationTypeAndResourceResolution: Map<
    TransformationType,
    Map<number, GcpTriangulation>
  > = new Map()

  resourceTrianglePoints: Point[] = []

  projectedGeoPreviousTrianglePoints: Point[] = []
  projectedGeoTrianglePoints: Point[] = []

  previousTrianglePointsDistortion: number[] = []
  trianglePointsDistortion: number[] = []

  projectedGeoPreviousTriangulationMask: Ring = []
  projectedGeoTriangulationMask: Ring = []

  /**
   * Creates an instance of a TriangulatedWarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param {WarpedMapOptions} [options] - Options
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

    this.updateTriangulation()
  }

  /**
   * Update the resourceMask.
   *
   * @param {Ring} resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    super.setResourceMask(resourceMask)
    this.updateTriangulation()
  }

  /**
   * Reset the previous points and values.
   */
  resetPrevious() {
    super.resetPrevious()
    this.previousResourceResolution = this.resourceResolution
    this.projectedGcpPreviousTriangulation = this.projectedGcpTriangulation
    this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion

    this.projectedGeoPreviousTriangulationMask =
      this.projectedGeoTriangulationMask
  }

  /**
   * Mix the previous and new points and values.
   *
   * @param {number} t
   */
  mixPreviousAndNew(t: number) {
    super.mixPreviousAndNew(t)

    if (
      this.projectedGcpPreviousTriangulation &&
      this.projectedGcpTriangulation
    ) {
      this.previousResourceResolution = this.resourceResolution
      this.projectedGcpPreviousTriangulation = {
        resourceResolution:
          this.projectedGcpPreviousTriangulation.resourceResolution,
        gcpUniquePoints:
          this.projectedGcpPreviousTriangulation.gcpUniquePoints.map(
            (projectedGcp, index) => {
              return {
                resource: projectedGcp.resource,
                geo: mixPoints(
                  this.projectedGcpTriangulation!.gcpUniquePoints[index].geo,
                  projectedGcp.geo,
                  t
                ),
                // Note: Not mixing the distortions Map, only the active distortion
                distortions:
                  this.projectedGcpTriangulation!.gcpUniquePoints[index]
                    .distortions,
                distortion: mixNumbers(
                  this.projectedGcpTriangulation!.gcpUniquePoints[index]
                    .distortion || 0,
                  projectedGcp.distortion || 0,
                  t
                )
              }
            }
          ),
        uniquePointIndices:
          this.projectedGcpPreviousTriangulation.uniquePointIndices,
        uniquePointIndexInterpolatedPolygon:
          this.projectedGcpPreviousTriangulation
            .uniquePointIndexInterpolatedPolygon
      }

      this.projectedGeoPreviousTrianglePoints =
        this.projectedGcpPreviousTriangulation.uniquePointIndices.map(
          (i) => this.projectedGcpPreviousTriangulation!.gcpUniquePoints[i].geo
        )
      this.previousTrianglePointsDistortion =
        this.projectedGcpPreviousTriangulation.uniquePointIndices.map(
          (i) =>
            this.projectedGcpPreviousTriangulation!.gcpUniquePoints[i]
              .distortion as number
        )
    }

    this.projectedGeoPreviousTriangulationMask =
      this.projectedGeoTriangulationMask.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoPreviousTriangulationMask[index],
          t
        )
      })
  }

  /**
   * Update the (previous and new) triangulation of the resourceMask. Use cache if available.
   */
  private updateTriangulation() {
    // The following ensures this function is only run after initialisation
    // This class' constructor calls this function twice
    // Once via super() and updateTransformerProperties()
    // but then the cache is not ready yet, so we make it return
    // And once at the end
    if (
      !this.projectedGcpTriangulationByTransformationTypeAndResourceResolution
    ) {
      return
    }

    // Get resolution from transform
    const resourceResolution =
      DEFAULT_RESOURCE_RESOLUTION ||
      getForwardTransformResolution(
        this.resourceMaskBbox,
        this.projectedTransformer,
        {}
      )

    // Adapt resolution from previous
    let refinePrevious = false
    if (resourceResolution && this.previousResourceResolution) {
      refinePrevious = this.previousResourceResolution < resourceResolution
      this.resourceResolution = Math.min(
        resourceResolution,
        this.previousResourceResolution
      )
    }
    if (resourceResolution && !this.previousResourceResolution) {
      refinePrevious = true
      this.resourceResolution = resourceResolution
    }
    if (!resourceResolution && this.previousResourceResolution) {
      this.resourceResolution = this.previousResourceResolution
    } else if (!resourceResolution && !this.previousResourceResolution) {
      this.resourceResolution = undefined
    }

    // Compute triangulation
    this.projectedGcpTriangulation = getPropertyFromDoubleCacheOrComputation(
      this.projectedGcpTriangulationByTransformationTypeAndResourceResolution,
      this.transformationType,
      this.resourceResolution,
      () => {
        try {
          // Triangulate resource mask
          const {
            uniquePoints,
            uniquePointIndexTriangles,
            uniquePointIndexInterpolatedPolygon
          } = triangulateToUnique([this.resourceMask], this.resourceResolution)

          // Extend Triangulation to ProjectedGcpTriangulation
          // By inclusing projectedGeo and distortions
          const resourceResolution = this.resourceResolution
          const resourceUniquePoints = uniquePoints as Point[]
          const gcpUniquePoints = resourceUniquePoints.map((resourcePoint) =>
            this.resourceToResourceProjectedGeoDistortions(
              resourcePoint,
              this.projectedTransformer,
              this.getReferenceScale()
            )
          )
          const uniquePointIndices =
            uniquePointIndexTriangles.flat() as number[]

          return {
            resourceResolution,
            gcpUniquePoints,
            uniquePointIndices,
            uniquePointIndexInterpolatedPolygon
          }
        } catch (err) {
          // TODO: check if this try/catch can be removed
          // and if not use conformPolygon() in @allmaps/annotation of add a check for self-intersection
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
        }
      }
    )
    if (!this.projectedGcpPreviousTriangulation) {
      this.projectedGcpPreviousTriangulation = this.projectedGcpTriangulation
    }

    // If new triangulation has higher resolution then previous, refine previous from new
    if (refinePrevious) {
      this.previousResourceResolution = this.resourceResolution
      this.projectedGcpPreviousTriangulation =
        getPropertyFromDoubleCacheOrComputation(
          this
            .projectedGcpTriangulationByTransformationTypeAndResourceResolution,
          this.previousTransformationType,
          this.previousResourceResolution,
          () => {
            return {
              resourceResolution:
                this.projectedGcpTriangulation!.resourceResolution,
              gcpUniquePoints:
                this.projectedGcpTriangulation!.gcpUniquePoints.map(
                  (projectedGcp) =>
                    this.resourceToResourceProjectedGeoDistortions(
                      projectedGcp.resource,
                      this.projectedPreviousTransformer,
                      this.getReferenceScale()
                    )
                ),
              uniquePointIndices:
                this.projectedGcpTriangulation!.uniquePointIndices,
              uniquePointIndexInterpolatedPolygon:
                this.projectedGcpTriangulation!
                  .uniquePointIndexInterpolatedPolygon
            }
          },
          () => !this.mixed,
          () => !this.mixed
        )
    }

    this.updateTrianglePoints()
  }

  /**
   * Derive the (previous and new) resource and projectedGeo points from their corresponding triangulations.
   *
   * Also derive the (previous and new) triangulation-refined resource and projectedGeo mask
   */
  private updateTrianglePoints() {
    if (
      !this.projectedGcpPreviousTriangulation ||
      !this.projectedGcpTriangulation
    ) {
      return
    }

    this.resourceTrianglePoints =
      this.projectedGcpTriangulation.uniquePointIndices.map(
        (i) => this.projectedGcpTriangulation!.gcpUniquePoints[i].resource
      )
    this.projectedGeoTrianglePoints =
      this.projectedGcpTriangulation.uniquePointIndices.map(
        (i) => this.projectedGcpTriangulation!.gcpUniquePoints[i].geo
      )
    this.projectedGeoPreviousTrianglePoints =
      this.projectedGcpPreviousTriangulation.uniquePointIndices.map(
        (i) => this.projectedGcpPreviousTriangulation!.gcpUniquePoints[i].geo
      )

    this.projectedGeoTriangulationMask =
      this.projectedGcpTriangulation.uniquePointIndexInterpolatedPolygon
        .map((typedRing) =>
          typedRing.map(
            (i) => this.projectedGcpTriangulation!.gcpUniquePoints[i].geo
          )
        )
        .flat()
    this.projectedGeoPreviousTriangulationMask =
      this.projectedGcpPreviousTriangulation.uniquePointIndexInterpolatedPolygon
        .map((typedRing) =>
          typedRing.map(
            (i) =>
              this.projectedGcpPreviousTriangulation!.gcpUniquePoints[i].geo
          )
        )
        .flat()

    this.updateTrianglePointsDistortion()
  }

  /**
   * Derive the (previous and new) distortions from their corresponding triangulations.
   */
  private updateTrianglePointsDistortion() {
    if (
      !this.projectedGcpPreviousTriangulation ||
      !this.projectedGcpTriangulation
    ) {
      return
    }

    this.trianglePointsDistortion =
      this.projectedGcpTriangulation.uniquePointIndices.map((i) =>
        this.distortionMeasure
          ? (this.projectedGcpTriangulation!.gcpUniquePoints[i].distortions.get(
              this.distortionMeasure
            ) as number)
          : 0
      )
    this.previousTrianglePointsDistortion =
      this.projectedGcpPreviousTriangulation.uniquePointIndices.map((i) =>
        this.previousDistortionMeasure
          ? (this.projectedGcpPreviousTriangulation!.gcpUniquePoints[
              i
            ].distortions.get(this.previousDistortionMeasure) as number)
          : 0
      )
  }

  protected resourceToResourceProjectedGeoDistortions(
    resourcePoint: Point,
    transformer: GcpTransformer,
    referenceScale?: number
  ): GcpAndDistortions {
    const projectedGeoPoint = transformer.transformToGeo(resourcePoint)
    const partialDerivativeX = transformer.transformToGeo(resourcePoint, {
      evaluationType: 'partialDerivativeX'
    })
    const partialDerivativeY = transformer.transformToGeo(resourcePoint, {
      evaluationType: 'partialDerivativeY'
    })
    const distortions = computeDistortionsFromPartialDerivatives(
      DEFAULT_DISTORTION_MEASURES,
      partialDerivativeX,
      partialDerivativeY,
      referenceScale
    )
    return {
      resource: resourcePoint,
      geo: projectedGeoPoint,
      distortions,
      distortion: 0
    }
  }

  protected updateTransformerProperties(useCache = true): void {
    super.updateTransformerProperties(useCache)
    this.updateTriangulation()
  }

  protected updateDistortionProperties(): void {
    super.updateDistortionProperties()
    this.updateTrianglePointsDistortion()
  }
}
