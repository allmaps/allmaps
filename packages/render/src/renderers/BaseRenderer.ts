import TileCache from '../tilecache/TileCache.js'
import WarpedMapList from '../maps/WarpedMapList.js'
import FetchableTile from '../tilecache/FetchableTile.js'

import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import {
  getBestTileZoomLevelForScale,
  computeTilesCoveringRingAtTileZoomLevel,
  getTileResolution,
  getOverviewTileZoomLevel,
  getTilesAtScaleFactor
} from '../shared/tiles.js'

import {
  distance,
  bboxToDiameter,
  bboxToCenter,
  computeBbox,
  webMercatorToLonLat
} from '@allmaps/stdlib'

import type Viewport from '../viewport/Viewport.js'
import type WarpedMap from '../maps/WarpedMap.js'
import type {
  CachableTileFactory,
  WarpedMapFactory,
  RendererOptions,
  PruneInfoByMapId
} from '../shared/types.js'

const MANY_POSSIBLE_MAPS = 20 // For this amount of maps, request tiles

const POSSIBLE_MAPS_VIEWPORT_BUFFER_RATIO = 1
const TILE_REQUEST_VIEWPORT_BUFFER_RATIO = 0

const MIN_VIEWPORT_DIAMETER = 5

/**
 * 0 = no correction, -1 = shaper, +1 = less sharp
 * Normal has more effect on smaller scale factors
 * Log2 (i.e. per zoomlevel) has equal effect all scale factors
 */
const SCALE_FACTOR_CORRECTION = 1
const LOG2_SCALE_FACTOR_CORRECTION = 0

const MAX_MAP_OVERVIEW_RESOLUTION = 1024 * 1024 // Support 1024 tiles, e.g. for Rotterdam map.
const MAX_TOTAL_RESOLUTION =
  MANY_POSSIBLE_MAPS * MAX_MAP_OVERVIEW_RESOLUTION * 50

/**
 * Abstract base class for renderers.
 *
 * @export
 * @abstract
 * @template {WarpedMap} W
 * @template D
 * @class BaseRenderer
 * @typedef {BaseRenderer}
 * @extends {EventTarget}
 */
export default abstract class BaseRenderer<
  W extends WarpedMap,
  D
