import {
  bboxToCenter,
  computeBbox,
  squaredDistance,
  intersectBboxes,
  bboxToRectangle,
  mergeOptions,
  mergePartialOptions
} from '@allmaps/stdlib'
import { isEqualProjection, webMercatorProjection } from '@allmaps/project'

import { TileCache } from '../tilecache/TileCache.js'
import { WarpedMapList } from '../maps/WarpedMapList.js'
import { FetchableTile } from '../tilecache/FetchableTile.js'

import {
  WarpedMapErrorEvent,
  WarpedMapEvent,
  WarpedMapEventType
} from '../shared/events.js'
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
  BaseRenderOptions,
  MapPruneInfo,
  GetWarpedMapOptions,
  AnimationOptions,
  SpecificBaseRenderOptions,
  SpritesInfo,
  Sprite
} from '../shared/types.js'

/**
 * Abstract base class for renderers
 */
export abstract class BaseRenderer<W extends WarpedMap, D> extends EventTarget {
  DEFAULT_SPECIFIC_BASE_RENDER_OPTIONS: SpecificBaseRenderOptions<W>

  warpedMapList: WarpedMapList<W>
  tileCache: TileCache<D>
  spritesTileCache: TileCache<D>

  mapsInPreviousViewport: Set<string> = new Set()
  mapsInViewport: Set<string> = new Set()
  mapsWithFetchableTilesForPreviousViewport: Set<string> = new Set()
  mapsWithFetchableTilesForViewport: Set<string> = new Set()
  mapsWithRequestedTilesForViewport: Set<string> = new Set()
  protected viewport: Viewport | undefined

  options: BaseRenderOptions<W>

  #boundMapTileLoaded = this.mapTileLoaded.bind(this)
  #boundMapTileDeleted = this.mapTileDeleted.bind(this)
  #boundImageLoaded = this.imageLoaded.bind(this)
  #boundWarpedMapAdded = this.warpedMapAdded.bind(this)
  #boundWarpedMapRemoved = this.warpedMapRemoved.bind(this)
  #boundPrepareChange = this.prepareChange.bind(this)
  #boundAnimatedChange = this.animatedChange.bind(this)
  #boundImmediateChange = this.immediateChange.bind(this)

