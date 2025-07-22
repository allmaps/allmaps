import { cloneDeep } from 'lodash-es'

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
  mixLineStrings,
  sizeToRectangle,
  mergeOptionsUnlessUndefined,
  objectDifference,
  omit
} from '@allmaps/stdlib'

import { applyHomogeneousTransform } from '../shared/homogeneous-transform.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type {
  Gcp,
  Point,
  Ring,
  Rectangle,
  Bbox,
  TileZoomLevel
} from '@allmaps/types'
import type {
  Helmert,
  TransformationType,
  DistortionMeasure
} from '@allmaps/transform'

import type { SetOptionsOptions, WarpedMapOptions } from '../shared/types.js'
import type { Viewport } from '../viewport/Viewport.js'
import type { FetchableTile } from '../tilecache/FetchableTile.js'

export const DEFAULT_WARPED_MAP_OPTIONS = {
  gcps: [],
  resourceMask: [],
  transformationType: 'polynomial' as TransformationType,
  internalProjection: webMercatorProjection,
  projection: webMercatorProjection,
  visible: true,
  applyMask: true,
  distortionMeasure: undefined
}

const DEFAULT_SPECIFIC_PROJECTED_GCP_TRANSFORMER_OPTIONS = {
  minOffsetRatio: 0.01,
  minOffsetDistance: 4,
  maxDepth: 5,
  differentHandedness: true
}
const DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS = {
  ...DEFAULT_WARPED_MAP_OPTIONS,
  ...DEFAULT_SPECIFIC_PROJECTED_GCP_TRANSFORMER_OPTIONS
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
 * @param resourceFullMask - Resource full mask (describing the entire extent of the image)
 * @param resourceFullMaskBbox - Bbox of the resource full mask
 * @param resourceFullMaskRectangle - Rectangle of the resource full mask bbox
 * @param resourceAppliableMask - Resource appliable mask. In case 'applyMask' is true, the resourceMask and the resourceAppliableMask are the same. In case 'applyMask' is false, the resourceMask is set to the resourceFullMask, but first a copy of the resourceMask is kept as the resourceAppliableMask.
 * @param resourceAppliableMaskBbox - Bbox of the resourceAppliableMask
 * @param resourceAppliableMaskRectangle - Rectangle of the resourceAppliableMaskBbox
 * @param resourceMask - Resource mask
 * @param resourceMaskBbox - Bbox of the resourceMask
 * @param resourceMaskRectangle - Rectangle of the resourceMaskBbox
 * @param previousTransformationType - Previous transformation type
 * @param transformationType - Transformation type used in the transfomer. This is loaded from the georeference annotation.
 * @param previousInternalProjection - Previous internal projection
 * @param internalProjection - Internal projection used in the projected transformer
 * @param projection - Projection of the projected geospatial coordinates space
 * @param projectedPreviousTransformer - Previous transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param projectedTransformer - Transformer used for warping this map from resource coordinates to projected geospatial coordinates
 * @param projectedTransformerByTransformationType - A Map of projected transformers by transformationType
 * @param geoFullMask - resourceAppliableMask in geospatial coordinates
 * @param geoFullMaskBbox - Bbox of the geoFullMask
 * @param geoFullMaskRectangle - resourceFullMaskRectangle in geospatial coordinates
 * @param geoAppliableMask - resourceAppliableMask in geospatial coordinates
 * @param geoAppliableMaskBbox - Bbox of the geoFullMask
 * @param geoAppliableMaskRectangle - resourceAppliableMaskRectangle in geospatial coordinates
 * @param geoMask - resourceMask in geospatial coordinates
 * @param geoMaskBbox - Bbox of the geoMask
 * @param geoMaskRectangle - resourceMaskRectangle in geospatial coordinates
 * @param projectedGeoFullMask - resourceFullMask in projected geospatial coordinates
 * @param projectedGeoFullMaskBbox - Bbox of the projectedGeoFullMask
 * @param projectedGeoFullMaskRectangle - resourceFullMaskRectangle in projected geospatial coordinates
 * @param projectedGeoAppliableMask - resourceAppliableMask in projected geospatial coordinates
 * @param projectedGeoAppliableMaskBbox - Bbox of the projectedGeoAppliableMask
 * @param projectedGeoAppliableMaskRectangle - resourceAppliableMaskRectangle in projected geospatial coordinates
 * @param projectedGeoMask - resourceMask in projected geospatial coordinates
 * @param projectedGeoMaskBbox - Bbox of the projectedGeoMask
 * @param projectedGeoMaskRectangle - resourceMaskRectanglee in projected geospatial coordinates
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

  defaultOptions!: WarpedMapOptions
  georeferencedMapOptions?: Partial<WarpedMapOptions>
  listOptions?: Partial<WarpedMapOptions>
  options?: Partial<WarpedMapOptions>
  mergedOptions!: WarpedMapOptions

  imageInfo?: unknown
  parsedImage?: Image
  loadingImageInfo: boolean

  protected abortController?: AbortController

  mixed = false

  gcps!: Gcp[]
  projectedGcps!: Gcp[]
  resourcePoints!: Point[]
  geoPoints!: Point[]
  projectedGeoPoints!: Point[]
  projectedGeoPreviousTransformedResourcePoints!: Point[]
  projectedGeoTransformedResourcePoints!: Point[]

  resourceFullMask!: Ring
  resourceFullMaskBbox!: Bbox
  resourceFullMaskRectangle!: Rectangle
  resourceAppliableMask!: Ring
  resourceAppliableMaskBbox!: Bbox
  resourceAppliableMaskRectangle!: Rectangle
  resourceMask!: Ring
  resourceMaskBbox!: Bbox
  resourceMaskRectangle!: Rectangle

  previousTransformationType!: TransformationType
  transformationType!: TransformationType

  previousInternalProjection!: Projection
  internalProjection!: Projection
  projection!: Projection

  projectedPreviousTransformer!: ProjectedGcpTransformer
  projectedTransformer!: ProjectedGcpTransformer
  protected projectedTransformerCache: Map<
    TransformationType,
    ProjectedGcpTransformer
  >

  geoFullMask!: Ring
  geoFullMaskBbox!: Bbox
  geoFullMaskRectangle!: Rectangle
  geoAppliableMask!: Ring
  geoAppliableMaskBbox!: Bbox
  geoAppliableMaskRectangle!: Rectangle
  geoMask!: Ring
  geoMaskBbox!: Bbox
  geoMaskRectangle!: Rectangle

  projectedGeoFullMask!: Ring
  projectedGeoFullMaskBbox!: Bbox
  projectedGeoFullMaskRectangle!: Rectangle
  projectedGeoAppliableMask!: Ring
  projectedGeoAppliableMaskBbox!: Bbox
  projectedGeoAppliableMaskRectangle!: Rectangle
  projectedGeoMask!: Ring
  projectedGeoMaskBbox!: Bbox
  projectedGeoMaskRectangle!: Rectangle

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

    // Note: defaults are overwritten by georeferenced map input (only if they are defined),
    // which is overwritten by list options and options
    // This way a warped map list's current transformation and projection,
    // passed as option, can overwrite those of the georeferenced map (i.e. annotation)

    this.mapId = mapId
    this.georeferencedMap = georeferencedMap

    this.projectedTransformerCache = new Map()
    this.loadingImageInfo = false

    this.listOptions = options
    this.georeferencedMapOptions = {
      transformationType: georeferencedMap.transformation
        ?.type as TransformationType,
      internalProjection: georeferencedMap.resourceCrs as Projection,
      gcps: georeferencedMap.gcps,
      resourceMask: georeferencedMap.resourceMask
    }
    this.setDefaultOptions()
    this.setMergedOptions({ init: true })
  }

  /**
   * Get default options
   */
  static getDefaultOptions(): WarpedMapOptions {
    return DEFAULT_WARPED_MAP_OPTIONS
  }

  /**
   * Get default and georeferenced map options
   */
  getDefaultAndGeoreferencedMapOptions(): WarpedMapOptions {
    return mergeOptionsUnlessUndefined(
      this.defaultOptions,
      this.georeferencedMapOptions
    )
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
      this.projectedGeoMaskRectangle.map((point) => {
        return applyHomogeneousTransform(
          viewport.projectedGeoToViewportHomogeneousTransform,
          point
        )
      }) as Rectangle
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
    const helmertMeasures = toProjectedGeoHelmertTransformation.getMeasures()
    return helmertMeasures.scale as number
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
    const options = mergeOptionsUnlessUndefined(
      DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS,
      {
        projection: this.projection,
        internalProjection: this.internalProjection
      },
      partialProjectedGcpTransformerOptions
    )

    const projectedTransformer = getPropertyFromCacheOrComputation(
      this.projectedTransformerCache,
      transformationType,
      () => new ProjectedGcpTransformer(this.gcps, transformationType, options)
    )
    return projectedTransformer.setProjection(options.projection)
  }

  setOptions(
    options?: Partial<WarpedMapOptions>,
    listOptions?: Partial<WarpedMapOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): object {
    if (options !== undefined && Object.keys(options).length > 0) {
      this.options = options
    }
    if (listOptions !== undefined && Object.keys(listOptions).length > 0) {
      this.listOptions = listOptions
    }
    return this.setMergedOptions(setOptionsOptions)
  }

  setListOptions(
    listOptions?: Partial<WarpedMapOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): object {
    return this.setOptions(undefined, listOptions, setOptionsOptions)
  }

  setDefaultOptions() {
    this.defaultOptions = WarpedMap.getDefaultOptions()
  }

  setMergedOptions(setOptionsOptions?: Partial<SetOptionsOptions>): object {
    const previousMergedOptions = cloneDeep(this.mergedOptions || {})

    this.mergedOptions = mergeOptionsUnlessUndefined(
      this.defaultOptions,
      this.georeferencedMapOptions,
      this.listOptions,
      this.options
    )

    let changedMergedOptions = objectDifference(
      this.mergedOptions,
      previousMergedOptions
    )

    if (setOptionsOptions?.optionKeysToOmit) {
      // If some options should be omitted from changing,
      // like when setting all options exect those that should be animated,
      // then omit those options and set the merged options accordingly
      changedMergedOptions = omit(
        changedMergedOptions,
        setOptionsOptions?.optionKeysToOmit
      )
      this.mergedOptions = mergeOptionsUnlessUndefined(
        previousMergedOptions,
        changedMergedOptions
      )
    }

    if (setOptionsOptions?.init) {
      // On init we should set the properties in a specific order
      // and update the projected transformer properties only once at the end

      this.gcps = this.mergedOptions.gcps

      this.resourceFullMask = this.getResourceFullMask()
      this.resourceAppliableMask = this.georeferencedMap.resourceMask
      this.resourceMask = this.mergedOptions.applyMask
        ? this.resourceAppliableMask
        : this.resourceFullMask
      this.updateResourceMaskProperties()

      this.transformationType = this.mergedOptions.transformationType
      this.previousTransformationType = this.transformationType

      this.internalProjection = this.mergedOptions.internalProjection
      this.previousInternalProjection = this.internalProjection
      this.projection = this.mergedOptions.projection

      this.updateProjectedTransformerProperties()
    } else {
      if ('gcps' in changedMergedOptions) {
        this.setGcps(this.mergedOptions.gcps)
      }

      if (
        'resourceMask' in changedMergedOptions ||
        'applyMask' in changedMergedOptions
      ) {
        const resourceFullMask = this.getResourceFullMask()
        const resourceAppliableMask = this.mergedOptions.resourceMask
        const resourceMask = this.mergedOptions.applyMask
          ? resourceAppliableMask
          : resourceFullMask
        this.setResourceMask(
          resourceFullMask,
          resourceAppliableMask,
          resourceMask
        )
      }

      if ('transformationType' in changedMergedOptions) {
        this.setTransformationType(this.mergedOptions.transformationType)
      }

      if ('internalProjection' in changedMergedOptions) {
        this.setInternalProjection(this.mergedOptions.internalProjection)
      }

      if ('projection' in changedMergedOptions) {
        this.setProjection(this.mergedOptions.projection)
      }

      if ('distortionMeasure' in changedMergedOptions) {
        this.setDistortionMeasure(this.mergedOptions.distortionMeasure)
      }
    }

    return changedMergedOptions
  }

  /**
   * Update the ground control points loaded from a georeferenced map to new ground control points.
   *
   * @param gcps
   */
  protected setGcps(gcps: Gcp[]): void {
    this.gcps = gcps
    this.clearProjectedTransformerCaches()
    this.updateProjectedTransformerProperties()
  }

  /**
   * Update the resource mask loaded from a georeferenced map to a new mask.
   *
   * @param resourceMask
   */
  protected setResourceMask(
    resourceFullMask: Ring,
    resourceAppliableMask: Ring,
    resourceMask: Ring
  ): void {
    this.resourceFullMask = resourceFullMask
    this.resourceAppliableMask = resourceAppliableMask
    this.resourceMask = resourceMask
    this.updateResourceMaskProperties()
    this.updateGeoMaskProperties()
    this.updateProjectedGeoMaskProperties()
  }

  /**
   * Set the transformationType
   *
   * @param transformationType
   */
  protected setTransformationType(
    transformationType: TransformationType
  ): void {
    this.transformationType = transformationType
    if (!this.previousTransformationType) {
      this.previousTransformationType = this.transformationType
    }
    this.updateProjectedTransformerProperties()
  }

  /**
   * Set the distortionMeasure
   *
   * @param distortionMeasure - the disortion measure
   */
  protected setDistortionMeasure(distortionMeasure?: DistortionMeasure): void {
    this.distortionMeasure = distortionMeasure
  }

  /**
   * Set the internal projection
   *
   * @param projection - the internal projection
   */
  protected setInternalProjection(projection?: Projection): void {
    this.internalProjection =
      projection ||
      DEFAULT_PROJECTED_GCP_TRANSFORMER_OPTIONS.internalProjection ||
      webMercatorProjection
    if (!this.previousInternalProjection) {
      this.previousInternalProjection = this.internalProjection
    }
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
  protected setProjection(projection?: Projection): void {
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
    this.projectedPreviousTransformer = cloneDeep(this.projectedTransformer)
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
    this.projectedPreviousTransformer = cloneDeep(this.projectedTransformer)
    this.projectedGeoPreviousTransformedResourcePoints = mixLineStrings(
      this.projectedGeoTransformedResourcePoints,
      this.projectedGeoPreviousTransformedResourcePoints,
      t
    )
  }

  /**
   * Check if this instance has image info
   *
   * @returns
   */
  hasImageInfo(): this is WarpedMapWithImageInfo {
    return (
      (this.imageInfo !== undefined ||
        this.mergedOptions.imageInfoByMapId?.has(this.mapId)) ??
      false
    )
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

      if (this.mergedOptions.imageInfoByMapId?.get(imageUri)) {
        imageInfo = this.mergedOptions.imageInfoByMapId.get(imageUri)
      } else {
        this.abortController = new AbortController()
        const signal = this.abortController.signal
        imageInfo = await fetchImageInfo(
          imageUri,
          { signal },
          this.mergedOptions.fetchFn
        )
        this.abortController = undefined

        this.mergedOptions.imageInfoByMapId?.set(imageUri, imageInfo)
      }

      this.imageInfo = imageInfo
      this.parsedImage = Image.parse(this.imageInfo)

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    } catch (err) {
      this.loadingImageInfo = false
      throw err
    } finally {
      this.loadingImageInfo = false
    }
  }

  private updateResourceMaskProperties() {
    this.resourceFullMaskBbox = computeBbox(this.resourceFullMask)
    this.resourceFullMaskRectangle = bboxToRectangle(this.resourceFullMaskBbox)
    this.resourceAppliableMaskBbox = computeBbox(this.resourceAppliableMask)
    this.resourceAppliableMaskRectangle = bboxToRectangle(
      this.resourceAppliableMaskBbox
    )
    this.resourceMaskBbox = computeBbox(this.resourceMask)
    this.resourceMaskRectangle = bboxToRectangle(this.resourceMaskBbox)
  }

  private getResourceFullMask() {
    const resourceWidth = this.georeferencedMap.resource.width
    const resourceHeight = this.georeferencedMap.resource.height

    // If width and height are not set on georeferenced map
    // get full mask from resource mask, which is sure to be set
    if (resourceWidth && resourceHeight) {
      return sizeToRectangle([resourceWidth, resourceHeight])
    } else {
      return bboxToRectangle(this.resourceMaskBbox)
    }
  }

  private updateGeoMaskProperties() {
    this.updateFullGeoMask()
    this.updateAppliableGeoMask()
    this.updateGeoMask()
  }

  private updateProjectedGeoMaskProperties() {
    this.updateProjectedFullGeoMask()
    this.updateProjectedAppliableGeoMask()
    this.updateProjectedGeoMask()
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

  private updateAppliableGeoMask(): void {
    this.geoAppliableMask = this.projectedTransformer.transformToGeo(
      [this.resourceAppliableMask],
      { projection: lonLatProjection }
    )[0]
    this.geoAppliableMaskBbox = computeBbox(this.geoAppliableMask)
    this.geoAppliableMaskRectangle = this.projectedTransformer.transformToGeo(
      [this.resourceAppliableMaskRectangle],
      { maxDepth: 0, projection: lonLatProjection }
    )[0] as Rectangle
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

  private updateProjectedAppliableGeoMask(): void {
    this.projectedGeoAppliableMask = this.projectedTransformer.transformToGeo([
      this.resourceAppliableMask
    ])[0]
    this.projectedGeoAppliableMaskBbox = computeBbox(
      this.projectedGeoAppliableMask
    )
    this.projectedGeoAppliableMaskRectangle =
      this.projectedTransformer.transformToGeo(
        [this.resourceAppliableMaskRectangle],
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