> extends EventTarget {
  warpedMapList: WarpedMapList<W>
  tileCache: TileCache<D>

  mapsInViewport: Set<string> = new Set()
  possibleMapsInViewport: Set<string> = new Set()
  protected viewport: Viewport | undefined

  constructor(
    cachableTileFactory: CachableTileFactory<D>,
    warpedMapFactory: WarpedMapFactory<W>,
    options?: Partial<RendererOptions>
  ) {
    super()

    this.tileCache = new TileCache(cachableTileFactory, options)
    this.warpedMapList = new WarpedMapList(warpedMapFactory, options)
  }

  /**
   * Parses an annotation and adds its georeferenced map to this renderer's warped map list
   *
   * @async
   * @param {unknown} annotation
   * @returns {Promise<(string | Error)[]>}
   */
  async addGeoreferenceAnnotation(annotation: unknown) {
    return this.warpedMapList.addGeoreferenceAnnotation(annotation)
  }

  /**
   * Adds a georeferenced map to this renderer's warped map list
   *
   * @async
   * @param {unknown} georeferencedMap
   * @returns {Promise<string | Error>}
   */
  async addGeoreferencedMap(georeferencedMap: unknown) {
    return this.warpedMapList.addGeoreferencedMap(georeferencedMap)
  }

  protected loadMissingImageInfosInViewport(): Promise<void>[] {
    if (!this.viewport) {
      return []
    }

    return Array.from(
      this.warpedMapList.getMapsByGeoBbox(this.viewport.geoRectangleBbox)
    )
      .map((mapId) => this.warpedMapList.getWarpedMap(mapId) as WarpedMap)
      .filter(
        (warpedMap) => !warpedMap.hasImageInfo() && !warpedMap.loadingImageInfo
      )
      .map((warpedMap) => warpedMap.loadImageInfo())
  }

  protected someImageInfosInViewport(): boolean {
    if (!this.viewport) {
      return false
    }

    return Array.from(
      this.warpedMapList.getMapsByGeoBbox(this.viewport.geoRectangleBbox)
    )
      .map((mapId) => this.warpedMapList.getWarpedMap(mapId) as WarpedMap)
      .map((warpedMap) => warpedMap.hasImageInfo())
      .some(Boolean)
  }

  protected shouldUpdateRequestedTiles() {
    return true
  }

  protected updateRequestedTiles(): void {
    if (!this.viewport) {
      return
    }

    const viewport = this.viewport

    if (!this.shouldUpdateRequestedTiles()) {
      return
    }

    this.possibleMapsInViewport = this.getPossibleMapsInViewport(
      POSSIBLE_MAPS_VIEWPORT_BUFFER_RATIO
    )
    // If you find more then many maps, look again without buffering
    // Note: don't just take the first MANY_POSSIBLE_MAPS, since there might be more needed
    if (this.possibleMapsInViewport.size > MANY_POSSIBLE_MAPS) {
      this.possibleMapsInViewport = this.getPossibleMapsInViewport(0)
    }

    const requestedTiles: FetchableTile[] = []
    const requestedOverviewTiles: FetchableTile[] = []

    for (const mapId of this.possibleMapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      if (!warpedMap.visible) {
        continue
      }

      if (!warpedMap.hasImageInfo()) {
        // Note: don't load image information here
        // this would imply waiting for the first throttling cycle to complete
        // before acting on a sucessful load
        continue
      }

      // Only draw maps that are larger than MIN_VIEWPORT_DIAMETER pixels are returned
      // Note that diameter is equivalent to geometryToDiameter(warpedMap.projectedGeoMask) / this.viewport.projectedGeoPerViewportScale
      if (
        bboxToDiameter(warpedMap.getViewportMaskBbox(viewport)) <
        MIN_VIEWPORT_DIAMETER
      ) {
        continue
      }

      // Find bestTileZoomLevel for current viewport
      const bestTileZoomLevel = getBestTileZoomLevelForScale(
        warpedMap.parsedImage.tileZoomLevels,
        warpedMap.getResourceToCanvasScale(viewport),
        SCALE_FACTOR_CORRECTION,
        LOG2_SCALE_FACTOR_CORRECTION
      )
      warpedMap.setCurrentBestScaleFactor(bestTileZoomLevel.scaleFactor)
      // Note the equivalence of the following two:
      // - warpedMap.getApproxResourceToCanvasScale(this.viewport)
      // - warpedMap.resourceToProjectedGeoScale * this.viewport.projectedGeoPerCanvasScale

      // Transforming the viewport back to resource
      const transformerOptions = {
        maxDepth: 0,
        // maxDepth: 2,
        // maxOffsetRatio: 0.00001,
        sourceIsGeographic: false,
        destinationIsGeographic: true
      }
      // This can be expensive at high maxDepth and seems to work fine with maxDepth = 0
      // TODO: Consider recusive refinement via options like {maxOffsetRatio: 0.00001, maxDepth: 2}
      // Note: if recursive refinement, use geographic distances and midpoints for lon-lat destination points
      const resourceViewportRing =
        warpedMap.projectedTransformer.transformBackward(
          [
            viewport.getProjectedGeoBufferedRectangle(
              this.possibleMapsInViewport.size < MANY_POSSIBLE_MAPS
                ? TILE_REQUEST_VIEWPORT_BUFFER_RATIO
                : 0
            )
          ],
          transformerOptions
        )[0]
      warpedMap.setCurrentResourceViewportRing(resourceViewportRing)

      // Find tiles covering this back-transformed viewport
      const tiles = computeTilesCoveringRingAtTileZoomLevel(
        resourceViewportRing,
        bestTileZoomLevel,
        [warpedMap.parsedImage.width, warpedMap.parsedImage.height]
      )
      // This returns tiles sorted by distance from center of resourceViewportRing

      // Make fetchable tiles and add to requested
      const fetchableTiles = tiles.map(
        (tile) => new FetchableTile(tile, warpedMap)
      )
      warpedMap.setCurrentFetchableTiles(fetchableTiles)
      requestedTiles.push(...fetchableTiles)

      // If there's a fit overview level
      // and we have not reached our maximum
      // request overview tiles too
      const overviewTileZoomLevel = getOverviewTileZoomLevel(
        warpedMap.parsedImage.tileZoomLevels,
        bestTileZoomLevel.scaleFactor,
        MAX_MAP_OVERVIEW_RESOLUTION,
        this.warpedMapList.warpedMapsById.size > MANY_POSSIBLE_MAPS
      )

      warpedMap.setCurrentOverviewTileZoomLevel(overviewTileZoomLevel)
      const totalResolution = [...requestedTiles, ...requestedOverviewTiles]
        .map((fetchableTile) => getTileResolution(fetchableTile.tile))
        .reduce((a, c) => a + c, 0)

      if (overviewTileZoomLevel && totalResolution <= MAX_TOTAL_RESOLUTION) {
        const overviewTiles = getTilesAtScaleFactor(
          overviewTileZoomLevel.scaleFactor,
          warpedMap.parsedImage
        )

        const overviewFetchableTiles = overviewTiles.map(
          (tile) => new FetchableTile(tile, warpedMap)
        )
        warpedMap.setCurrentOverviewFetchableTiles(overviewFetchableTiles)
        requestedOverviewTiles.push(...overviewFetchableTiles)
      }
    }

    this.tileCache.requestFetchableTiles([
      ...requestedTiles,
      ...requestedOverviewTiles
    ])

    this.updateMapsInViewport(requestedTiles)
    this.pruneTileCache()
  }

  protected getPossibleMapsInViewport(
    viewportBufferRatio: number
  ): Set<string> {
    if (!this.viewport) {
      return new Set()
    }

    const viewport = this.viewport

    const projectedGeoBufferedRectangle =
      this.viewport.getProjectedGeoBufferedRectangle(viewportBufferRatio)
    const geoBufferedRectangleBbox = computeBbox(
      projectedGeoBufferedRectangle.map((point) => webMercatorToLonLat(point))
    )

    // Note: simplify this if RTree would ever by in projectedGeo instead of Geo coordinates
    return new Set(
      Array.from(
        this.warpedMapList.getMapsByGeoBbox(geoBufferedRectangleBbox)
      ).sort((mapIdA, mapIdB) => {
        const warpedMapA = this.warpedMapList.getWarpedMap(mapIdA)
        const warpedMapB = this.warpedMapList.getWarpedMap(mapIdB)
        if (warpedMapA && warpedMapB) {
          return (
            distance(bboxToCenter(warpedMapA.geoMaskBbox), viewport.geoCenter) -
            distance(bboxToCenter(warpedMapB.geoMaskBbox), viewport.geoCenter)
          )
        } else {
          return 0
        }
      })
    )
  }

  protected updateMapsInViewport(tiles: FetchableTile[]) {
    // TODO: handle everything as Set() once JS supports filter on sets.
    // And speed up with anonymous functions with the Set.prototype.difference() once broadly supported
    const oldMapsInViewportAsArray = Array.from(this.mapsInViewport)
    const newMapsInViewportAsArray = tiles
      .map((tile) => tile.mapId)
      .filter((v, i, a) => {
        // filter out duplicate mapIds
        return a.indexOf(v) === i
      })

    // Sort to process by zIndex later
    this.mapsInViewport = new Set(
      newMapsInViewportAsArray.sort((mapIdA, mapIdB) => {
        const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
        const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }
        return 0
      })
    )

    const enteringMapsInViewport = newMapsInViewportAsArray.filter(
      (mapId) => !oldMapsInViewportAsArray.includes(mapId)
    )
    const leavingMapsInViewport = oldMapsInViewportAsArray.filter(
      (mapId) => !newMapsInViewportAsArray.includes(mapId)
    )

    for (const mapId of enteringMapsInViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
      )
    }
    for (const mapId of leavingMapsInViewport) {
      this.clearMapTextures(mapId)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
      )
    }
  }

  protected pruneTileCache() {
    const pruneInfoByMapId: PruneInfoByMapId = new Map()
    for (const warpedMap of this.warpedMapList.getWarpedMaps(
      this.possibleMapsInViewport
    )) {
      pruneInfoByMapId.set(warpedMap.mapId, {
        bestScaleFactor: warpedMap.currentBestScaleFactor,
        overviewScaleFactor:
          warpedMap.currentOverviewTileZoomLevel?.scaleFactor,
        resourceViewportRingBbox: warpedMap.currentResourceViewportRingBbox
      })
    }
    this.tileCache.prune(pruneInfoByMapId)
  }

  destroy() {
    this.tileCache.destroy()
    this.warpedMapList.destroy()
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected clearMapTextures(mapId: string): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
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
  protected transformationChanged(event: Event): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
  protected distortionChanged(event: Event): void {}

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
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.DISTORTIONCHANGED,
      this.distortionChanged.bind(this)
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
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.DISTORTIONCHANGED,
      this.distortionChanged.bind(this)
    )
  }
}
