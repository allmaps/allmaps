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
  mixPoints
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
 * @param {Point[]} resourceTrianglePoints - Points of the triangulated resourceMask, at the current best scale factor
 * @private {Map<number, Point[]>} resourceTrianglePointsByBestScaleFactor - Cache of the resource triangle points per bestScaleFactor
 * @param {Point[]} projectedGeoCurrentTrianglePoints - Current points of the triangulated resource mask in projectedGeo coordinates, at the current best scale factor
 * @param {Point[]} projectedGeoNewTrianglePoints - New (during transformation transition) points of the triangulated resource mask in projectedGeo coordinates, at the current best scale factor
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

  visible: boolean

  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedTransformer!: GcpTransformer

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

  resourceTrianglePoints: Point[] = []
  private resourceTrianglePointsByBestScaleFactor: Map<number, Point[]> =
    new Map()
  projectedGeoCurrentTrianglePoints: Point[] = []
  projectedGeoNewTrianglePoints: Point[] = []
  // TODO: consider to add a similar cache for projectedGeo to speed up computations with a double map:
  // projectedGeoTrianglePointsByTransformationTypeByBestScaleFactor

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
    this.updateTransformerProperties()
  }

  /**
   * Update the best scale factor at the current viewport
   *
   * @param {number} scaleFactor
   * @returns {boolean}
   */
  updateBestScaleFactor(scaleFactor: number): void {
    if (this.bestScaleFactor != scaleFactor) {
      this.bestScaleFactor = scaleFactor
      this.updateTriangulation(true)
    }
  }

  /**
   * Update the triangulation of the resource mask. Computes the points of the triangulated resourceMask, at the current best scale factor
   *
   * @param {boolean} [currentIsNew=false] - whether the new and current triangulation are the same - true by default, false during a transformation transition
   */
  updateTriangulation(currentIsNew = false) {
    if (
      this.resourceTrianglePointsByBestScaleFactor.has(this.bestScaleFactor)
    ) {
      this.resourceTrianglePoints =
        this.resourceTrianglePointsByBestScaleFactor.get(
          this.bestScaleFactor
        ) as Point[]
    } else {
      const diameter =
        (geometryToDiameter(this.resourceMask) * this.bestScaleFactor) /
        DIAMETER_FRACTION

      this.resourceTrianglePoints = triangulate(
        this.resourceMask,
        diameter
      ).flat()

      this.resourceTrianglePointsByBestScaleFactor.set(
        this.bestScaleFactor,
        this.resourceTrianglePoints
      )
    }

    this.updateProjectedGeoTrianglePoints(currentIsNew)
  }

  /**
   * Update the (current and new) points of the triangulated resource mask in projectedGeo coordinates, at the current best scale factor
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
  clearResourceTrianglePointsByBestScaleFactor() {
    this.resourceTrianglePointsByBestScaleFactor = new Map()
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
    const imageUri = this.georeferencedMap.resource.id
    const imageInfoJson = await fetchImageInfo(imageUri, {
      cache: this.imageInfoCache
    })
    this.parsedImage = IIIFImage.parse(imageInfoJson)
    this.imageId = await generateId(imageUri)

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  dispose() {
    this.resourceTrianglePoints = []
    this.projectedGeoCurrentTrianglePoints = []
    this.projectedGeoNewTrianglePoints = []
  }

  private updateTransformerProperties(): void {
    this.updateTransformer()
    this.updateProjectedTransformer()
    this.updateGeoMask()
    this.updateFullGeoMask()
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  private updateTransformer(): void {
    this.transformer = new GcpTransformer(
      this.gcps,
      this.transformationType,
      TRANSFORMER_OPTIONS
    )
  }

  private updateProjectedTransformer(): void {
    this.projectedTransformer = new GcpTransformer(
      this.projectedGcps,
      this.transformationType,
      PROJECTED_TRANSFORMER_OPTIONS
    )
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
