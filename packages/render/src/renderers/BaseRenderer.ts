import {
  bboxToCenter,
  computeBbox,
  squaredDistance,
  intersectBboxes,
  bboxToRectangle,
  mergeOptions,
  mergePartialOptions
} from '@allmaps/stdlib'
import { isEqualProjection } from '@allmaps/project'

import { TileCache } from '../tilecache/TileCache.js'
import { WarpedMapList } from '../maps/WarpedMapList.js'
import { FetchableTile } from '../tilecache/FetchableTile.js'

import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import {
  getTileZoomLevelForScale,
  computeTilesCoveringRingAtTileZoomLevel,
  getTilesAtScaleFactor,
  getTileZoomLevelResolution,
  squaredDistanceTileToPoint,
  getTileResolution
} from '../shared/tiles.js'

import type { Size, Tile } from '@allmaps/types'

import type { Viewport } from '../viewport/Viewport.js'
import type { WarpedMap, WarpedMapWithImage } from '../maps/WarpedMap.js'
import type {
  CacheableTileFactory,
  WarpedMapFactory,
  BaseRenderOptions,
  MapPruneInfo,
  GetWarpedMapOptions,
  AnimationOptions,
  SpecificBaseRenderOptions,
  SpritesInfo,
  Sprite
} from '../shared/types.js'

// TODO: move defaults for tunable options here
const DEFAULT_BASE_RENDER_OPTIONS: SpecificBaseRenderOptions = {}

// These buffers should be in growing order
const REQUEST_VIEWPORT_BUFFER_RATIO = 0
const OVERVIEW_REQUEST_VIEWPORT_BUFFER_RATIO = 2
const PRUNE_VIEWPORT_BUFFER_RATIO = 4
const OVERVIEW_PRUNE_VIEWPORT_BUFFER_RATIO = 10

/**
 * 0 = no correction, -1 = shaper, +1 = less sharp
 * Normal has more effect on smaller scale factors
 * Log2 (i.e. per zoomlevel) has equal effect all scale factors
 */
const SCALE_FACTOR_CORRECTION = 0
const LOG2_SCALE_FACTOR_CORRECTION = 0.4

const SPRITES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = Infinity
const SPRITES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 2

const MAX_MAP_OVERVIEW_RESOLUTION = 1024 * 1024 // Support one 1024 * 1024 overview tile, e.g. for Rotterdam map.
const MAX_TOTAL_OVERVIEW_RESOLUTION_RATIO = 10
const MAX_TOTAL_MAPS_OVERVIEW = 40

const MAX_GCPS_EXACT_TPS_TO_RESOURCE = 100

/**
 * Abstract base class for renderers
 */
export abstract class BaseRenderer<W extends WarpedMap, D> extends EventTarget {
  warpedMapList: WarpedMapList<W>
  tileCache: TileCache<D>
  spritesTileCache: TileCache<D>

  mapsInPreviousViewport: Set<string> = new Set()
  mapsInViewport: Set<string> = new Set()
  mapsWithFetchableTilesForViewport: Set<string> = new Set()
  mapsWithRequestedTilesForViewport: Set<string> = new Set()
  protected viewport: Viewport | undefined

  options: Partial<BaseRenderOptions>

  constructor(
    warpedMapFactory: WarpedMapFactory<W>,
    cacheableTileFactory: CacheableTileFactory<D>,
    options?: Partial<BaseRenderOptions>
  ) {
    super()

    this.options = mergeOptions(DEFAULT_BASE_RENDER_OPTIONS, options)

    this.warpedMapList = new WarpedMapList(warpedMapFactory, options)
    this.tileCache = new TileCache(cacheableTileFactory, options)
    this.spritesTileCache = new TileCache(
      cacheableTileFactory,
      mergePartialOptions(options, { tileCacheForSprites: this.tileCache })
    )
  }

  /**
   * Parses an annotation and adds its georeferenced map to this renderer's warped map list
   *
   * @param annotation - Annotation
   * @param mapOptions - Map options
   */
  async addGeoreferenceAnnotation(
    annotation: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    return this.warpedMapList.addGeoreferenceAnnotation(annotation, mapOptions)
  }

