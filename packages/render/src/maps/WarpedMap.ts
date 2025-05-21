import { GeoreferencedMap } from '@allmaps/annotation'
import { Image } from '@allmaps/iiif-parser'
import {
  ProjectedGcpTransformer,
  ProjectedGcpTransformerOptions,
  Projection,
  lonLatProjection,
  webMercatorProjection
} from '@allmaps/project'
import {
  computeBbox,
  bboxToRectangle,
  rectanglesToScale,
  fetchImageInfo,
  getPropertyFromCacheOrComputation,
  mixPoints,
  sizeToRectangle,
  mergePartialOptions,
  mergeOptionsUnlessUndefined,
  mergeOptions
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
  DistortionMeasure
} from '@allmaps/transform'

import type { Viewport } from '../viewport/Viewport.js'
import type { FetchableTile } from '../tilecache/FetchableTile.js'

// TODO: consider to make the default options more precise
const DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS = {
  minOffsetRatio: 0.01,
  minOffsetDistance: 4,
  maxDepth: 5,
  differentHandedness: true
} as Partial<ProjectedGcpTransformerOptions>

const DEFAULT_WARPED_MAP_OPTIONS = {
  visible: true,
  applyMask: true,
  transformationType: 'polynomial' as TransformationType,
  internalProjection: webMercatorProjection,
  projection: webMercatorProjection
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
 * @param imageInformations - Image informations
 * @param parsedImage - ID of the image
 * @param visible - Whether the map is visible
 * @param applyMask - Whether to apply the mask
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
 * @param previousTransformationType - Previous transformation type
 * @param transformationType - Transformation type used in the transfomer. This is loaded from the georeference annotation.
 * @param previousInternalProjection - Previous internal projection
 * @param internalProjection - Internal projection used in the projected transformer
 * @param projection - Projection of the projected geospatial coordinates space
 * @param projectedPreviousTransformer - Previous transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param projectedTransformer - Transformer used for warping this map from resource coordinates to projected geospatial coordinates
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

  imageInformations?: ImageInformations
  parsedImage?: Image
  loadingImageInfo: boolean

  fetchFn?: FetchFn
  protected abortController?: AbortController

  visible: boolean
  applyMask: boolean
  mixed = false

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

  previousTransformationType: TransformationType
  transformationType: TransformationType

  previousInternalProjection: Projection
  internalProjection: Projection
  projection: Projection

  projectedPreviousTransformer!: ProjectedGcpTransformer
  projectedTransformer!: ProjectedGcpTransformer
  protected projectedTransformerCache: Map<
    TransformationType,
    ProjectedGcpTransformer
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
   * @param partialWarpedMapOptions - options
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    partialWarpedMapOptions?: Partial<WarpedMapOptions>
  ) {
    super()

    // Note: defaults are overwritten by georeferenced map input
    // (only if they are defined), which is overwritten by options
    // This way a warped map list's current
    // transformation and projection can overwrite those of the map

    // TODO: read internal projection and projection from georeferenced map
    const georeferencedMapInput = {
      transformationType: georeferencedMap.transformation
        ?.type as TransformationType,
      internalProjection: georeferencedMap.resourceCrs
    }

    const defaultAndMapOptions = mergeOptionsUnlessUndefined(
      DEFAULT_WARPED_MAP_OPTIONS,
      georeferencedMapInput
    )
    const warpedMapOptions = mergeOptions(
      defaultAndMapOptions,
      partialWarpedMapOptions
    )

    this.projectedTransformerCache = new Map()

    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.imageInformations = warpedMapOptions.imageInformations
    this.loadingImageInfo = false

    this.visible = warpedMapOptions.visible
    this.applyMask = warpedMapOptions.applyMask
    this.fetchFn = warpedMapOptions.fetchFn

    this.gcps = this.georeferencedMap.gcps

    this.resourceMask = this.applyMask
      ? this.georeferencedMap.resourceMask
      : this.getResourceFullMask()
    this.updateResourceMaskProperties()
    this.updateResourceFullMaskProperties()

    this.transformationType = warpedMapOptions.transformationType
    this.previousTransformationType = this.transformationType

    this.internalProjection = warpedMapOptions.internalProjection
    this.previousInternalProjection = this.internalProjection
    this.projection = warpedMapOptions.projection

    this.updateProjectedTransformerProperties()
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
    const projectedHelmertTransformer = this.getProjectedTransformer('helmert')
    const toProjectedGeoHelmertTransformation =
      projectedHelmertTransformer.getToGeoTransformation() as Helmert
    return toProjectedGeoHelmertTransformation.scale as number
  }

  /**
   * Get a projected transformer of the given transformation type.
   *
   * Uses cashed projected transformers by transformation type,
   * and only computes a new projected transformer if none found.
   *
   * Returns a projected transformer in the current projection,
   * even if the cached transformer was computed in a different projection.
   *
   * Default settings apply for the options.
   *
   * @params transformationType - the transformation type
   * @params partialProjectedGcpTransformerOptions - options
   * @params useCache - whether to use the cached projected transformers previously computed
   * @returns A projected transformer
   */
  getProjectedTransformer(
    transformationType: TransformationType,
    partialProjectedGcpTransformerOptions?: Partial<ProjectedGcpTransformerOptions>
  ): ProjectedGcpTransformer {
    partialProjectedGcpTransformerOptions = mergePartialOptions(
      {
        projection: this.projection,
        internalProjection: this.internalProjection
      },
      partialProjectedGcpTransformerOptions
    )
    partialProjectedGcpTransformerOptions = mergePartialOptions(
      DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS,
      partialProjectedGcpTransformerOptions
    )

    const projectedTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerCache,
      transformationType,
      () =>
        new ProjectedGcpTransformer(
          this.gcps,
          transformationType,
          partialProjectedGcpTransformerOptions
        )
    )
    return projectedTransformer.setProjection(this.projection)
  }

  /**
   * Update the ground control points loaded from a georeferenced map to new ground control points.
   *
   * @param gcps
   */
  setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.clearProjectedTransformerCaches()
    this.updateProjectedTransformerProperties()
    this.updateGcpsProperties()
  }

  /**
   * Update the resource mask loaded from a georeferenced map to a new mask.
   *
   * @param resourceMask
   */
  setResourceMask(resourceMask: Ring): void {
    this.applyMask = true
    this.resourceMask = resourceMask
    this.updateResourceMaskProperties()
    this.updateResourceFullMaskProperties()
    this.updateGeoMaskProperties()
    this.updateProjectedGeoMaskProperties()
  }

  /**
   * Set the transformationType
   *
   * @param transformationType
   */
  setTransformationType(transformationType: TransformationType): void {
    this.transformationType = transformationType
    this.updateProjectedTransformerProperties()
  }

  /**
   * Set the distortionMeasure
   *
   * @param distortionMeasure - the disortion measure
   */
  setDistortionMeasure(distortionMeasure?: DistortionMeasure): void {
    this.distortionMeasure = distortionMeasure
  }

  /**
   * Set the internal projection
   *
   * @param projection - the internal projection
   */
  setInternalProjection(projection?: Projection): void {
    this.internalProjection =
      projection ||
      DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS.internalProjection ||
      webMercatorProjection
    this.clearProjectedTransformerCaches()
    // Note: the following will recreate a transformer with the internal projection
    // and also assure the triangulation is updated.
    this.updateProjectedTransformerProperties()
  }

  /**
   * Set the projection
   *
   * @param projection - the projection
   */
  setProjection(projection?: Projection): void {
    this.projection =
      projection ||
      DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS.projection ||
      webMercatorProjection
    // Note: the following will reuse the existing transformer but set it's projection
    // and also assure the triangulation is updated.
    this.updateProjectedTransformerProperties()
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
   * Reset previous transform properties to new ones (when completing a transformer transitions).
   */
  resetPrevious() {
    this.mixed = false
    this.previousTransformationType = this.transformationType
    this.previousDistortionMeasure = this.distortionMeasure
    this.previousInternalProjection = this.internalProjection
    this.projectedPreviousTransformer = this.projectedTransformer.deepClone()
    this.projectedGeoPreviousTransformedResourcePoints =
      this.projectedGeoTransformedResourcePoints
  }

  /**
   * Mix previous transform properties with new ones (when changing an ongoing transformer transition).
   *
   * @param t - animation progress
   */
  mixPreviousAndNew(t: number) {
    this.mixed = true
    this.previousTransformationType = this.transformationType
    this.previousDistortionMeasure = this.distortionMeasure
    this.previousInternalProjection = this.internalProjection
    this.projectedPreviousTransformer = this.projectedTransformer.deepClone()
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

  private getResourceFullMask() {
    const resourceWidth = this.georeferencedMap.resource.width
    const resourceHeight = this.georeferencedMap.resource.height

    if (resourceWidth && resourceHeight) {
      return sizeToRectangle([resourceWidth, resourceHeight])
    } else {
      return bboxToRectangle(this.resourceMaskBbox)
    }
  }

  private updateResourceFullMaskProperties() {
    this.resourceFullMask = this.getResourceFullMask()

    this.resourceFullMaskBbox = computeBbox(this.resourceFullMask)
    this.resourceFullMaskRectangle = bboxToRectangle(this.resourceFullMaskBbox)
  }

  private updateGeoMaskProperties() {
    this.updateGeoMask()
    this.updateFullGeoMask()
  }

  private updateProjectedGeoMaskProperties() {
    this.updateProjectedGeoMask()
    this.updateProjectedFullGeoMask()
    this.updateResourceToProjectedGeoScale()
  }

  protected updateProjectedTransformerProperties(): void {
    this.updateProjectedTransformer()

    this.updateGeoMaskProperties()
    this.updateProjectedGeoMaskProperties()
    this.updateGcpsProperties()
  }

  private updateProjectedTransformer(): void {
    this.projectedTransformer = this.getProjectedTransformer(
      this.transformationType
    )
    if (!this.projectedPreviousTransformer) {
      this.projectedPreviousTransformer = this.projectedTransformer
    }
  }

  private updateGeoMask(): void {
    this.geoMask = this.projectedTransformer.transformToGeo(
      [this.resourceMask],
      { projection: lonLatProjection }
    )[0]
    this.geoMaskBbox = computeBbox(this.geoMask)
    this.geoMaskRectangle = this.projectedTransformer.transformToGeo(
      [this.resourceMaskRectangle],
      { maxDepth: 0, projection: lonLatProjection }
    )[0] as Rectangle
  }

  private updateFullGeoMask(): void {
    this.geoFullMask = this.projectedTransformer.transformToGeo(
      [this.resourceFullMask],
      { projection: lonLatProjection }
    )[0]
    this.geoFullMaskBbox = computeBbox(this.geoFullMask)
    this.geoFullMaskRectangle = this.projectedTransformer.transformToGeo(
      [this.resourceFullMaskRectangle],
      { maxDepth: 0, projection: lonLatProjection }
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

  private updateGcpsProperties() {
    this.projectedGcps = this.gcps.map(({ resource, geo }) => ({
      resource,
      geo: this.projectedTransformer.lonLatToProjection(geo)
    }))
    this.resourcePoints = this.gcps.map((gcp) => gcp.resource)
    this.geoPoints = this.gcps.map((gcp) => gcp.geo)
    this.projectedGeoPoints = this.projectedGcps.map(
      (projectedGcp) => projectedGcp.geo
    )

    this.projectedGeoTransformedResourcePoints = this.gcps.map((projectedGcp) =>
      this.projectedTransformer.transformToGeo(projectedGcp.resource)
    )

    if (!this.projectedGeoPreviousTransformedResourcePoints) {
      this.projectedGeoPreviousTransformedResourcePoints =
        this.projectedGeoTransformedResourcePoints
    }
  }

  protected clearProjectedTransformerCaches() {
    this.projectedTransformerCache = new Map()
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
