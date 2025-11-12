import { GeoreferencedMap } from '@allmaps/annotation'
import { interpolatePolygon, triangulateToUnique } from '@allmaps/triangulate'
import {
  mixNumbers,
  mixPoints,
  getPropertyFromDoubleCacheOrComputation,
  getPropertyFromQuadrupleCacheOrComputation,
  mergeOptions,
  mixLineStrings
} from '@allmaps/stdlib'

import { WarpedMap } from './WarpedMap.js'

import type {
  SpecificTriangulatedWarpedMapOptions,
  TriangulatedWarpedMapOptions,
  WarpedMapOptions
} from '../shared/types.js'

import type {
  GcpAndDistortions,
  DistortionMeasure,
  TransformationType
} from '@allmaps/transform'
import type { Gcp, Point, Ring, TypedPolygon } from '@allmaps/types'
import type { TriangulationToUnique } from '@allmaps/triangulate'
import type { Projection } from '@allmaps/project'

export const DEFAULT_SPECIFIC_TRIANGULATED_WARPED_MAP_OPTIONS: SpecificTriangulatedWarpedMapOptions =
  {
    distortionMeasures: ['log2sigma', 'twoOmega']
  }

export function createTriangulatedWarpedMapFactory() {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => new TriangulatedWarpedMap(mapId, georeferencedMap, options)
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
 * @param resourcePreviousResolution - Resolution (or 'distance') used during the previous triangulation of the resource mask
 * @param resourceResolution - Resolution (or 'distance') used during the triangulation of the resource mask, computed as the finest resource segment resulting from a resource-to-geo transformation of the horizontal and vertical midline of the resource bbox using the current transformation type
 * @param triangulateErrorCount - Number of time the triangulation has resulted in an error
 * @param projectedGcpPreviousTriangulation - Previous triangulation of the resource mask
 * @param projectedGcpTriangulation - Triangulation of the resource mask of a specific resource resolution, with unique points in resource and projected geospatial coordinates with distortions, and indices pointing to the triangles points and indices pointing to the triangulation-refined resource mask
 * @param resourceTrianglePoints - Triangle points of the triangles the triangulated resourceMask
 * @param projectedGeoPreviousTrianglePoints - The projectedGeoTrianglePoints of the previous transformation type, used during transformation transitions
 * @param projectedGeoTrianglePoints - The resourceTrianglePoints in projected geospatial coordinates
 * @param previousTrianglePointsDistortion - The trianglePointsDistortion of the previous transformation type, used during transformation transitions
 * @param trianglePointsDistortion - Distortion amount of the distortionMeasure at the projectedGeoTrianglePoints
 * @param projectedGeoPreviousTriangulationAppliableMask - The resource appliable mask refined by the previous triangulation, in projected geospatial coordinates
 * @param projectedGeoTriangulationAppliableMask - The resource appliable mask refined by the triangulation, in projected geospatial coordinates
 * @param projectedGeoPreviousTriangulationMask - The resource mask refined by the previous triangulation, in projected geospatial coordinates
 * @param projectedGeoTriangulationMask - The resource mask refined by the triangulation, in projected geospatial coordinates
 */
export class TriangulatedWarpedMap extends WarpedMap {
  declare mapOptions: Partial<TriangulatedWarpedMapOptions>
  declare listOptions: Partial<TriangulatedWarpedMapOptions>
  declare georeferencedMapOptions: Partial<TriangulatedWarpedMapOptions>
  declare defaultOptions: TriangulatedWarpedMapOptions
  declare options: TriangulatedWarpedMapOptions

  previousResourceResolution: number | undefined
  resourceResolution: number | undefined

  triangulateErrorCount = 0

  projectedGcpPreviousTriangulation?: GcpTriangulation
  projectedGcpTriangulation?: GcpTriangulation
  protected resourceTriangulationCache: Map<
    number,
    Map<string, TriangulationToUnique>
  >
  protected projectedGcpTriangulationCache: Map<
    number,
    Map<string, Map<TransformationType, Map<string, GcpTriangulation>>>
  >

  resourceTrianglePoints: Point[] = []

  projectedGeoPreviousTrianglePoints: Point[] = []
  projectedGeoTrianglePoints: Point[] = []

  previousTrianglePointsDistortion: number[] = []
  trianglePointsDistortion: number[] = []

  projectedGeoPreviousTriangulationAppliableMask: Ring = []
  projectedGeoTriangulationAppliableMask: Ring = []

  projectedGeoPreviousTriangulationMask: Ring = []
  projectedGeoTriangulationMask: Ring = []

  /**
   * Creates an instance of a TriangulatedWarpedMap.
   *
   * @param mapId - ID of the map
   * @param georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param options - Options
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<TriangulatedWarpedMap>
  ) {
    super(mapId, georeferencedMap, options)

    this.resourceTriangulationCache = new Map()
    this.projectedGcpTriangulationCache = new Map()

    this.updateTriangulation()
  }

  /**
   * Get default options
   */
  static getDefaultOptions(): TriangulatedWarpedMapOptions {
    return mergeOptions(
      DEFAULT_SPECIFIC_TRIANGULATED_WARPED_MAP_OPTIONS,
      super.getDefaultOptions()
    )
  }

  /** Set default options */
  setDefaultOptions() {
    this.defaultOptions = TriangulatedWarpedMap.getDefaultOptions()
  }

  /**
   * Update the ground control points loaded from a georeferenced map to new ground control points.
   *
   * @param gcps - the new ground control points
   */
  protected setGcps(gcps: Gcp[]): void {
    super.setGcps(gcps)
    this.clearResourceTriangulationCaches()
    this.updateTriangulation()
  }

  /**
   * Update the resource mask loaded from a georeferenced map to a new mask.
   *
   * @param resourceMask - the new mask
   */
  protected setResourceMask(
    resourceFullMask: Ring,
    resourceAppliableMask: Ring,
    resourceMask: Ring
  ): void {
    super.setResourceMask(resourceFullMask, resourceAppliableMask, resourceMask)
    this.updateTriangulation()
  }

  /**
   * Set the distortionMeasure
   *
   * @param distortionMeasure - the disortion measure
   */
  protected setDistortionMeasure(distortionMeasure?: DistortionMeasure): void {
    super.setDistortionMeasure(distortionMeasure)
    this.updateTrianglePointsDistortion()
  }

  /**
   * Set the internal projection
   *
   * @param projection - the internal projection
   */
  protected setInternalProjection(projection: Projection): void {
    super.setInternalProjection(projection)
    this.updateTriangulation()
  }

  /**
   * Set the projection
   *
   * @param projection - the projection
   */
  protected setProjection(projection: Projection): void {
    super.setProjection(projection)
    this.clearProjectedTriangulationCaches()
    this.updateTriangulation()
  }

  /**
   * Reset previous transform properties to new ones (when completing an animation).
   */
  resetPrevious() {
    super.resetPrevious()
    this.previousResourceResolution = this.resourceResolution
    this.projectedGcpPreviousTriangulation = this.projectedGcpTriangulation
    this.projectedGeoPreviousTrianglePoints = this.projectedGeoTrianglePoints
    this.previousTrianglePointsDistortion = this.trianglePointsDistortion

    this.projectedGeoPreviousTriangulationAppliableMask =
      this.projectedGeoTriangulationAppliableMask
    this.projectedGeoPreviousTriangulationMask =
      this.projectedGeoTriangulationMask
  }

  /**
   * Mix previous transform properties with new ones (when changing an ongoing animation).
   *
   * @param t - animation progress
   */
  mixPreviousAndNew(t: number) {
    super.mixPreviousAndNew(t)

    if (
      this.projectedGcpPreviousTriangulation &&
      this.projectedGcpTriangulation
    ) {
      const projectedGcpPreviousTriangulation =
        this.projectedGcpPreviousTriangulation
      const projectedGcpTriangulation = this.projectedGcpTriangulation

      this.previousResourceResolution = this.resourceResolution
      this.projectedGcpPreviousTriangulation = {
        resourceResolution:
          projectedGcpPreviousTriangulation.resourceResolution,
        gcpUniquePoints: projectedGcpPreviousTriangulation.gcpUniquePoints.map(
          (projectedGcp, index) => {
            return {
              resource: projectedGcp.resource,
              geo: mixPoints(
                projectedGcpTriangulation.gcpUniquePoints[index].geo,
                projectedGcp.geo,
                t
              ),
              // Note: Not mixing the distortions Map, only the active distortion
              distortions:
                projectedGcpTriangulation.gcpUniquePoints[index].distortions,
              distortion: mixNumbers(
                projectedGcpTriangulation.gcpUniquePoints[index].distortion ||
                  0,
                projectedGcp.distortion || 0,
                t
              )
            }
          }
        ),
        uniquePointIndices:
          projectedGcpPreviousTriangulation.uniquePointIndices,
        uniquePointIndexInterpolatedPolygon:
          projectedGcpPreviousTriangulation.uniquePointIndexInterpolatedPolygon
      }

      this.projectedGeoPreviousTrianglePoints =
        projectedGcpPreviousTriangulation.uniquePointIndices.map(
          (i) => projectedGcpPreviousTriangulation.gcpUniquePoints[i].geo
        )
      this.previousTrianglePointsDistortion =
        projectedGcpPreviousTriangulation.uniquePointIndices.map(
          (i) =>
            projectedGcpPreviousTriangulation.gcpUniquePoints[i]
              .distortion as number
        )
    }

    // Also mix mask
    this.projectedGeoPreviousTriangulationAppliableMask = mixLineStrings(
      this.projectedGeoTriangulationAppliableMask,
      this.projectedGeoPreviousTriangulationAppliableMask,
      t
    )
    this.projectedGeoPreviousTriangulationMask = mixLineStrings(
      this.projectedGeoTriangulationMask,
      this.projectedGeoPreviousTriangulationMask,
      t
    )
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
      !this.resourceTriangulationCache ||
      !this.projectedGcpTriangulationCache
    ) {
      return
    }

    // Get resolution from transform
    const resourceResolution =
      this.options.resourceResolution ||
      this.projectedTransformer.getToGeoTransformationResolution(
        this.resourceMaskBbox
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
    this.projectedGcpTriangulation = getPropertyFromQuadrupleCacheOrComputation(
      this.projectedGcpTriangulationCache,
      this.resourceResolution,
      String(this.resourceMask),
      this.transformationType,
      this.internalProjection.definition,
      () => {
        const {
          uniquePoints,
          uniquePointIndexTriangles,
          uniquePointIndexInterpolatedPolygon
        } = getPropertyFromDoubleCacheOrComputation(
          this.resourceTriangulationCache,
          this.resourceResolution,
          String(this.resourceMask),
          () =>
            triangulateToUnique([this.resourceMask], this.resourceResolution, {
              steinerPoints: this.gcps.map((gcp) => gcp.resource)
            })
        )

        // Extend Triangulation to ProjectedGcpTriangulation
        // By including projectedGeo and distortions
        const resourceResolution = this.resourceResolution
        const resourceUniquePoints = uniquePoints as Point[]
        const gcpUniquePoints = resourceUniquePoints.map((resourcePoint) =>
          this.projectedTransformer.transformToGeo(
            resourcePoint,
            {
              distortionMeasures: this.options.distortionMeasures,
              referenceScale: this.getReferenceScale()
            },
            (gcpPartialDistortion) => gcpPartialDistortion
          )
        )
        const uniquePointIndices = uniquePointIndexTriangles.flat() as number[]

        return {
          resourceResolution,
          gcpUniquePoints,
          uniquePointIndices,
          uniquePointIndexInterpolatedPolygon
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
        getPropertyFromQuadrupleCacheOrComputation(
          this.projectedGcpTriangulationCache,
          this.previousResourceResolution,
          String(this.resourceMask),
          this.previousTransformationType,
          this.previousInternalProjection.definition,
          () => {
            if (!this.projectedGcpTriangulation) {
              // TODO: rewrite this function, make more readble?
              throw new Error('No projectedGcpTriangulation')
            }
            const projectedGcpTriangulation = this.projectedGcpTriangulation

            return {
              resourceResolution:
                this.projectedGcpTriangulation.resourceResolution,
              gcpUniquePoints:
                this.projectedGcpTriangulation.gcpUniquePoints.map(
                  (projectedGcp) =>
                    this.projectedPreviousTransformer.transformToGeo(
                      projectedGcp.resource,
                      {
                        distortionMeasures: this.options.distortionMeasures,
                        referenceScale: this.getReferenceScale()
                      },
                      (gcpPartialDistortion) => gcpPartialDistortion
                    )
                ),
              uniquePointIndices:
                this.projectedGcpTriangulation.uniquePointIndices,
              uniquePointIndexInterpolatedPolygon:
                projectedGcpTriangulation.uniquePointIndexInterpolatedPolygon
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
    const projectedGcpPreviousTriangulation =
      this.projectedGcpPreviousTriangulation
    const projectedGcpTriangulation = this.projectedGcpTriangulation

    this.resourceTrianglePoints =
      this.projectedGcpTriangulation.uniquePointIndices.map(
        (i) => projectedGcpTriangulation.gcpUniquePoints[i].resource
      )
    this.projectedGeoPreviousTrianglePoints =
      this.projectedGcpPreviousTriangulation.uniquePointIndices.map(
        (i) => projectedGcpPreviousTriangulation.gcpUniquePoints[i].geo
      )
    this.projectedGeoTrianglePoints =
      this.projectedGcpTriangulation.uniquePointIndices.map(
        (i) => projectedGcpTriangulation.gcpUniquePoints[i].geo
      )

    // Also update the mask

    // The triangulation produces triangles based on the resource mask,
    // and refines that mask in it's process (using the resource resolution),
    // giving a slighly different result then if we would simply transform
    // the resource mask to projected geo space (because the transformation refinement
    // is different then the triangulation refinement).
    // To prevent noticable slivers between both,
    // we compute a triangulation-refined mask in projected geo space
    // from the resource mask as refined by/during the triangulation.
    // This way we obtain a mask that exactly matches the triangulation.
    this.projectedGeoPreviousTriangulationMask =
      this.projectedGcpPreviousTriangulation.uniquePointIndexInterpolatedPolygon
        .map((typedRing) =>
          typedRing.map(
            (i) => projectedGcpPreviousTriangulation.gcpUniquePoints[i].geo
          )
        )
        .flat()
    this.projectedGeoTriangulationMask =
      this.projectedGcpTriangulation.uniquePointIndexInterpolatedPolygon
        .map((typedRing) =>
          typedRing.map((i) => projectedGcpTriangulation.gcpUniquePoints[i].geo)
        )
        .flat()
    // To do the same for the appliable mask
    // we compute it by transforming the 'appliable mask' to projecte geo space
    // but to make sure that the number of points is the same
    // before and after the transform (to prevent webgl buffer errors)
    // and that the transform is fine enough and (!) follows the mask,
    // we first refine the mask in the same way as during a triangulation
    // and then transform point-by-point instead of as a ring or polygon that should be defined
    this.projectedGeoTriangulationAppliableMask =
      this.projectedTransformer.transformToGeo(
        interpolatePolygon(
          [this.resourceAppliableMask],
          this.resourceResolution!
        )[0],
        {
          isMultiGeometry: true
        }
      )
    if (this.projectedGeoPreviousTriangulationAppliableMask.length == 0) {
      this.projectedGeoPreviousTriangulationAppliableMask =
        this.projectedGeoTriangulationAppliableMask
    }

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
    const projectedGcpPreviousTriangulation =
      this.projectedGcpPreviousTriangulation
    const projectedGcpTriangulation = this.projectedGcpTriangulation

    this.previousTrianglePointsDistortion =
      projectedGcpPreviousTriangulation.uniquePointIndices.map((i) => {
        const distortions =
          projectedGcpPreviousTriangulation.gcpUniquePoints[i].distortions
        if (!this.previousDistortionMeasure || !distortions) {
          return 0
        } else {
          return distortions.get(this.previousDistortionMeasure) as number
        }
      })
    this.trianglePointsDistortion =
      projectedGcpTriangulation.uniquePointIndices.map((i) => {
        const distortions =
          projectedGcpTriangulation.gcpUniquePoints[i].distortions
        if (!this.distortionMeasure || !distortions) {
          return 0
        } else {
          return distortions.get(this.distortionMeasure) as number
        }
      })
  }

  protected updateProjectedTransformerProperties(): void {
    super.updateProjectedTransformerProperties()
    this.updateTriangulation()
  }

  protected clearProjectedTransformerCaches() {
    super.clearProjectedTransformerCaches()
    this.clearResourceTriangulationCaches()
  }

  protected clearResourceTriangulationCaches() {
    this.resourceTriangulationCache = new Map()
    this.clearProjectedTriangulationCaches()
  }

  protected clearProjectedTriangulationCaches() {
    this.projectedGcpTriangulationCache = new Map()
  }
}
