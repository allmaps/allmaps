import { GeoreferencedMap } from '@allmaps/annotation'
import { Image } from '@allmaps/iiif-parser'
import { GcpTransformer } from '@allmaps/transform'
import {
  computeBbox,
  bboxToRectangle,
  rectanglesToScale,
  fetchImageInfo,
  lonLatToWebMecator,
  getPropertyFromCacheOrComputation,
  mixPoints,
  sizeToRectangle
} from '@allmaps/stdlib'

import { applyTransform } from '../shared/matrix.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { WarpedMapOptions } from '../shared/types.js'

import type {
  Gcp,
  Point,
  Ring,
  Rectangle,
  Bbox,
  FetchFn,
  ImageInformations,
  TileZoomLevel
} from '@allmaps/types'
import type {
  Helmert,
  TransformationType,
  TransformOptions,
  DistortionMeasure
} from '@allmaps/transform'

import type { Viewport } from '../viewport/Viewport.js'
import type { FetchableTile } from '../tilecache/FetchableTile.js'

// TODO: consider to make the default options more precise
const DEFAULT_TRANSFORMER_OPTIONS = {
  minOffsetRatio: 0.01,
  minOffsetDistance: 4,
  maxDepth: 5,
  differentHandedness: true
} as Partial<TransformOptions>

const DEFAULT_VISIBLE = true

function createDefaultWarpedMapOptions(): Partial<WarpedMapOptions> {
  return {
    visible: DEFAULT_VISIBLE
  }
}

export function createWarpedMapFactory() {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => new WarpedMap(mapId, georeferencedMap, options)
}

/**
 * Class for warped maps.
 * This class describes how a georeferenced map is warped using a specific transformation.
 *
 * @param mapId - ID of the map
 * @param georeferencedMap - Georeferenced map used to construct the WarpedMap
 * @param gcps - Ground control points used for warping this map, from resource coordinates to geospatial coordinates
 * @param projectedGcps - Projected ground control points, from resource coordinates to projected geospatial coordinates
 * @param resourcePoints - The resource coordinates of the ground control points
 * @param geoPoints - The geospatial coordinates of the ground control points
 * @param projectedGeoPoints - The projected geospatial coordinates of the projected ground control points
 * @param projectedGeoPreviousTransformedResourcePoints - The projectedGeoTransformedResourcePoints of the previous transformation type, used during transformation transitions
 * @param projectedGeoTransformedResourcePoints - The resource coordinates of the ground control points, transformed to projected geospatial coordinates using the projected transformer
 * @param resourcePreviousMask - Resource mask of the previous transformation type
 * @param resourceMask - Resource mask
 * @param resourceMaskBbox - Bbox of the resourceMask
 * @param resourceMaskRectangle - Rectangle of the resourceMaskBbox
 * @param resourceFullMask - Resource full mask (describing the entire extent of the image)
 * @param resourceFullMaskBbox - Bbox of the resource full mask
 * @param resourceFullMaskRectangle - Rectangle of the resource full mask bbox
 * @param imageId - ID of the image
 * @param parsedImage - ID of the image
 * @param visible - Whether the map is visible
 * @param previousTransformationType - Previous transformation type
 * @param transformationType - Transformation type used in the transfomer. This is loaded from the georeference annotation.
 * @param transformer - Transformer used for warping this map from resource coordinates to geospatial coordinates
 * @param projectedPreviousTransformer - Previous transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param projectedTransformer - Transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param transformerByTransformationType - A Map of transformers by transformationType
 * @param projectedTransformerByTransformationType - A Map of projected transformers by transformationType
 * @param geoMask - resourceMask in geospatial coordinates
 * @param geoMaskBbox - Bbox of the geoMask
 * @param geoMaskRectangle - resourceMaskRectangle in geospatial coordinates
 * @param geoFullMask - resourceFullMask in geospatial coordinates
 * @param geoFullMaskBbox - Bbox of the geoFullMask
 * @param geoFullMaskRectangle - resourceFullMaskRectangle in geospatial coordinates
 * @param projectedGeoPreviousMask - The projectedGeoMask of the previous transformation type, used during transformation transitions
 * @param projectedGeoMask - resourceMask in projected geospatial coordinates
 * @param projectedGeoMaskBbox - Bbox of the projectedGeoMask
 * @param projectedGeoMaskRectangle - resourceMaskRectanglee in projected geospatial coordinates
 * @param projectedGeoFullMask - resourceFullMask in projected geospatial coordinates
 * @param projectedGeoFullMaskBbox - Bbox of the projectedGeoFullMask
 * @param projectedGeoFullMaskRectangle - resourceFullMaskRectangle in projected geospatial coordinates
 * @param resourceToProjectedGeoScale - Scale of the warped map, in resource pixels per projected geospatial coordinates
 * @param previousDistortionMeasure - Previous distortion measure displayed for this map
 * @param distortionMeasure - Distortion measure displayed for this map
 * @param tileZoomLevelForViewport - The tile zoom level, for the current viewport
 * @param overviewTileZoomLevelForViewport - The overview tile zoom level, for the current viewport
 * @param projectedGeoBufferedViewportRectangleForViewport - The (buffered) viewport in projected geospatial coordinates, for the current viewport
 * @param projectedGeoBufferedViewportRectangleBboxForViewport - Bbox of the projectedGeoBufferedViewportRectangle
 * @param resourceBufferedViewportRingForViewport - The (buffered) viewport transformed back to resource coordinates, for the current viewport
 * @param resourceBufferedViewportRingBboxForViewport - Bbox of the resourceViewportRing
 * @param resourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport - The intersection of the bbox of the (buffered) viewport transformed back to resource coordinates and the bbox of the resource mask, for the current viewport
 * @param fetchableTilesForViewport - The fetchable tiles for displaying this map, for the current viewport
 * @param overviewFetchableTilesForViewport - The overview fetchable tiles, for the current viewport
 */