  /**
   * Adds a georeferenced map to this renderer's warped map list
   *
   * @param georeferencedMap - Georeferenced Map
   * @param mapOptions - Map options
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    return this.warpedMapList.addGeoreferencedMap(georeferencedMap, mapOptions)
  }

  async addSprites(sprites: Sprite[], imageUrl: string, imageSize: Size) {
    const spritesInfo: SpritesInfo = { sprites, imageUrl, imageSize }
    const width = spritesInfo.imageSize[0]
    const height = spritesInfo.imageSize[1]

    const tile: Tile = {
      column: 0,
      row: 0,
      tileZoomLevel: {
        scaleFactor: 1, // Unused
        width,
        height,
        originalWidth: 0, // Unused
        originalHeight: 0, // Unused
        columns: 1,
        rows: 1
      },
      imageSize: spritesInfo.imageSize
    }

    const warpedMapsByResourceId: Map<string, WarpedMapWithImage[]> = new Map()
    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      if (!warpedMap.hasImage()) {
        await warpedMap.loadImage(this.warpedMapList.imagesById)
      }
      if (!warpedMap.hasImage()) {
        break // Make TS happy
      }
      if (!warpedMapsByResourceId.has(warpedMap.georeferencedMap.resource.id)) {
        warpedMapsByResourceId.set(warpedMap.georeferencedMap.resource.id, [])
      }
      warpedMapsByResourceId
        .get(warpedMap.georeferencedMap.resource.id)
        ?.push(warpedMap)
    }

    const promise = new Promise((resolve) => {
      this.spritesTileCache.addEventListener(
        WarpedMapEventType.MAPTILESLOADEDFROMSPRITES,
        resolve,
        { once: true }
      )
    })

    this.spritesTileCache.requestFetchableTiles([
      new FetchableTile(tile, spritesInfo.imageUrl, spritesInfo.imageUrl, {
        spritesInfo,
        warpedMapsByResourceId
      })
    ])

    return promise
  }

  /**
   * Get the default options of the renderer and list
   */
  getDefaultOptions(): BaseRenderOptions & GetWarpedMapOptions<W> {
    return mergeOptions(
      DEFAULT_BASE_RENDER_OPTIONS,
      this.warpedMapList.getDefaultOptions()
    )
  }

  /**
   * Get the default options of a map
   *
   * These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapDefaultOptions(mapId: string): GetWarpedMapOptions<W> | undefined {
    return this.warpedMapList.getMapDefaultOptions(mapId)
  }

  /**
   * Get the render and list options
   */
  getOptions(): Partial<BaseRenderOptions> {
    return mergePartialOptions(this.options, this.warpedMapList.getOptions())
  }

  /**
   * Get the map-specific options of a map
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMapOptions(mapId: string): Partial<GetWarpedMapOptions<W>> | undefined {
    return this.warpedMapList.getMapMapOptions(mapId)
  }

  /**
   * Get the options of a map
   *
   * These options are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): GetWarpedMapOptions<W> | undefined {
    return this.warpedMapList.getMapOptions(mapId)
  }

  /**
   * Set the renderer and list options
   *
   * @param renderAndListOptions - Render and list Options to set
   * @param animationOptions - Animation options
   */
  setOptions(
    renderAndListOptions?: Partial<BaseRenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.options = mergeOptions(this.options, renderAndListOptions)
    this.tileCache.setOptions(renderAndListOptions)
    this.warpedMapList.setOptions(renderAndListOptions, animationOptions)
  }

  /**
   * Set the map-specific options of maps (and the renderer and list options)
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param renderAndListOptions - Render and list options to set
   * @param animationOptions - Animation options
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions?: Partial<BaseRenderOptions>,
    renderAndListOptions?: Partial<BaseRenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    if (renderAndListOptions) {
      this.options = mergePartialOptions(this.options, renderAndListOptions)
      this.tileCache.setOptions(renderAndListOptions)
    }
    this.warpedMapList.setMapsOptions(
      mapIds,
      mapOptions,
      renderAndListOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of maps by map ID (and the render and list options)
   *
   * @param mapOptionsByMapId - Map-specific options to set by map ID
   * @param renderAndListOptions - Render and list options to set
   * @param animationOptions - Animation options
   */
  setMapsOptionsByMapId(
    mapOptionsByMapId?: Map<string, Partial<BaseRenderOptions>>,
    renderAndListOptions?: Partial<BaseRenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    if (renderAndListOptions) {
      this.options = mergePartialOptions(this.options, renderAndListOptions)
      this.tileCache.setOptions(renderAndListOptions)
    }
    this.warpedMapList.setMapsOptionsByMapId(
      mapOptionsByMapId,
      renderAndListOptions,
      animationOptions
    )
  }

