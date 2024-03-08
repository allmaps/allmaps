import { generateId } from '@allmaps/id'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { Image as IIIFImage } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import { triangulate } from '@allmaps/triangulate'
import {
  computeBbox,
  bboxToRectangle,
  bboxesToScale,
  geometryToDiameter,
  fetchImageInfo,
  lonLatToWebMecator,
  mixPoints,
  isOverlapping
} from '@allmaps/stdlib'

import { applyTransform } from './shared/matrix.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Point, Gcp, Ring, Bbox, GeojsonPolygon } from '@allmaps/types'
import type {
  TransformationType,
  PartialTransformOptions
} from '@allmaps/transform'

import type Viewport from './Viewport.js'

const DIAMETER_FRACTION = 80 // TODO: Consider making this tunable by the user.
const TRANSFORMER_OPTIONS = {
  maxOffsetRatio: 0.05,
  maxDepth: 2,
  differentHandedness: true
} as PartialTransformOptions
const PROJECTED_TRANSFORMER_OPTIONS = {
  maxOffsetRatio: 0.05,
  maxDepth: 2,
  differentHandedness: true
} as PartialTransformOptions

/**
 * Class for warped maps, which describe how a georeferenced map is warped using a specific transformation.
 *
 * @export
 * @class WarpedMap
 * @typedef {WarpedMap}
 * @extends {EventTarget}
 * @param {string} mapId - ID of the map
 * @param {GeoreferencedMap} georeferencedMap - Georeferende map this warped map is build on
 * @param {Gcp[]} gcps - Ground Controle Points used for warping this map (source to geo)
 * @param {Gcp[]} projectedGcps - Projected Ground Controle Points (source to projectedGeo)
 * @param {Ring} resourceMask - Resource mask
 * @param {Bbox} resourceMaskBbox - Bbox of the resource mask
 * @param {Ring} resourceFullMask - Resource full mask (describing the entire extent of the image)
 * @param {Bbox} resourceFullMaskBbox - Bbox of the resource full mask
 * @param {Cache} imageInfoCache - Cache of the image info of this image
 * @param {string} imageId - ID of the image
 * @param {IIIFImage} parsedImage - ID of the image
 * @param {boolean} visible - Whether the map is visible
 * @param {TransformationType} transformationType - Transformation type used in the transfomer
 * @param {GcpTransformer} transformer - Transformer used for warping this map (resource to geo)
 * @param {GcpTransformer} projectedTransformer - Projected Transformer used for warping this map (resource to projectedGeo)
 * @private {Map<TransformationType, GcpTransformer>} transformerByTransformationType - Cache of transformer by transformation type
 * @private {Map<TransformationType, GcpTransformer>} projecteTransformerByTransformationType - Cache of projected transformer by transformation type
 * @param {GeojsonPolygon} geoMask - Resource mask in geo coordinates
 * @param {Bbox} geoMaskBbox - Bbox of the geo mask
 * @param {GeojsonPolygon} geoFullMask - Resource full mask in geo coordinates
 * @param {Bbox} geoFullMaskBbox - Bbox of the geo full mask
 * @param {Ring} projectedGeoMask - Resource mask in projected geo coordintas
 * @param {Bbox} projectedGeoMaskBbox - Bbox of the projectedGeo mask
 * @param {Ring} projectedGeoFullMask - Resource full mask in projected geo coordintas
 * @param {Bbox} projectedGeoFullMaskBbox - Bbox of the projectedGeo full mask
 * @param {number} resourceToProjectedGeoScale - Scale of the warped map, in resource pixels per projected geo coordinates.
 * @param {number} bestScaleFactor - The best tile scale factor for displaying this map, at the current viewport
 * @param {Ring} resourceViewportRing - The viewport transformed back to resource coordinates, at the current viewport
 * @param {Bbox} resourceViewportRingBbox - Bbox of the viewport transformed back to resource coordinates, at the current viewport
 * @param {Point[]} resourceTriangles - Triangles of the triangulated resourceMask (at the current bestScaleFactor)
 * @private {Map<number, Point[][]>} resourceTrianglesByBestScaleFactor - Cache of the triangles of the triangulated resourceMask by bestScaleFactor
 * @param {Point[]} resourceTrianglePoints - Points of the triangles the triangulated resourceMask (at the current bestScaleFactor and viewport)
 * @param {Point[]} projectedGeoCurrentTrianglePoints - Current points of the triangles of the triangulated resource mask (at the current bestScaleFactor and viewport) in projectedGeo coordinates
 * @param {Point[]} projectedGeoNewTrianglePoints - New (during transformation transition) points of the triangles of the triangulated resource mask (at the current bestScaleFactor and viewport) in projectedGeo coordinate
 */
export default class WarpedMap extends EventTarget {
  mapId: string
  georeferencedMap: GeoreferencedMap