export class WarpedMap extends EventTarget {
  mapId: string
  georeferencedMap: GeoreferencedMap

  gcps: Gcp[]
  projectedGcps!: Gcp[]
  resourcePoints!: Point[]
  geoPoints!: Point[]
  projectedGeoPoints!: Point[]
  projectedGeoPreviousTransformedResourcePoints!: Point[]
  projectedGeoTransformedResourcePoints!: Point[]

  resourceMask: Ring
  resourceMaskBbox!: Bbox
  resourceMaskRectangle!: Rectangle
  resourceFullMask!: Ring
  resourceFullMaskBbox!: Bbox
  resourceFullMaskRectangle!: Rectangle

  imageInformations?: ImageInformations
  parsedImage?: Image
  loadingImageInfo: boolean

  fetchFn?: FetchFn
  protected abortController?: AbortController

  visible: boolean
  mixed = false

  previousTransformationType: TransformationType
  transformationType: TransformationType
  transformer!: GcpTransformer
  projectedPreviousTransformer!: GcpTransformer
  projectedTransformer!: GcpTransformer
  transformerByTransformationType: Map<TransformationType, GcpTransformer>
  projectedTransformerByTransformationType: Map<
    TransformationType,
    GcpTransformer
  >

  geoMask!: Ring
  geoMaskBbox!: Bbox
  geoMaskRectangle!: Rectangle
  geoFullMask!: Ring
  geoFullMaskBbox!: Bbox
  geoFullMaskRectangle!: Rectangle

  projectedGeoMask!: Ring
  projectedGeoMaskBbox!: Bbox
  projectedGeoMaskRectangle!: Rectangle
  projectedGeoFullMask!: Ring
  projectedGeoFullMaskBbox!: Bbox
  projectedGeoFullMaskRectangle!: Rectangle

  resourceToProjectedGeoScale!: number

  previousDistortionMeasure?: DistortionMeasure
  distortionMeasure?: DistortionMeasure

  tileZoomLevelForViewport?: TileZoomLevel
  overviewTileZoomLevelForViewport?: TileZoomLevel

  projectedGeoBufferedViewportRectangleForViewport?: Rectangle
  projectedGeoBufferedViewportRectangleBboxForViewport?: Bbox

  resourceBufferedViewportRingForViewport?: Ring
  resourceBufferedViewportRingBboxForViewport?: Bbox

  resourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport?: Bbox

  fetchableTilesForViewport: FetchableTile[] = []
  overviewFetchableTilesForViewport: FetchableTile[] = []

