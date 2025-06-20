import { TileCache } from '../tilecache/TileCache.js'
import { WarpedMapList } from '../maps/WarpedMapList.js'
import { FetchableTile } from '../tilecache/FetchableTile.js'

import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import {
  getTileZoomLevelForScale,
  computeTilesCoveringRingAtTileZoomLevel,
  getTilesResolution,
  getTilesAtScaleFactor,
  getTileZoomLevelResolution,
  squaredDistanceTileToPoint
} from '../shared/tiles.js'

import {
  bboxToCenter,
  computeBbox,
  squaredDistance,
  intersectBboxes,
  bboxToRectangle,
  mergeOptions
} from '@allmaps/stdlib'
import { lonLatProjection, proj4 } from '@allmaps/project'

import type { Viewport } from '../viewport/Viewport.js'
import type { WarpedMap } from '../maps/WarpedMap.js'
import type {
  CachableTileFactory,
  WarpedMapFactory,
  BaseRendererOptions,
  MapPruneInfo
} from '../shared/types.js'

// TODO: move defaults for tunable options here
const defaultBaseRendererOptions = {}

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

const MAX_MAP_OVERVIEW_RESOLUTION = 1024 * 1024 // Support one 1024 * 1024 overview tile, e.g. for Rotterdam map.
const MAX_TOTAL_RESOLUTION_RATIO = 10

const MAX_GCPS_EXACT_TPS_TO_RESOURCE = 100

/**
 * Abstract base class for renderers
 */
export abstract class BaseRenderer<W extends WarpedMap, D> extends EventTarget {
  partialBaseRendererOptions: Partial<BaseRendererOptions>

  warpedMapList: WarpedMapList<W>
  tileCache: TileCache<D>

  mapsInPreviousViewport: Set<string> = new Set()
  mapsInViewport: Set<string> = new Set()
  mapsWithRequestedTilesForViewport: Set<string> = new Set()
  protected viewport: Viewport | undefined

  constructor(
    cachableTileFactory: CachableTileFactory<D>,
    warpedMapFactory: WarpedMapFactory<W>,
    partialBaseRendererOptions?: Partial<BaseRendererOptions>
  ) {
    super()

    this.partialBaseRendererOptions = mergeOptions(
      defaultBaseRendererOptions,
      partialBaseRendererOptions
    )

    this.tileCache = new TileCache(
      cachableTileFactory,
      partialBaseRendererOptions
    )
    this.warpedMapList = new WarpedMapList(
      warpedMapFactory,
      partialBaseRendererOptions
    )
  }

  /**
   * Parses an annotation and adds its georeferenced map to this renderer's warped map list
   *
   * @param annotation
   * @returns
   */
  async addGeoreferenceAnnotation(annotation: unknown) {
    return this.warpedMapList.addGeoreferenceAnnotation(annotation)
  }