  /**
   * Resets the list options
   *
   * An empty array resets all options, undefined resets no options.
   * Only resets the list options, not the render options
   *
   * @param listOptionKeys - Keys of the render and list options to reset
   * @param animationOptions - Animation options
   */
  resetOptions(
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetOptions(listOptionKeys, animationOptions)
  }

  /**
   * Resets the map-specific options of maps (and the list options)
   *
   * An empty array resets all options, undefined resets no options.
   * Only resets the list options, not the render options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
   * @param listOptionKeys - Keys of the render and list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetMapsOptions(
      mapIds,
      mapOptionKeys,
      listOptionKeys,
      animationOptions
    )
  }

  /**
   * Resets the map-specific options of maps by map ID (and the list options)
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   * Only resets the list options, not the render options
   *
   * @param mapOptionkeysByMapId - Keys of map-specific options to reset by map ID
   * @param listOptionKeys - Keys of the render and list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptionsByMapId(
    mapOptionkeysByMapId?: Map<string, string[]>,
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetMapsOptionsByMapId(
      mapOptionkeysByMapId,
      listOptionKeys,
      animationOptions
    )
  }

  protected loadMissingImagesInViewport(): Promise<void>[] {
    if (!this.viewport) {
      return []
    }

    const geoBufferedViewportRectangleBbox = computeBbox(
      this.viewport.getGeoBufferedRectangle()
    )

    return Array.from(
      this.warpedMapList.getWarpedMaps({
        geoBbox: geoBufferedViewportRectangleBbox
      })
    )
      .filter(
        (warpedMap) => !warpedMap.hasImage() && !warpedMap.fetchingImageInfo
      )
      .map((warpedMap) => warpedMap.loadImage(this.warpedMapList.imagesById))
  }

  protected someImagesInViewport(): boolean {
    if (!this.viewport) {
      return false
    }

    // Note: this must be the largest buffer
    // to make sure prune info is made and maps are pruned
    return Array.from(
      this.findMapsInViewport(
        this.shouldAnticipateInteraction()
          ? OVERVIEW_PRUNE_VIEWPORT_BUFFER_RATIO
          : 0
      )
    )
      .map((mapId) => this.warpedMapList.getWarpedMap(mapId) as WarpedMap)
      .map((warpedMap) => warpedMap.hasImage())
      .some(Boolean)
  }

  protected shouldRequestFetchableTiles() {
    return true
  }

  // Should we anticipate user interaction (panning or zooming)
  // and hence buffer the viewport or get overview tiles
  protected shouldAnticipateInteraction() {
    return false
  }

  protected assureProjection() {
    if (!this.viewport) {
      return
    }

    if (
      !isEqualProjection(
        this.warpedMapList.options.projection,
        this.viewport.projection
      )
    ) {
      this.warpedMapList.options.projection = this.viewport.projection
      this.warpedMapList.setOptions({ projection: this.viewport.projection })
    }
  }

  protected requestFetchableTiles(): void {
    if (!this.shouldRequestFetchableTiles()) {
      return
    }

    const fetchableTilesForViewport: FetchableTile[] = []
    const overviewFetchableTilesForViewport: FetchableTile[] = []

    const mapsInViewportForRequest = this.findMapsInViewport(
      this.shouldAnticipateInteraction() ? REQUEST_VIEWPORT_BUFFER_RATIO : 0
    )
    const mapsInViewportForOverviewRequest = this.findMapsInViewport(
      this.shouldAnticipateInteraction()
        ? OVERVIEW_REQUEST_VIEWPORT_BUFFER_RATIO
        : 0
    )
    const mapsInViewportForPrune = this.findMapsInViewport(
      this.shouldAnticipateInteraction() ? PRUNE_VIEWPORT_BUFFER_RATIO : 0
    )
    const mapsInViewportForOverviewPrune = this.findMapsInViewport(
      this.shouldAnticipateInteraction()
        ? OVERVIEW_PRUNE_VIEWPORT_BUFFER_RATIO
        : 0
    )

    // For all maps, reset properties for the current viewport: the (overview) zoomlevels, resource viewport ring and fetchable tiles
    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      warpedMap.resetForViewport()
    }

    // Get fetchable tiles for all maps in viewport with request buffer
    // (and set properties for the current viewport for all maps in viewport with prune buffer)
    for (const mapId of mapsInViewportForPrune) {
      fetchableTilesForViewport.push(
        ...this.getMapFetchableTilesForViewport(mapId, mapsInViewportForRequest)
      )
    }

    const fetchableTilesForViewportResolution = fetchableTilesForViewport
      .map((fetchableTile) => getTileResolution(fetchableTile.tile))
      .reduce((a, c) => a + c, 0)
    let overviewFetchableTilesForViewportResolution = 0

    // Get sprite fetchable tiles from tileCache
    const spriteFetchableTiles = this.tileCache
      .getCachedTiles()
      .filter((cachedTile) => cachedTile.isTileFromSprites())
      .filter(
        (cachedTile) =>
          this.warpedMapList.getWarpedMap(cachedTile.fetchableTile.mapId)
            ?.options.visible != false
      )
      .map((cachedTile) => cachedTile.fetchableTile)

    // Get overview fetchable tiles for all maps in viewport with overview buffer
    // (and set properties for the current viewport for all maps in viewport with prune buffer)
    if (this.shouldAnticipateInteraction()) {
      for (const mapId of mapsInViewportForOverviewPrune) {
        const mapOverviewFetchableTilesForViewport =
          this.getMapOverviewFetchableTilesForViewport(
            mapId,
            fetchableTilesForViewportResolution +
              overviewFetchableTilesForViewportResolution,
            mapsInViewportForOverviewRequest,
            spriteFetchableTiles
          )
        overviewFetchableTilesForViewportResolution +=
          mapOverviewFetchableTilesForViewport
            .map((fetchableTile) => getTileResolution(fetchableTile.tile))
            .reduce((a, c) => a + c, 0)
        overviewFetchableTilesForViewport.push(
          ...mapOverviewFetchableTilesForViewport
        )
      }
    }

    const allFetchableTilesForViewport = [
      ...fetchableTilesForViewport,
      ...spriteFetchableTiles,
      ...overviewFetchableTilesForViewport
    ]
    const allRequestedTilesForViewport = allFetchableTilesForViewport.filter(
      (fetchableTile) =>
        this.warpedMapList.getWarpedMap(fetchableTile.mapId)?.shouldRenderMap()
    )

    // Request all fetchable tiles to render, and prune tile cache
    this.tileCache.requestFetchableTiles(allRequestedTilesForViewport)
    this.pruneTileCache(mapsInViewportForOverviewPrune)

    // Update map for viewport based on all fetchable tiles
    this.updateMapsForViewport(allFetchableTilesForViewport)
  }

  protected findMapsInViewport(viewportBufferRatio = 0): Set<string> {
    if (!this.viewport) {
      return new Set()
    }
    const viewport = this.viewport

    const geoBufferedViewportRectangleBbox = computeBbox(
      this.viewport.getGeoBufferedRectangle(viewportBufferRatio)
    )

    const mapsInViewport = new Set(
      Array.from(
        this.warpedMapList.getWarpedMaps({
          geoBbox: geoBufferedViewportRectangleBbox
        })
      )
        .map((warpedMap) => {
          return {
            warpedMap,
            projectedGeoSquaredDistanceToViewportCenter: squaredDistance(
              bboxToCenter(warpedMap.projectedGeoMaskBbox),
              viewport.projectedGeoCenter
            )
          }
        })
        .sort((warpedMapAndDistanceA, warpedMapAndDistanceB) => {
          if (warpedMapAndDistanceA && warpedMapAndDistanceB) {
            return (
              warpedMapAndDistanceA.projectedGeoSquaredDistanceToViewportCenter -
              warpedMapAndDistanceB.projectedGeoSquaredDistanceToViewportCenter
            )
          } else {
            return 0
          }
        })
        .map((warpedMapAndDistance) => warpedMapAndDistance.warpedMap.mapId)
    )

    return mapsInViewport
  }

  protected getMapFetchableTilesForViewport(
    mapId: string,
    mapsInViewportForRequest: Set<string>
  ): FetchableTile[] {
    if (!this.viewport) {
      return []
    }
    const viewport = this.viewport

    const warpedMap = this.warpedMapList.getWarpedMap(mapId)

    if (!warpedMap) {
      return []
    }

    if (!warpedMap.options.visible) {
      return []
    }

    if (!warpedMap.hasImage()) {
      // Note: don't load image information here
      // this would imply waiting for the first throttling cycle to complete
      // before acting on a sucessful load
      return []
    }

    // Find TileZoomLevel for the current viewport
    // Note the equivalence of the following two:
    // - warpedMap.getApproxResourceToCanvasScale(this.viewport)
    // - warpedMap.resourceToProjectedGeoScale * this.viewport.projectedGeoPerCanvasScale
    const tileZoomLevel = getTileZoomLevelForScale(
      warpedMap.image.tileZoomLevels,
      warpedMap.getResourceToCanvasScale(viewport),
      SCALE_FACTOR_CORRECTION,
      LOG2_SCALE_FACTOR_CORRECTION
    )
    warpedMap.setTileZoomLevelForViewport(tileZoomLevel)

    // Transforming the viewport back to resource
    const transformerOptions = {
      maxDepth: 0,
      // maxDepth: 2,
      // minOffsetRatio: 0.00001,
      sourceIsGeographic: false,
      destinationIsGeographic: true
    }
    // This can be expensive at high maxDepth and seems to work fine with maxDepth = 0
    // TODO: Consider recusive refinement via options like {minOffsetRatio: 0.00001, maxDepth: 2}
    // Note: if recursive refinement, use geographic distances and midpoints for lon-lat destination points
    const projectedGeoBufferedViewportRectangle =
      viewport.getProjectedGeoBufferedRectangle(
        this.shouldAnticipateInteraction() ? REQUEST_VIEWPORT_BUFFER_RATIO : 0
      )
    // Optimise computation time of backwards transformation:
    // Since this is the only place transformToResource is called
    // (and hence backwards transformation is computed)
    // and computing thinPlateSpline can be expensive for maps with many gcps
    // we can chose to compute the less expensive polynomial backward transformation.
    // Note: for very deformed maps (with TPS and many gcps),
    // this could lead to inaccurate tile loading (in addition to the reason explained below).
    const projectedTransformer =
      warpedMap.transformationType === 'thinPlateSpline' &&
      warpedMap.gcps.length > MAX_GCPS_EXACT_TPS_TO_RESOURCE
        ? warpedMap.getProjectedTransformer('polynomial')
        : warpedMap.projectedTransformer
    // Compute viewport in resource
    // Note: since the backward transformation is not the exact inverse of the forward
    // there is an inherent imperfection in this computation
    // which could lead to inaccurate tile loading.
    // In general, this is made up for by the buffers.
    const resourceBufferedViewportRing =
      projectedTransformer.transformToResource(
        [projectedGeoBufferedViewportRectangle],
        transformerOptions
      )[0]
    warpedMap.setProjectedGeoBufferedViewportRectangleForViewport(
      projectedGeoBufferedViewportRectangle
    )
    warpedMap.setResourceBufferedViewportRingForViewport(
      resourceBufferedViewportRing
    )
    // Assure variables exist on warpedMap, that should be computed by the setters above
    if (
      !warpedMap.resourceBufferedViewportRingBboxForViewport ||
      !warpedMap.resourceBufferedViewportRingBboxForViewport
    ) {
      throw new Error(
        'No resourceBufferedViewportRingBboxForViewport or resourceBufferedViewportRingBboxForViewport'
      )
    }

    // Compute intersection of bboxes of to-resource-back-transformed viewport and resource mask
    const resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection =
      intersectBboxes(
        warpedMap.resourceBufferedViewportRingBboxForViewport,
        warpedMap.resourceMaskBbox
      )
    warpedMap.setResourceBufferedViewportRingBboxAndResourceMaskBboxIntersectionForViewport(
      resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection
    )

    // If this map it outside of the viewport with request buffer, stop here:
    // in thise case we only ran this function to set the properties for the current viewport
    // so we can use them relyably while pruning
    if (!mapsInViewportForRequest.has(mapId)) {
      return []
    }

    // If the intersection of the bboxes is undefined, we don't need to compute any tiles.
    // This should in general only happen if the previous check also returned false.
    if (!resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection) {
      return []
    }

    // Find tiles covering this intersection of bboxes of to-resource-back-transformed viewport and mask
    // by computing the tiles covering this bbox's rectangle at the tilezoomlevel
    let tiles = computeTilesCoveringRingAtTileZoomLevel(
      bboxToRectangle(
        resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection
      ),
      tileZoomLevel,
      [warpedMap.image.width, warpedMap.image.height]
    )

    // Don't include tiles that have zoomlevels close to sprite tiles of this map
    tiles = this.filterOutTilesCloseToSpriteTiles(tiles, warpedMap)

    // Sort tiles to load in order of their distance to viewport center
    const resourceBufferedViewportRingCenter = bboxToCenter(
      warpedMap.resourceBufferedViewportRingBboxForViewport
    )
    tiles.sort(
      (tileA, tileB) =>
        squaredDistanceTileToPoint(tileA, resourceBufferedViewportRingCenter) -
        squaredDistanceTileToPoint(tileB, resourceBufferedViewportRingCenter)
    )

    // Make fetchable tiles
    const fetchableTiles = tiles.map((tile) =>
      FetchableTile.fromWarpedMap(tile, warpedMap)
    )
    warpedMap.setFetchableTilesForViewport(fetchableTiles)

    return fetchableTiles
  }

  protected getMapOverviewFetchableTilesForViewport(
    mapId: string,
    totalFetchableTilesForViewportResolution: number,
    mapsInViewportForOverviewRequest: Set<string>,
    spriteFetchabelTiles: FetchableTile[]
  ): FetchableTile[] {
    if (!this.viewport) {
      return []
    }

    const warpedMap = this.warpedMapList.getWarpedMap(mapId)

    if (!warpedMap) {
      return []
    }

    if (!warpedMap.options.visible) {
      return []
    }

    if (!warpedMap.hasImage()) {
      // Note: don't load image information here
      // this would imply waiting for the first throttling cycle to complete
      // before acting on a sucessful load
      return []
    }

    // No overview tiles if too many fetchable tiles (normal and overview) in total already
    // or if many maps to render
    // or if tiles from sprites
    const maxTotalFetchableTilesResolution =
      this.viewport.canvasResolution * MAX_TOTAL_OVERVIEW_RESOLUTION_RATIO
    if (
      totalFetchableTilesForViewportResolution >
        maxTotalFetchableTilesResolution ||
      mapsInViewportForOverviewRequest.size > MAX_TOTAL_MAPS_OVERVIEW ||
      spriteFetchabelTiles.length > 0
    ) {
      return []
    }

    // Find the fitting overview zoomlevel, if any
    const overviewTileZoomLevel = warpedMap.image.tileZoomLevels
      .filter(
        (tileZoomLevel) =>
          getTileZoomLevelResolution(tileZoomLevel) <=
          MAX_MAP_OVERVIEW_RESOLUTION
        // Neglect zoomlevels that contain too many pixels
      )
      .sort(
        (tileZoomLevel0, tileZoomLevel1) =>
          tileZoomLevel0.scaleFactor - tileZoomLevel1.scaleFactor
        // Enforcing default ascending order, e.g. from 1 to 16
      )
      .at(-1)
    warpedMap.setOverviewTileZoomLevelForViewport(overviewTileZoomLevel)

    // If this map it ourside of the viewport with overview buffer, stop here:
    // in thise case we only ran this function to set the properties for the current viewport
    // so we can use them relyably while pruning
    if (!mapsInViewportForOverviewRequest.has(mapId)) {
      return []
    }

    // If the overview tile zoomlevel scalefactor is the same or lower then tile zoom level scalefactor for the current viewport
    // then this is not really an 'overview' tilezoomlevel, so don't proceed
    if (
      !overviewTileZoomLevel ||
      (warpedMap.tileZoomLevelForViewport &&
        overviewTileZoomLevel.scaleFactor <=
          warpedMap.tileZoomLevelForViewport.scaleFactor)
    ) {
      return []
    }

    // Find all tiles at overview scalefactor
    let overviewTiles = getTilesAtScaleFactor(
      overviewTileZoomLevel.scaleFactor,
      warpedMap.image
    )

    // Don't include tiles that have zoomlevels close to sprite tiles of this map
    overviewTiles = this.filterOutTilesCloseToSpriteTiles(
      overviewTiles,
      warpedMap
    )

    // Make fechable tiles
    const overviewFetchableTiles = overviewTiles.map((tile) =>
      FetchableTile.fromWarpedMap(tile, warpedMap)
    )
    warpedMap.setOverviewFetchableTilesForViewport(overviewFetchableTiles)

    return overviewFetchableTiles
  }

  protected updateMapsForViewport(
    allFechableTilesForViewport: FetchableTile[]
  ): {
    mapsEnteringViewport: string[]
    mapsLeavingViewport: string[]
  } {
    this.mapsWithFetchableTilesForViewport = new Set(
      allFechableTilesForViewport
        .map((tile) => tile.mapId)
        .sort((mapId0, mapId1) =>
          this.warpedMapList.orderMapIdsByZIndex(mapId0, mapId1)
        )
    )

    this.mapsInPreviousViewport = this.mapsInViewport
    this.mapsInViewport = this.findMapsInViewport()

    // TODO: handle everything as Set() once JS supports filter on sets.
    // And speed up with anonymous functions with the Set.prototype.difference() once broadly supported
    const mapsInPreviousViewportAsArray = Array.from(
      this.mapsInPreviousViewport
    )
    const mapsInViewportAsArray = Array.from(this.mapsInViewport)

    const mapsEnteringViewport = mapsInViewportAsArray.filter(
      (mapId) => !mapsInPreviousViewportAsArray.includes(mapId)
    )
    const mapsLeavingViewport = mapsInPreviousViewportAsArray.filter(
      (mapId) => !mapsInViewportAsArray.includes(mapId)
    )

    for (const mapId of mapsEnteringViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTERED, {
          mapIds: [mapId]
        })
      )
    }
    for (const mapId of mapsLeavingViewport) {
      this.clearMap(mapId)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEFT, {
          mapIds: [mapId]
        })
      )
    }

    return {
      mapsEnteringViewport,
      mapsLeavingViewport
    }
  }

  protected pruneTileCache(mapsInViewportForOverviewPrune: Set<string>) {
    // Create pruneInfo for all maps in viewport with prune overview buffer
    const pruneInfoByMapId: Map<string, MapPruneInfo> = new Map()
    for (const warpedMap of this.warpedMapList.getWarpedMaps({
      mapIds: mapsInViewportForOverviewPrune
    })) {
      pruneInfoByMapId.set(warpedMap.mapId, {
        tileZoomLevelForViewport: warpedMap.tileZoomLevelForViewport,
        overviewTileZoomLevelForViewport:
          warpedMap.overviewTileZoomLevelForViewport,
        resourceViewportRingBboxForViewport:
          warpedMap.resourceBufferedViewportRingBboxForViewport
      })
    }
    this.tileCache.prune(pruneInfoByMapId)
  }

  protected filterOutTilesCloseToSpriteTiles(
    tiles: Tile[],
    warpedMap: WarpedMap
  ) {
    const spriteCachedTiles = this.tileCache
      .getMapCachedTiles(warpedMap.mapId)
      .filter((cachedTile) => cachedTile.isTileFromSprites())
    const spriteCachedTilesScaleFactors = spriteCachedTiles.map(
      (cachedTile) => cachedTile.fetchableTile.tile.tileZoomLevel.scaleFactor
    )
    return tiles.filter((tile) => {
      for (const spriteCachedTilesScaleFactor of spriteCachedTilesScaleFactors) {
        const log2ScaleFactorDiff =
          Math.log2(tile.tileZoomLevel.scaleFactor) -
          Math.log2(spriteCachedTilesScaleFactor)
        const scaleFactorDiffWithinHigherTolerance =
          log2ScaleFactorDiff <= SPRITES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF
        const scaleFactorDiffWithinLowerTolerance =
          -log2ScaleFactorDiff <= SPRITES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF
        if (
          scaleFactorDiffWithinHigherTolerance &&
          scaleFactorDiffWithinLowerTolerance
        ) {
          return false
        }
      }
      return true
    })
  }

  destroy() {
    this.tileCache.destroy()
    this.warpedMapList.destroy()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected clearMap(mapId: string): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileDeleted(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected imageLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapAdded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapRemoved(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected prepareChange(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected immediateChange(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected animatedChange(event: Event): void {}

  protected addEventListeners() {
    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEDELETED,
      this.mapTileDeleted.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMAGELOADED,
      this.imageLoaded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.warpedMapRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.prepareChange.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.animatedChange.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.immediateChange.bind(this)
    )
  }

  protected removeEventListeners() {
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEDELETED,
      this.mapTileDeleted.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMAGELOADED,
      this.imageLoaded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.warpedMapRemoved.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.prepareChange.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.immediateChange.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.animatedChange.bind(this)
    )
  }
}