  /**
   * Creates an instance of WarpedMap.
   *
   * @param mapId - ID of the map
   * @param georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param options - options
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) {
    super()

    options = {
      ...createDefaultWarpedMapOptions(),
      ...options
    }

    this.transformerByTransformationType = new Map()
    this.projectedTransformerByTransformationType = new Map()

    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.gcps = this.georeferencedMap.gcps
    this.updateGcpsProperties()

    this.resourceMask = this.georeferencedMap.resourceMask
    this.updateResourceMaskProperties()
    this.updateResourceFullMaskProperties()

    this.imageInformations = options.imageInformations
    this.loadingImageInfo = false

    this.visible = options.visible || DEFAULT_VISIBLE

    this.fetchFn = options.fetchFn

    this.transformationType =
      options.transformation?.type ||
      this.georeferencedMap.transformation?.type ||
      'polynomial'
    this.previousTransformationType = this.transformationType

    this.updateTransformerProperties()
  }

  /**
   * Get resourceMask in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportMask(viewport: Viewport): Ring {
    return this.projectedGeoMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get Bbox of resourceMask in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportMask(viewport))
  }

  /**
   * Get resourceMaskRectangle in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportMaskRectangle(viewport: Viewport): Rectangle {
    return this.projectedGeoMaskRectangle.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    }) as Rectangle
  }

  /**
   * Get resourceFullMask in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportFullMask(viewport: Viewport): Ring {
    return this.projectedGeoFullMask.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    })
  }

  /**
   * Get bbox of rresourceFullMask in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportFullMaskBbox(viewport: Viewport): Bbox {
    return computeBbox(this.getViewportFullMask(viewport))
  }

  /**
   * Get resourceFullMaskRectangle in viewport coordinates
   *
   * @param viewport - the current viewport
   * @returns
   */
  getViewportFullMaskRectangle(viewport: Viewport): Rectangle {
    return this.projectedGeoFullMaskRectangle.map((point) => {
      return applyTransform(viewport.projectedGeoToViewportTransform, point)
    }) as Rectangle
  }

  /**
   * Get scale of the warped map, in resource pixels per viewport pixels.
   *
   * @param viewport - the current viewport
   * @returns
   */
  getResourceToViewportScale(viewport: Viewport): number {
    return rectanglesToScale(
      this.resourceMaskRectangle,
      this.getViewportMaskRectangle(viewport)
    )
  }

  /**
   * Get scale of the warped map, in resource pixels per canvas pixels.
   *
   * @param viewport - the current viewport
   * @returns
   */
  getResourceToCanvasScale(viewport: Viewport): number {
    return this.getResourceToViewportScale(viewport) / viewport.devicePixelRatio
  }