  /**
   * Adds a georeferenced map to this renderer's warped map list
   *
   * @param georeferencedMap
   * @returns
   */
  async addGeoreferencedMap(georeferencedMap: unknown) {
    return this.warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  /**
   * Set the Base Renderer options
   *
   * @param partialBaseRendererOptions - Options
   */
  setOptions(partialBaseRendererOptions?: Partial<BaseRendererOptions>): void {
    this.partialBaseRendererOptions = mergeOptions(
      this.partialBaseRendererOptions,
      partialBaseRendererOptions
    )
    this.tileCache.setOptions(partialBaseRendererOptions)
    this.warpedMapList.setOptions(partialBaseRendererOptions)
  }

  protected loadMissingImageInfosInViewport(): Promise<void>[] {
    if (!this.viewport) {
      return []
    }

    return Array.from(
      this.warpedMapList.getWarpedMaps({
        geoBbox: this.viewport.geoRectangleBbox
      })
    )
      .filter(
        (warpedMap) => !warpedMap.hasImageInfo() && !warpedMap.loadingImageInfo
      )
      .map((warpedMap) => warpedMap.loadImageInfo())
  }

  protected someImageInfosInViewport(): boolean {
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
      .map((warpedMap) => warpedMap.hasImageInfo())
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

    this.warpedMapList.partialWarpedMapListOptions.projection =
      this.viewport.projection
    this.warpedMapList.setMapsProjection(this.viewport.projection, {
      onlyVisible: false
    })
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

    // Get overview fetchable tiles for all maps in viewport with overview buffer
    // (and set properties for the current viewport for all maps in viewport with prune buffer)
    if (this.shouldAnticipateInteraction()) {
      for (const mapId of mapsInViewportForOverviewPrune) {
        overviewFetchableTilesForViewport.push(
          ...this.getMapOverviewFetchableTilesForViewport(
            mapId,
            [
              ...fetchableTilesForViewport,
              ...overviewFetchableTilesForViewport
            ],
            mapsInViewportForOverviewRequest
          )
        )
      }
    }

    // Request all those fetchable tiles
    this.tileCache.requestFetchableTiles([
      ...fetchableTilesForViewport,
      ...overviewFetchableTilesForViewport
    ])

    this.updateMapsForViewport([
      ...fetchableTilesForViewport,
      ...overviewFetchableTilesForViewport
    ])
    this.pruneTileCache(mapsInViewportForOverviewPrune)
  }

  protected findMapsInViewport(viewportBufferRatio = 0): Set<string> {
    if (!this.viewport) {
      return new Set()
    }
    const viewport = this.viewport

    const projectedGeoBufferedRectangle =
      this.viewport.getProjectedGeoBufferedRectangle(viewportBufferRatio)
    const geoBufferedRectangleBbox = computeBbox(
      projectedGeoBufferedRectangle.map((point) =>
        proj4(
          viewport.projection.definition,
          lonLatProjection.definition,
          point
        )
      )
    )

    return new Set(
      Array.from(
        this.warpedMapList.getWarpedMaps({ geoBbox: geoBufferedRectangleBbox })
      )
        .sort((warpedMapA, warpedMapB) => {
          if (warpedMapA && warpedMapB) {
            return (
              squaredDistance(
                bboxToCenter(warpedMapA.projectedGeoMaskBbox),
                viewport.projectedGeoCenter
              ) -
              squaredDistance(
                bboxToCenter(warpedMapB.projectedGeoMaskBbox),
                viewport.projectedGeoCenter
              )
            )
          } else {
            return 0
          }
        })
        .map((warpedMap) => warpedMap.mapId)
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

    if (!warpedMap.visible) {
      return []
    }

    if (!warpedMap.hasImageInfo()) {
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
      warpedMap.parsedImage.tileZoomLevels,
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
      warpedMap.gcps.length < MAX_GCPS_EXACT_TPS_TO_RESOURCE
        ? warpedMap.projectedTransformer
        : warpedMap.getProjectedTransformer('polynomial')
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
    const tiles = computeTilesCoveringRingAtTileZoomLevel(
      bboxToRectangle(
        resourceBufferedViewportRingBboxAndResourceMaskBboxIntersection
      ),
      tileZoomLevel,
      [warpedMap.parsedImage.width, warpedMap.parsedImage.height]
    )

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
    const fetchableTiles = tiles.map(
      (tile) => new FetchableTile(tile, warpedMap)
    )
    warpedMap.setFetchableTilesForViewport(fetchableTiles)

    return fetchableTiles
  }

  protected getMapOverviewFetchableTilesForViewport(
    mapId: string,
    totalFetchableTilesForViewport: FetchableTile[],
    mapsInViewportForOverviewRequest: Set<string>
  ): FetchableTile[] {
    if (!this.viewport) {
      return []
    }

    const warpedMap = this.warpedMapList.getWarpedMap(mapId)

    if (!warpedMap) {
      return []
    }

    if (!warpedMap.visible) {
      return []
    }

    if (!warpedMap.hasImageInfo()) {
      // Note: don't load image information here
      // this would imply waiting for the first throttling cycle to complete
      // before acting on a sucessful load
      return []
    }

    // No overview tiles if too many fetchable tiles in total already
    const totalFetchableTilesResolution = getTilesResolution(
      totalFetchableTilesForViewport.map((fetchableTile) => fetchableTile.tile)
    )
    const maxTotalFetchableTilesResolution =
      this.viewport.canvasResolution * MAX_TOTAL_RESOLUTION_RATIO

    if (totalFetchableTilesResolution > maxTotalFetchableTilesResolution) {
      return []
    }

    // Find the fitting overview zoomlevel, if any
    const overviewTileZoomLevel = warpedMap.parsedImage.tileZoomLevels
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
    const overviewTiles = getTilesAtScaleFactor(
      overviewTileZoomLevel.scaleFactor,
      warpedMap.parsedImage
    )

    // Make fechable tiles
    const overviewFetchableTiles = overviewTiles.map(
      (tile) => new FetchableTile(tile, warpedMap)
    )
    warpedMap.setOverviewFetchableTilesForViewport(overviewFetchableTiles)

    return overviewFetchableTiles
  }

  protected updateMapsForViewport(tiles: FetchableTile[]): {
    mapsEnteringViewport: string[]
    mapsLeavingViewport: string[]
  } {
    // Sort to process by zIndex later
    this.mapsWithRequestedTilesForViewport = new Set(
      tiles
        .map((tile) => tile.mapId)
        .filter((v, i, a) => {
          // filter out duplicate mapIds
          return a.indexOf(v) === i
        })
        .sort((mapIdA, mapIdB) => {
          const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
          const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
          if (zIndexA !== undefined && zIndexB !== undefined) {
            return zIndexA - zIndexB
          }
          return 0
        })
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
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
      )
    }
    for (const mapId of mapsLeavingViewport) {
      this.clearMap(mapId)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
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

  destroy() {
    this.tileCache.destroy()
    this.warpedMapList.destroy()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected clearMap(mapId: string): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected mapTileRemoved(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected imageInfoLoaded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapAdded(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected warpedMapRemoved(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected preChange(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected optionsChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected gcpsChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected resourceMaskChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected transformationChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected distortionChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected internalProjectionChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected projectionChanged(event: Event): void {}

  protected addEventListeners() {
    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
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
      WarpedMapEventType.PRECHANGE,
      this.preChange.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.OPTIONSCHANGED,
      this.optionsChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.GCPSCHANGED,
      this.gcpsChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.RESOURCEMASKCHANGED,
      this.gcpsChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.DISTORTIONCHANGED,
      this.distortionChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.INTERNALPROJECTIONCHANGED,
      this.internalProjectionChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.PROJECTIONCHANGED,
      this.projectionChanged.bind(this)
    )
  }

  protected removeEventListeners() {
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
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
      WarpedMapEventType.PRECHANGE,
      this.preChange.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.OPTIONSCHANGED,
      this.optionsChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.GCPSCHANGED,
      this.gcpsChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.RESOURCEMASKCHANGED,
      this.gcpsChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.DISTORTIONCHANGED,
      this.distortionChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.INTERNALPROJECTIONCHANGED,
      this.internalProjectionChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.PROJECTIONCHANGED,
      this.projectionChanged.bind(this)
    )
  }
}