  constructor(
    cacheableTileFactory: CacheableTileFactory<D>,
    options?: Partial<BaseRenderOptions<W>>
  ) {
    super()

    // TODO: move defaults for tunable options here
    this.DEFAULT_SPECIFIC_BASE_RENDER_OPTIONS = {
      // These buffers should be in growing order
      requestViewportBufferRatio: 0,
      overviewRequestViewportBufferRatio: 8,
      pruneViewportBufferRatio: 8,
      overviewPruneViewportBufferRatio: 16,

      // 0 = no correction, -1 = shaper, +1 = less sharp
      // Normal has more effect on smaller scale factors
      // Log2 (i.e. per zoomlevel) has equal effect on all scale factors
      scaleFactorCorrection: 0,
      log2ScaleFactorCorrection: -0.5,

      spritesMaxHigherLog2ScaleFactorDiff: Infinity,
      spritesMaxLowerLog2ScaleFactorDiff: 1,

      // Support one 1024 * 1024 overview tile, e.g. for Rotterdam map.
      maxMapOverviewResolution: 1024 * 1024,
      maxTotalOverviewResolutionRatio: 50,

      maxGcpsExactTpsToResource: 100
    }

    this.options = mergeOptions(
      this.DEFAULT_SPECIFIC_BASE_RENDER_OPTIONS,
      options
    )

    this.warpedMapList = this.options.warpedMapList
      ? this.getWarpedMapListFromOptions()
      : new WarpedMapList(options)
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
  addGeoreferenceAnnotation(
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
  addGeoreferencedMap(
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

      const resourceId = warpedMap.georeferencedMap.resource.id
      if (!warpedMapsByResourceId.has(resourceId)) {
        warpedMapsByResourceId.set(resourceId, [])
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
  getDefaultOptions(): BaseRenderOptions<W> & GetWarpedMapOptions<W> {
    return mergeOptions(
      this.DEFAULT_SPECIFIC_BASE_RENDER_OPTIONS,
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
  getOptions(): Partial<BaseRenderOptions<W>> {
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
    renderAndListOptions?: Partial<BaseRenderOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.options = mergeOptions(this.options, renderAndListOptions)
    this.tileCache.setOptions(renderAndListOptions)
    this.warpedMapList.setOptions(renderAndListOptions, animationOptions)
  }

  /**
   * Set the map-specific options of maps
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param animationOptions - Animation options
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions?: Partial<BaseRenderOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.warpedMapList.setMapsOptions(mapIds, mapOptions, animationOptions)
  }

  /**
   * Set the map-specific options of maps, and the renderer and list options
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param renderAndListOptions - Render and list options to set
   * @param animationOptions - Animation options
   */
  setMapsOptionsAndOptions(
    mapIds: string[],
    mapOptions?: Partial<BaseRenderOptions<W>>,
    renderAndListOptions?: Partial<BaseRenderOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    if (renderAndListOptions) {
      this.options = mergeOptions(this.options, renderAndListOptions)
      this.tileCache.setOptions(renderAndListOptions)
    }
    this.warpedMapList.setMapsOptionsAndListOptions(
      mapIds,
      mapOptions,
      renderAndListOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of maps by map ID (and the render and list options)
   *
   * @param mapsOptionsByMapId - Map-specific options to set by map ID
   * @param renderAndListOptions - Render and list options to set
   * @param animationOptions - Animation options
   */
  setMapsOptionsByMapIdAndOptions(
    mapsOptionsByMapId?: Map<string, Partial<BaseRenderOptions<W>>>,
    renderAndListOptions?: Partial<BaseRenderOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    if (renderAndListOptions) {
      this.options = mergeOptions(this.options, renderAndListOptions)
      this.tileCache.setOptions(renderAndListOptions)
    }
    this.warpedMapList.setMapsOptionsByMapIdAndListOptions(
      mapsOptionsByMapId,
      renderAndListOptions,
      animationOptions
    )
  }

  /**
   * Resets the list options
   *
   * Undefined option keys reset all options
   *
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetOptions(
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetOptions(listOptionKeys, animationOptions)
  }

  /**
   * Resets the map-specific options of maps
   *
   * Undefined option keys reset all options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetMapsOptions(mapIds, mapOptionKeys, animationOptions)
  }

  /**
   * Resets the map-specific options of maps, and the list options
   *
   * Undefined option keys reset all options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptionsAndOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    this.warpedMapList.resetMapsOptionsAndListOptions(
      mapIds,
      mapOptionKeys,
      listOptionKeys,
      animationOptions
    )
  }

  protected getWarpedMapListFromOptions(): WarpedMapList<W> {
    if (!this.options.warpedMapList) {
      throw new Error('No WarpedMapList')
    }
    const warpedMapList = this.options.warpedMapList
    warpedMapList.setOptions(this.options)
    return warpedMapList
  }

  protected loadMissingImagesInViewport(): Promise<void>[] {
    if (!this.viewport) {
      return []
    }

    // Same comment on viewport and warpedMapList being in same projection as below
    const projectedGeoBufferedViewportRectangleBbox = computeBbox(
      this.viewport.getProjectedGeoBufferedRectangle()
    )

    return this.warpedMapList
      .getWarpedMaps({
        projectedGeoBbox: projectedGeoBufferedViewportRectangleBbox,
        applyMask: false
      })
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
          ? this.options.overviewPruneViewportBufferRatio
          : 1
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
      this.shouldAnticipateInteraction()
        ? this.options.requestViewportBufferRatio
        : 1
    )
    const mapsInViewportForOverviewRequest = new Set([
      ...this.findMapsInViewport(
        this.shouldAnticipateInteraction()
          ? this.options.overviewRequestViewportBufferRatio
          : 1
      ),
      ...this.findMapsToAnticipate()
    ])
    const mapsInViewportForPrune = this.findMapsInViewport(
      this.shouldAnticipateInteraction()
        ? this.options.pruneViewportBufferRatio
        : 1
    )
    const mapsInViewportForOverviewPrune = this.findMapsInViewport(
      this.shouldAnticipateInteraction()
        ? this.options.overviewPruneViewportBufferRatio
        : 1
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
      .filter((cachedTile) =>
        this.warpedMapList
          .getWarpedMap(cachedTile.fetchableTile.mapId)
          ?.shouldRenderMap()
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
      (fetchableTile) => {
        const warpedMap = this.warpedMapList.getWarpedMap(fetchableTile.mapId)
        return warpedMap?.shouldRenderMap() || warpedMap?.options.anticipate
      }
    )

    // Request all fetchable tiles to render, and prune tile cache
    this.tileCache.requestFetchableTiles(allRequestedTilesForViewport)
    this.pruneTileCache(mapsInViewportForOverviewPrune)

    // Update map for viewport based on all fetchable tiles
    this.updateMapsForViewport(allFetchableTilesForViewport)
  }

  protected findMapsInViewport(viewportBufferRatio?: number): Set<string> {
    if (!this.viewport) {
      return new Set()
    }
    const viewport = this.viewport

    // Using the viewport's projectedGeoBufferedRectangle to look up
    // in the warpedMapList's projectedGeo RTree
    // assumes the viewport and warpedMapList are in the same projection.
    // This is what assureProjection() takes care of, but is worth noting here.
    // (It's also why we don't need to pass a projection in the lookup function)
    const projectedGeoBufferedViewportRectangleBbox = computeBbox(
      this.viewport.getProjectedGeoBufferedRectangle(viewportBufferRatio)
    )

    const mapsInViewport = new Set(
      this.warpedMapList
        .getWarpedMaps({
          projectedGeoBbox: projectedGeoBufferedViewportRectangleBbox,
          applyMask: false
        })
        .map((warpedMap) => {
          return {
            warpedMap,
            projectedGeoSquaredDistanceToViewportCenter: squaredDistance(
              bboxToCenter(warpedMap.projectedGeoAppliedMaskBbox),
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

  protected findMapsToAnticipate(): Set<string> {
    return new Set(
      this.warpedMapList
        .getWarpedMaps()
        .filter((warpedMap) => warpedMap.options.anticipate)
        .map((warpedmap) => warpedmap.mapId)
    )
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

    if (!warpedMap.shouldRenderMap()) {
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
    // - warpedMap.getApproxResourceToViewportScale(this.viewport)
    // - warpedMap.resourceToProjectedGeoScale * this.viewport.projectedGeoPerViewportScale
    const tileZoomLevel = getTileZoomLevelForScale(
      warpedMap.image.tileZoomLevels,
      warpedMap.getResourceToViewportScale(viewport),
      this.options.scaleFactorCorrection,
      this.options.log2ScaleFactorCorrection
    )
    warpedMap.setTileZoomLevelForViewport(tileZoomLevel)

    // Transforming the viewport back to resource
    const transformerOptions = {
      maxDepth: isEqualProjection(
        warpedMap.internalProjection,
        webMercatorProjection
      )
        ? 0
        : 2,
      minOffsetRatio: 0.00001
    }
    // This can be expensive at high maxDepth and seems to work fine with maxDepth = 0
    // If an internal projection is present, some refinement is needed.
    // Note: if recursive refinement, use geographic distances and midpoints for lon-lat destination points
    const projectedGeoBufferedViewportRectangle =
      viewport.getProjectedGeoBufferedRectangle(
        this.shouldAnticipateInteraction()
          ? this.options.requestViewportBufferRatio
          : 1
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
      warpedMap.gcps.length > this.options.maxGcpsExactTpsToResource
        ? warpedMap.getProjectedTransformer('polynomial')
        : warpedMap.projectedTransformer
    // Compute viewport in resource
    // Note: since the backward transformation is not the exact inverse of the forward
    // there is an inherent imperfection in this computation
    // which could lead to inaccurate tile loading.
    // In general, this is made up for by the buffers.
    // Note: this is the first time the backwards transformation is computed
    // which can cause unexpected errors (this isn't computed and hence check when adding maps)
    // so we catch such error and pass them to the user as events.
    let resourceBufferedViewportRing
    try {
      resourceBufferedViewportRing = projectedTransformer.transformToResource(
        [projectedGeoBufferedViewportRectangle],
        transformerOptions
      )[0]
    } catch (error) {
      if (error instanceof Error) {
        error.message = 'Error while transforming to resource: ' + error.message
        const errorEvent = new WarpedMapErrorEvent(error, { mapIds: [mapId] })
        this.dispatchEvent(errorEvent)
      }
      // Return no tiles, which will exclude this map from mapsInViewport etc.
      // and hence all further rendering.
      return []
    }
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

    // Compute intersection of bboxes of to-resource-back-transformed viewport and resource applied mask
    const resourceBufferedViewportRingBboxAndResourceAppliedMaskBboxIntersection =
      intersectBboxes(
        warpedMap.resourceBufferedViewportRingBboxForViewport,
        warpedMap.resourceAppliedMaskBbox
      )
    warpedMap.setResourceBufferedViewportRingBboxAndResourceAppliedMaskBboxIntersectionForViewport(
      resourceBufferedViewportRingBboxAndResourceAppliedMaskBboxIntersection
    )

    // If this map it outside of the viewport with request buffer, stop here:
    // in thise case we only ran this function to set the properties for the current viewport
    // so we can use them relyably while pruning
    if (!mapsInViewportForRequest.has(mapId)) {
      return []
    }

    // If the intersection of the bboxes is undefined, we don't need to compute any tiles.
    // This should in general only happen if the previous check also returned false.
    if (
      !resourceBufferedViewportRingBboxAndResourceAppliedMaskBboxIntersection
    ) {
      return []
    }

    // Find tiles covering this intersection of bboxes of to-resource-back-transformed viewport and mask
    // by computing the tiles covering this bbox's rectangle at the tilezoomlevel
    let tiles = computeTilesCoveringRingAtTileZoomLevel(
      bboxToRectangle(
        resourceBufferedViewportRingBboxAndResourceAppliedMaskBboxIntersection
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

    if (!warpedMap.shouldRenderMap() && !warpedMap.options.anticipate) {
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
      this.viewport.viewportResolution *
      this.options.maxTotalOverviewResolutionRatio
    if (
      totalFetchableTilesForViewportResolution >
        maxTotalFetchableTilesResolution ||
      spriteFetchabelTiles.length > 0
    ) {
      return []
    }

    // Find the fitting overview zoomlevel, if any
    const overviewTileZoomLevel = warpedMap.image.tileZoomLevels
      .filter(
        (tileZoomLevel) =>
          warpedMap.options.anticipateTileZoomLevel == 'top'
            ? true
            : getTileZoomLevelResolution(tileZoomLevel) <=
              this.options.maxMapOverviewResolution
        // Neglect zoomlevels that contain too many pixels
      )
      .sort(
        (tileZoomLevel0, tileZoomLevel1) =>
          tileZoomLevel0.scaleFactor - tileZoomLevel1.scaleFactor
        // Enforcing default ascending order, e.g. from 1 to 16
      )
      .at(-1)
    warpedMap.setOverviewTileZoomLevelForViewport(overviewTileZoomLevel)

    // If this map it outside of the viewport with overview buffer, or if the map is invisible, stop here:
    // in thise case we only ran this function to set the properties for the current viewport
    // so we can use them relyably while pruning
    if (
      !warpedMap.options.anticipate &&
      (!mapsInViewportForOverviewRequest.has(mapId) ||
        !warpedMap.shouldRenderMap())
    ) {
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
    mapsWithFetchableTilesForViewportEntering: string[]
    mapsWithFetchableTilesForViewportLeaving: string[]
    mapsInViewportEntering: string[]
    mapsInViewportLeaving: string[]
  } {
    this.mapsWithFetchableTilesForPreviousViewport =
      this.mapsWithFetchableTilesForViewport
    this.mapsWithFetchableTilesForViewport = new Set(
      allFechableTilesForViewport
        .map((tile) => tile.mapId)
        .sort((mapId0, mapId1) =>
          this.warpedMapList.orderMapIdsByZIndex(mapId0, mapId1)
        )
    )

    this.mapsInPreviousViewport = this.mapsInViewport
    this.mapsInViewport = this.findMapsInViewport()

    const {
      mapsForViewportEntering: mapsWithFetchableTilesForViewportEntering,
      mapsForViewportLeaving: mapsWithFetchableTilesForViewportLeaving
    } = this.mapsInViewportsToEnteringAndLeaving(
      Array.from(this.mapsWithFetchableTilesForPreviousViewport),
      Array.from(this.mapsWithFetchableTilesForViewport)
    )

    const {
      mapsForViewportEntering: mapsInViewportEntering,
      mapsForViewportLeaving: mapsInViewportLeaving
    } = this.mapsInViewportsToEnteringAndLeaving(
      Array.from(this.mapsInPreviousViewport),
      Array.from(this.mapsInViewport)
    )

    for (const mapId of mapsInViewportEntering) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTERED, {
          mapIds: [mapId]
        })
      )
    }
    for (const mapId of mapsInViewportLeaving) {
      this.clearMap(mapId)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEFT, {
          mapIds: [mapId]
        })
      )
    }

    return {
      mapsWithFetchableTilesForViewportEntering,
      mapsWithFetchableTilesForViewportLeaving,
      mapsInViewportEntering,
      mapsInViewportLeaving
    }
  }

  protected mapsInViewportsToEnteringAndLeaving(
    mapsForPreviousViewport: string[],
    mapsForViewport: string[]
  ): {
    mapsForViewportEntering: string[]
    mapsForViewportLeaving: string[]
  } {
    // TODO: handle everything as Set() once JS supports filter on sets.
    // And speed up with anonymous functions with the Set.prototype.difference() once broadly supported
    const mapsForViewportEntering = mapsForViewport.filter(
      (mapId) => !mapsForPreviousViewport.includes(mapId)
    )
    const mapsForViewportLeaving = mapsForPreviousViewport.filter(
      (mapId) => !mapsForViewport.includes(mapId)
    )

    return {
      mapsForViewportEntering,
      mapsForViewportLeaving
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
          log2ScaleFactorDiff <=
          this.options.spritesMaxHigherLog2ScaleFactorDiff
        const scaleFactorDiffWithinLowerTolerance =
          -log2ScaleFactorDiff <=
          this.options.spritesMaxLowerLog2ScaleFactorDiff
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
      this.#boundMapTileLoaded
    )
    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEDELETED,
      this.#boundMapTileDeleted
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMAGELOADED,
      this.#boundImageLoaded
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.#boundWarpedMapAdded
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.#boundWarpedMapRemoved
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.#boundPrepareChange
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.#boundAnimatedChange
    )
    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.#boundImmediateChange
    )
  }

  protected removeEventListeners() {
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.#boundMapTileLoaded
    )
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEDELETED,
      this.#boundMapTileDeleted
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMAGELOADED,
      this.#boundImageLoaded
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.#boundWarpedMapAdded
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.#boundWarpedMapRemoved
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.#boundPrepareChange
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.#boundAnimatedChange
    )
    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.#boundImmediateChange
    )
  }
}