  gcps: Gcp[]
  projectedGcps: Gcp[]

  resourceMask: Ring
  resourceMaskBbox: Bbox
  resourceFullMask: Ring
  resourceFullMaskBbox: Bbox

  imageInfoCache?: Cache
  imageId?: string
  parsedImage?: IIIFImage
  loadingImageInfo: boolean

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedTransformer!: GcpTransformer
  private transformerByTransformationType: Map<
    TransformationType,
    GcpTransformer
  > = new Map()
  private projectedTransformerByTransformationType: Map<
    TransformationType,
    GcpTransformer
  > = new Map()

  geoMask!: GeojsonPolygon
  geoMaskBbox!: Bbox
  geoFullMask!: GeojsonPolygon
  geoFullMaskBbox!: Bbox

  projectedGeoMask!: Ring
  projectedGeoMaskBbox!: Bbox
  projectedGeoFullMask!: Ring
  projectedGeoFullMaskBbox!: Bbox

  resourceToProjectedGeoScale!: number

  // The properties below are for the current viewport

  bestScaleFactor!: number

  resourceViewportRing: Ring = [] // At current viewport
  resourceViewportRingBbox?: Bbox

  // The properties below are at the current bestScaleFactor

  resourceTriangles: Point[][] = []
  private resourceTrianglesByBestScaleFactor: Map<number, Point[][]> = new Map()

  // The properties below are at the current bestScaleFactor and viewport

  resourceTrianglePoints: Point[] = []
  projectedGeoCurrentTrianglePoints: Point[] = []
  projectedGeoNewTrianglePoints: Point[] = []