  /**
   * Get the reference scaling from the forward transformation of the projected Helmert transformer
   *
   * @returns
   */
  getReferenceScale(): number {
    const projectedHelmertTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerByTransformationType,
      'helmert',
      () =>
        new GcpTransformer(
          this.projectedGcps,
          'helmert',
          DEFAULT_TRANSFORMER_OPTIONS
        )
    )
    const toProjectedGeoHelmertTransformation =
      projectedHelmertTransformer.getToGeoTransformation() as Helmert
    return toProjectedGeoHelmertTransformation.scale as number
  }

  /**
   * Update the Ground Controle Points loaded from a georeferenced map to new Ground Controle Points.
   *
   * @param gcps
   */
  setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.updateGcpsProperties()
    this.updateTransformerProperties(true, true)
  }

  /**
   * Update the resourceMask loaded from a georeferenced map to a new mask.
   *
   * @param resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    this.resourceMask = resourceMask
    this.updateResourceMaskProperties()
    this.updateResourceFullMaskProperties()
    this.updateGeoMask()
    this.updateProjectedGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  /**
   * Set the transformationType
   *
   * @param transformationType
   */
  setTransformationType(transformationType: TransformationType): void {
    this.transformationType = transformationType
    this.updateTransformerProperties()
  }

  /**
   * Set the distortionMeasure
   *
   * @param distortionMeasure - the disortion measure
   */
  setDistortionMeasure(distortionMeasure?: DistortionMeasure): void {
    this.distortionMeasure = distortionMeasure
    this.updateDistortionProperties()
  }

  /**
   * Set the tile zoom level for the current viewport
   *
   * @param tileZoomLevel - tile zoom level for the current viewport
   */
  setTileZoomLevelForViewport(tileZoomLevel?: TileZoomLevel) {
    this.tileZoomLevelForViewport = tileZoomLevel
  }

  /**
   * Set the overview tile zoom level for the current viewport
   *
   * @param tileZoomLevel - tile zoom level for the current viewport
   */
  setOverviewTileZoomLevelForViewport(tileZoomLevel?: TileZoomLevel) {
    this.overviewTileZoomLevelForViewport = tileZoomLevel
  }

  /**
   * Set projectedGeoBufferedViewportRectangle for the current viewport
   *
   * @param projectedGeoBufferedViewportRectangle
   */
  setProjectedGeoBufferedViewportRectangleForViewport(
    projectedGeoBufferedViewportRectangle?: Rectangle
  ) {
    this.projectedGeoBufferedViewportRectangleForViewport =
      projectedGeoBufferedViewportRectangle
    this.projectedGeoBufferedViewportRectangleBboxForViewport =
      projectedGeoBufferedViewportRectangle
        ? computeBbox(projectedGeoBufferedViewportRectangle)
        : undefined
  }

  /**
   * Set resourceBufferedViewportRing for the current viewport
   *
   * @param resourceBufferedViewportRing
   */
  setResourceBufferedViewportRingForViewport(
    resourceBufferedViewportRing?: Ring
  ) {
    this.resourceBufferedViewportRingForViewport = resourceBufferedViewportRing
    this.resourceBufferedViewportRingBboxForViewport =
      resourceBufferedViewportRing
        ? computeBbox(resourceBufferedViewportRing)
        : undefined
  }

  /**
   * Set resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection for the current viewport
   *
   * @param resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection
   */
  setResourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport(
    resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection?: Bbox
  ) {
    this.resourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport =
      resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection
  }

  /**
   * Set tiles for the current viewport
   *
   * @param fetchableTiles
   */
  setFetchableTilesForViewport(fetchableTiles: FetchableTile[]) {
    this.fetchableTilesForViewport = fetchableTiles
  }

  /**
   * Set overview tiles for the current viewport
   *
   * @param overviewFetchableTiles
   */
  setOverviewFetchableTilesForViewport(
    overviewFetchableTiles: FetchableTile[]
  ) {
    this.overviewFetchableTilesForViewport = overviewFetchableTiles
  }

  /**
   * Reset the properties for the current values
   */
  resetForViewport() {
    this.setTileZoomLevelForViewport()
    this.setOverviewTileZoomLevelForViewport()
    this.setProjectedGeoBufferedViewportRectangleForViewport()
    this.setResourceBufferedViewportRingForViewport()
    this.setFetchableTilesForViewport([])
    this.setOverviewFetchableTilesForViewport([])
  }

  /**
   * Reset the properties of the previous and new transformationType.
   */
  resetPrevious() {
    this.mixed = false
    this.previousTransformationType = this.transformationType
    this.previousDistortionMeasure = this.distortionMeasure
    this.projectedPreviousTransformer = this.projectedTransformer
    this.projectedGeoPreviousTransformedResourcePoints =
      this.projectedGeoTransformedResourcePoints
  }

  /**
   * Mix the properties of the previous and new transformationType.
   *
   * @param t
   */
  mixPreviousAndNew(t: number) {
    this.mixed = true
    this.previousTransformationType = this.transformationType
    this.previousDistortionMeasure = this.distortionMeasure
    this.projectedPreviousTransformer = this.projectedTransformer
    this.projectedGeoPreviousTransformedResourcePoints =
      this.projectedGeoTransformedResourcePoints.map((point, index) => {
        return mixPoints(
          point,
          this.projectedGeoPreviousTransformedResourcePoints[index],
          t
        )
      })
  }

  /**
   * Check if this instance has image info
   *
   * @returns
   */
  hasImageInfo(): this is WarpedMapWithImageInfo {
    return this.parsedImage !== undefined
  }

  /**
   * Fetch and parse the image info, and generate the image ID
   *
   * @returns
   */
  async loadImageInfo(): Promise<void> {
    try {
      this.loadingImageInfo = true
      const imageUri = this.georeferencedMap.resource.id

      let imageInfo

      if (this.imageInformations?.get(imageUri)) {
        imageInfo = this.imageInformations.get(imageUri)
      } else {
        this.abortController = new AbortController()
        const signal = this.abortController.signal
        imageInfo = await fetchImageInfo(imageUri, { signal }, this.fetchFn)
        this.abortController = undefined

        this.imageInformations?.set(imageUri, imageInfo)
      }

      this.parsedImage = Image.parse(imageInfo)

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    } catch (err) {
      this.loadingImageInfo = false
      throw err
    } finally {
      this.loadingImageInfo = false
    }
  }

  private updateResourceMaskProperties() {
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceMaskRectangle = bboxToRectangle(this.resourceMaskBbox)
  }

  private updateResourceFullMaskProperties() {
    const resourceWidth = this.georeferencedMap.resource.width
    const resourceHeight = this.georeferencedMap.resource.height

    if (resourceWidth && resourceHeight) {
      this.resourceFullMask = sizeToRectangle([resourceWidth, resourceHeight])
    } else {
      this.resourceFullMask = bboxToRectangle(this.resourceMaskBbox)
    }

    this.resourceFullMaskBbox = computeBbox(this.resourceFullMask)
    this.resourceFullMaskRectangle = bboxToRectangle(this.resourceFullMaskBbox)
  }

  private updateGcpsProperties() {
    this.projectedGcps = this.gcps.map(({ resource, geo }) => ({
      resource,
      geo: lonLatToWebMecator(geo)
    }))
    this.resourcePoints = this.gcps.map((gcp) => gcp.resource)
    this.geoPoints = this.gcps.map((gcp) => gcp.geo)
    this.projectedGeoPoints = this.projectedGcps.map(
      (projectedGcp) => projectedGcp.geo
    )
  }

  protected updateTransformerProperties(
    clearCache = false,
    useCache = true
  ): void {
    this.updateTransformer(clearCache, useCache)
    this.updateProjectedTransformer(clearCache, useCache)
    this.updateProjectedGeoTransformedResourcePoints()
    this.updateGeoMask()
    this.updateFullGeoMask()
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  private updateTransformer(clearCache = false, useCache = true): void {
    if (clearCache) {
      this.clearTransformerCaches()
    }
    this.transformer = getPropertyFromCacheOrComputation(
      this.transformerByTransformationType,
      this.transformationType,
      () =>
        new GcpTransformer(
          this.gcps,
          this.transformationType,
          DEFAULT_TRANSFORMER_OPTIONS
        ),
      () => useCache
    )
  }

  private updateProjectedTransformer(
    clearCache = false,
    useCache = true
  ): void {
    if (clearCache) {
      this.clearProjectedTransformerCaches()
    }
    this.projectedTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerByTransformationType,
      this.transformationType,
      () =>
        new GcpTransformer(
          this.projectedGcps,
          this.transformationType,
          DEFAULT_TRANSFORMER_OPTIONS
        ),
      () => useCache
    )
    if (!this.projectedPreviousTransformer) {
      this.projectedPreviousTransformer = this.projectedTransformer
    }
  }

  private updateProjectedGeoTransformedResourcePoints(): void {
    this.projectedGeoTransformedResourcePoints = this.gcps.map((projectedGcp) =>
      this.projectedTransformer.transformToGeo(projectedGcp.resource)
    )

    if (!this.projectedGeoPreviousTransformedResourcePoints) {
      this.projectedGeoPreviousTransformedResourcePoints =
        this.projectedGeoTransformedResourcePoints
    }
  }

  private updateGeoMask(): void {
    this.geoMask = this.transformer.transformToGeo([this.resourceMask])[0]
    this.geoMaskBbox = computeBbox(this.geoMask)
    this.geoMaskRectangle = this.transformer.transformToGeo(
      [this.resourceMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle
  }

  private updateFullGeoMask(): void {
    this.geoFullMask = this.transformer.transformToGeo([
      this.resourceFullMask
    ])[0]
    this.geoFullMaskBbox = computeBbox(this.geoFullMask)
    this.geoFullMaskRectangle = this.transformer.transformToGeo(
      [this.resourceFullMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle
  }

  private updateProjectedGeoMask(): void {
    this.projectedGeoMask = this.projectedTransformer.transformToGeo([
      this.resourceMask
    ])[0]
    this.projectedGeoMaskBbox = computeBbox(this.projectedGeoMask)
    this.projectedGeoMaskRectangle = this.projectedTransformer.transformToGeo(
      [this.resourceMaskRectangle],
      { maxDepth: 0 }
    )[0] as Rectangle
  }

  private updateProjectedFullGeoMask(): void {
    this.projectedGeoFullMask = this.projectedTransformer.transformToGeo([
      this.resourceFullMask
    ])[0]
    this.projectedGeoFullMaskBbox = computeBbox(this.projectedGeoFullMask)
    this.projectedGeoFullMaskRectangle =
      this.projectedTransformer.transformToGeo(
        [this.resourceFullMaskRectangle],
        { maxDepth: 0 }
      )[0] as Rectangle
  }

  private updateResourceToProjectedGeoScale(): void {
    this.resourceToProjectedGeoScale = rectanglesToScale(
      this.resourceMaskRectangle,
      this.projectedGeoMaskRectangle
    )
  }

  protected updateDistortionProperties(): void {
    // This function is used by classes that extent WarpedMap
  }

  protected clearTransformerCaches() {
    this.transformerByTransformationType = new Map()
  }

  protected clearProjectedTransformerCaches() {
    this.projectedTransformerByTransformationType = new Map()
  }

  destroy() {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}

/**
 * Class for warped maps with image ID and parsed IIIF image.
 */
export class WarpedMapWithImageInfo extends WarpedMap {
  declare imageId: string
  declare parsedImage: Image

  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)
  }
}