  /**
   * Creates an instance of WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferende map this warped map is build on
   * @param {?Cache} [imageInfoCache] - Cache of the image info of this image
   * @param {boolean} [visible=true] - Whether the map is visible
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    imageInfoCache?: Cache,
    visible = true
  ) {
    super()

    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.gcps = this.georeferencedMap.gcps
    this.projectedGcps = this.gcps.map(({ resource, geo }) => ({
      resource,
      geo: lonLatToWebMecator(geo)
    }))

    this.resourceMask = this.georeferencedMap.resourceMask
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceFullMask = [
      [0, 0],
      [this.georeferencedMap.resource.width, 0],
      [
        this.georeferencedMap.resource.width,
        this.georeferencedMap.resource.height
      ],
      [0, this.georeferencedMap.resource.height]
    ]
    this.resourceFullMaskBbox = computeBbox(this.resourceFullMask)

    this.imageInfoCache = imageInfoCache
    this.loadingImageInfo = false

    this.visible = visible

    this.transformationType =
      this.georeferencedMap.transformation?.type || 'polynomial'

    this.updateTransformerProperties()
  }

  /**
   * Get resource mask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Ring}
   */
  getViewportMask(viewport: Viewport): Ring {
    return this.projectedGeoMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get bbox of resource mask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getViewportMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportMask(viewport))
  }

  /**
   * Get approximate resource mask in viewport coordinates
   *
   * Approximate since transform of bbox (used here) is not as precise as bbox of transform (which is more expensive to compute)
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getApproxViewportMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(
      bboxToRectangle(this.projectedGeoMaskBbox).map((point) => {
        return applyTransform(viewport.projectedGeoToViewportTransform, point)
      })
    )
  }

  /**
   * Get resource full mask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Ring}
   */
  getViewportFullMask(viewport: Viewport): Ring {
    return this.projectedGeoFullMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get bbox of resource full mask in viewport coordinates
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getViewportFullMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportFullMask(viewport))
  }

  /**
   * Get approximate resource full mask in viewport coordinates
   *
   * Approximate since transform of bbox (used here) is not as precise as bbox of transform (which is more expensive to compute)
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {Bbox}
   */
  getApproxViewportFullMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(
      bboxToRectangle(this.projectedGeoFullMaskBbox).map((point) => {
        return applyTransform(viewport.projectedGeoToViewportTransform, point)
      })
    )
  }

  /**
   * Get scale of the warped map, in resource pixels per viewport pixels.
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getResourceToViewportScale(viewport: Viewport): number {
    return bboxesToScale(
      this.resourceMaskBbox,
      this.getViewportMaskBbox(viewport)
    )
  }

  /**
   * Get scale of the warped map, in resource pixels per canvas pixels.
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getResourceToCanvasScale(viewport: Viewport): number {
    return this.getResourceToViewportScale(viewport) / viewport.devicePixelRatio
  }

  /**
   * Get approximate scale of the warped map, in resource pixels per viewport pixels.
   *
   * Approximate since appoximate resource to viewport scale is used
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getApproxResourceToViewportScale(viewport: Viewport): number {
    return bboxesToScale(
      this.resourceMaskBbox,
      this.getApproxViewportMaskBbox(viewport)
    )
  }

  /**
   * Get approximate scale of the warped map, in resource pixels per canvas pixels.
   *
   * Approximate since appoximate resource to viewport scale is used
   *
   * @param {Viewport} viewport - the current viewport
   * @returns {number}
   */
  getApproxResourceToCanvasScale(viewport: Viewport): number {
    return (
      this.getApproxResourceToViewportScale(viewport) /
      viewport.devicePixelRatio
    )
  }

  /**
   * Set viewport ring in resource coorinates of current viewport
   *
   * @param {Ring} resourceViewportRing
   */
  setResourceViewportRing(resourceViewportRing: Ring): void {
    this.resourceViewportRing = resourceViewportRing
    this.resourceViewportRingBbox = computeBbox(resourceViewportRing)
    this.updateResourceTrianglePoints(true)
  }

  /**
   * Update the mask loaded from a georeferenced map to a new mask.
   *
   * @param {Ring} resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    this.resourceMask = resourceMask
    this.updateGeoMask()
    this.updateProjectedGeoMask()
  }

  /**
   * Update the transformation type loaded from a georeferenced map to a new transformation type.
   *
   * @param {TransformationType} transformationType
   */
  setTransformationType(transformationType: TransformationType): void {
    this.transformationType = transformationType
    this.updateTransformerProperties()
  }

  /**
   * Update the ground controle points loaded from a georeferenced map to new ground controle points.
   *
   * @param {GCP[]} gcps
   */
  setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.updateTransformerProperties(false)
  }

  /**
   * Set the best scale factor at the current viewport
   *
   * @param {number} scaleFactor - scale factor
   * @param {boolean} [holdTransform=false] - hold the transfomation of points, usfull to prevent repeated (expensive) resource to projectedGeo point transformations
   * @returns {boolean}
   */
  setBestScaleFactor(scaleFactor: number, holdTransform = false): void {
    if (this.bestScaleFactor != scaleFactor) {
      this.bestScaleFactor = scaleFactor
      this.updateTriangulation(true, holdTransform)
    }
  }

  /**
   * Update the triangulation of the resource mask, at the current bestScaleFactor
   *
   * @param {boolean} [currentIsNew=false] - whether the new and current triangulation are the same - true by default, false during a transformation transition
   * @param {boolean} [holdTransform=false] - hold the transfomation of points, usfull to prevent repeated (expensive) resource to projectedGeo point transformations
   */
  updateTriangulation(currentIsNew = false, holdTransform = false) {
    if (this.resourceTrianglesByBestScaleFactor.has(this.bestScaleFactor)) {
      this.resourceTriangles = this.resourceTrianglesByBestScaleFactor.get(
        this.bestScaleFactor
      ) as Point[][]
    } else {
      const diameter =
        (geometryToDiameter(this.resourceMask) * this.bestScaleFactor) /
        DIAMETER_FRACTION

      this.resourceTriangles = triangulate(this.resourceMask, diameter)

      this.resourceTrianglesByBestScaleFactor.set(
        this.bestScaleFactor,
        this.resourceTriangles
      )
    }

    this.updateResourceTrianglePoints(currentIsNew, holdTransform)
  }

  /**
   * Update the resource triangle points of the triangulation, at the current bestScaleFactor and viewport.
   * This filters out the resource triangles that don't overlap with the resourceViewportRingBbox.
   *
   * @param {boolean} [currentIsNew=false] - whether the new and current triangulation are the same - true by default, false during a transformation transition
   * @param {boolean} [holdTransform=false] - hold the transfomation of points, usfull to prevent repeated (expensive) resource to projectedGeo point transformations
   */
  updateResourceTrianglePoints(
    currentIsNew = false,
    holdTransform = false
  ): void {
    if (!this.resourceViewportRingBbox) {
      return
    }
    this.resourceTrianglePoints = this.resourceTriangles
      .filter((triangle) =>
        isOverlapping(computeBbox(triangle), this.resourceViewportRingBbox!)
      )
      .flat()
    if (!holdTransform) {
      this.updateProjectedGeoTrianglePoints(currentIsNew)
    }
  }

  /**
   * Update the (current and new) points of the triangulated resource mask in projectedGeo coordinates, at the current best scale factor and viewport
   *
   * @param {boolean} [currentIsNew=false]
   */
  updateProjectedGeoTrianglePoints(currentIsNew = false) {
    this.projectedGeoNewTrianglePoints = this.resourceTrianglePoints.map(
      (point) => this.projectedTransformer.transformToGeo(point as Point)
    )

    if (currentIsNew || !this.projectedGeoCurrentTrianglePoints.length) {
      this.projectedGeoCurrentTrianglePoints =
        this.projectedGeoNewTrianglePoints
    }
  }

  /**
   * Reset the current points of the triangulated resource mask in projectedGeo coordinates.
   */
  resetCurrentTrianglePoints() {
    this.projectedGeoCurrentTrianglePoints = this.projectedGeoNewTrianglePoints
  }

  /**
   * Clear the cache of the resource triangle points per bestScaleFactor
   */
  clearResourceTrianglesByBestScaleFactor() {
    this.resourceTrianglesByBestScaleFactor = new Map()
  }

  /**
   * Mix the current and new points of the triangulated resource mask in projectedGeo coordinates
   *
   * @param {number} t
   */
  mixProjectedGeoCurrentAndNewTrianglePoints(t: number) {
    this.projectedGeoCurrentTrianglePoints =
      this.projectedGeoNewTrianglePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoCurrentTrianglePoints[index],
          t
        )
      })
  }

  /**
   * Check if warpedMap has image info
   *
   * @returns {this is WarpedMapWithImageInfo}
   */
  hasImageInfo(): this is WarpedMapWithImageInfo {
    return this.imageId !== undefined && this.parsedImage !== undefined
  }

  /**
   * Fetch and parse the image info, and generate the image ID
   *
   * @async
   * @returns {Promise<void>}
   */
  async loadImageInfo(): Promise<void> {
    this.loadingImageInfo = true
    const imageUri = this.georeferencedMap.resource.id
    const imageInfoJson = await fetchImageInfo(imageUri, {
      cache: this.imageInfoCache
    })
    this.parsedImage = IIIFImage.parse(imageInfoJson)
    this.imageId = await generateId(imageUri)
    this.loadingImageInfo = false

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  dispose() {
    this.resourceTriangles = []
    this.resourceTrianglePoints = []
    this.projectedGeoCurrentTrianglePoints = []
    this.projectedGeoNewTrianglePoints = []
  }

  private updateTransformerProperties(useCache = true): void {
    this.updateTransformer(useCache)
    this.updateProjectedTransformer(useCache)
    this.updateGeoMask()
    this.updateFullGeoMask()
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  private updateTransformer(useCache = true): void {
    if (
      this.transformerByTransformationType.has(this.transformationType) &&
      useCache
    ) {
      this.transformer = this.transformerByTransformationType.get(
        this.transformationType
      ) as GcpTransformer
    } else {
      this.transformer = new GcpTransformer(
        this.gcps,
        this.transformationType,
        TRANSFORMER_OPTIONS
      )
      this.transformerByTransformationType.set(
        this.transformationType,
        this.transformer
      )
    }
  }

  private updateProjectedTransformer(useCache = true): void {
    if (
      this.projectedTransformerByTransformationType.has(
        this.transformationType
      ) &&
      useCache
    ) {
      this.projectedTransformer =
        this.projectedTransformerByTransformationType.get(
          this.transformationType
        ) as GcpTransformer
    } else {
      this.projectedTransformer = new GcpTransformer(
        this.projectedGcps,
        this.transformationType,
        PROJECTED_TRANSFORMER_OPTIONS
      )
      this.projectedTransformerByTransformationType.set(
        this.transformationType,
        this.projectedTransformer
      )
    }
  }

  private updateGeoMask(): void {
    this.geoMask = this.transformer.transformForwardAsGeojson([
      this.resourceMask
    ])
    this.geoMaskBbox = computeBbox(this.geoMask)
  }

  private updateFullGeoMask(): void {
    this.geoFullMask = this.transformer.transformForwardAsGeojson([
      this.resourceFullMask
    ])
    this.geoFullMaskBbox = computeBbox(this.geoFullMask)
  }

  private updateProjectedGeoMask(): void {
    this.projectedGeoMask = this.projectedTransformer.transformForward([
      this.resourceMask
    ])[0]
    this.projectedGeoMaskBbox = computeBbox(this.projectedGeoMask)
  }

  private updateProjectedFullGeoMask(): void {
    this.projectedGeoFullMask = this.projectedTransformer.transformForward([
      this.resourceFullMask
    ])[0]
    this.projectedGeoFullMaskBbox = computeBbox(this.projectedGeoFullMask)
  }

  private updateResourceToProjectedGeoScale(): void {
    this.resourceToProjectedGeoScale = bboxesToScale(
      this.resourceMaskBbox,
      this.projectedGeoMaskBbox
    )
  }
}

/**
 * Class for warped maps with image ID and parsed IIIF image.
 *
 * @export
 * @class WarpedMapWithImageInfo
 * @typedef {WarpedMapWithImageInfo}
 * @extends {WarpedMap}
 */
export class WarpedMapWithImageInfo extends WarpedMap {
  imageId!: string
  parsedImage!: IIIFImage
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    imageInfoCache?: Cache,
    visible = true
  ) {
    super(mapId, georeferencedMap, imageInfoCache, visible)
  }
}
