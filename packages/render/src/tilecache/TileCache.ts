import { equalSet } from '@allmaps/stdlib'

import { CacheableTile, CachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import { shouldPruneTile } from '../shared/tiles.js'
import { FetchableTile } from './FetchableTile.js'

import type { FetchFn } from '@allmaps/types'

import type {
  CachableTileFactory,
  TileCacheOptions,
  MapPruneInfo
} from '../shared/types.js'

const PRUNE_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 4
const PRUNE_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 2

/**
 * Class that fetches and caches IIIF tiles.
 */
export class TileCache<D> extends EventTarget {
  cachableTileFactory: CachableTileFactory<D>
  fetchFn?: FetchFn

  protected tilesByTileUrl: Map<string, CacheableTile<D>> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesFetchingCount = 0

  protected fetchableTiles: FetchableTile[] = []

  constructor(
    cachableTileFactory: CachableTileFactory<D>,
    partialTileCacheOptions?: Partial<TileCacheOptions>
  ) {
    super()

    this.setOptions(partialTileCacheOptions)

    this.cachableTileFactory = cachableTileFactory
  }

  /**
   * Get the tiles in this cache
   *
   * @returns
   */
  getCacheableTiles(): IterableIterator<CacheableTile<D>> {
    return this.tilesByTileUrl.values()
  }

  /**
   * Get a specific tile in this cache
   *
   * @param tileUrl - the URL of the requested tile
   * @returns
   */
  getCacheableTile(tileUrl: string): CacheableTile<D> | undefined {
    return this.tilesByTileUrl.get(tileUrl)
  }

  /**
   * Get the tiles in this cache, corresponding to a specific map
   *
   * @param mapId - ID of the map
   * @returns
   */
  getMapCacheableTiles(mapId: string): CacheableTile<D>[] {
    const cacheableTiles: CacheableTile<D>[] = []

    for (const cacheableTile of this.tilesByTileUrl.values()) {
      if (this.tileUrlsByMapId.get(mapId)?.has(cacheableTile.tileUrl)) {
        cacheableTiles.push(cacheableTile)
      }
    }

    return cacheableTiles
  }

  /**
   * Get the tiles in this cache that have been fetched
   *
   * @returns
   */
  getCachedTiles(): CachedTile<D>[] {
    const cachedTiles: CachedTile<D>[] = []

    for (const cacheableTile of this.tilesByTileUrl.values()) {
      if (cacheableTile.isCachedTile()) {
        cachedTiles.push(cacheableTile)
      }
    }

    return cachedTiles
  }

  /**
   * Get a specific cached tile in this cache that has been fetched
   *
   * @param tileUrl - the URL of the requested tile
   * @returns
   */
  getCachedTile(tileUrl: string): CachedTile<D> | undefined {
    const cacheableTile = this.tilesByTileUrl.get(tileUrl)
    if (cacheableTile && cacheableTile.isCachedTile()) {
      return cacheableTile as CachedTile<D>
    }
  }

  /**
   * Get the tiles in this cache, corresponding to a specific map, that have been fetched
   *
   * @param mapId - ID of the map
   * @returns
   */
  getMapCachedTiles(mapId: string): CachedTile<D>[] {
    const cachedTiles: CachedTile<D>[] = []

    for (const cacheableTile of this.tilesByTileUrl.values()) {
      if (
        cacheableTile.isCachedTile() &&
        this.tileUrlsByMapId.get(mapId)?.has(cacheableTile.tileUrl)
      ) {
        cachedTiles.push(cacheableTile)
      }
    }

    return cachedTiles
  }

  /**
   * Get the URLs of tiles in this cache
   *
   * @returns
   */
  getTileUrls(): IterableIterator<string> {
    return this.tilesByTileUrl.keys()
  }

  /**
   * Get the URLs of tiles in this cache, corresponding to a specific map
   *
   * @param mapId - ID of the map
   * @returns
   */
  getMapTileUrls(mapId: string) {
    return this.tileUrlsByMapId.get(mapId) || new Set()
  }

  /**
   * Get the Tile Cache options
   *
   * @param partialTileCacheOptions - Options
   */
  setOptions(partialTileCacheOptions?: Partial<TileCacheOptions>) {
    this.fetchFn = partialTileCacheOptions?.fetchFn
  }

  // TODO: this function needs a new name!
  /**
   * Process the request for new tiles to be added to this cache
   *
   * @param fetchableTiles
   */
  requestFetchableTiles(fetchableTiles: FetchableTile[]) {
    const previousKeys = new Set(
      this.fetchableTiles.map((fetchableTile) => fetchableTile.fetchableTileKey)
    )
    const keys = new Set(
      fetchableTiles.map((fetchableTile) => fetchableTile.fetchableTileKey)
    )

    // If the keys are the same as the previous ones, don't do anything
    // TODO: replace with Set equality once supported
    if (equalSet(previousKeys, keys)) {
      return
    }

    // Loop over all tiles, and add them (also do this if the cache already contains them,
    // so as to trigger the loading events which will trigger a rerender etc.)
    for (const fetchableTile of fetchableTiles) {
      this.requestFetchableTile(fetchableTile)
    }

    this.fetchableTiles = fetchableTiles
  }

  /**
   * Returns a promise that resolves when all requested tiles are loaded.
   * This could happen immidiately, in case there are no ongoing requests and the tilesFetchingCount is zero,
   * or in a while, when the count reaches zero and the ALLREQUESTEDTILESLOADED event is fired.
   */
  async allRequestedTilesLoaded(): Promise<void> {
    return new Promise((resolve) => {
      if (this.finished) {
        resolve()
      } else {
        const listener = () => {
          this.removeEventListener(
            WarpedMapEventType.ALLREQUESTEDTILESLOADED,
            listener
          )
          resolve()
        }
        this.addEventListener(
          WarpedMapEventType.ALLREQUESTEDTILESLOADED,
          listener
        )
      }
    })
  }

  /**
   * Prune tiles in this cache using the provided prune info
   */
  prune(pruneInfoByMapId: Map<string, MapPruneInfo>) {
    for (const [tileUrl, mapIds] of this.mapIdsByTileUrl.entries()) {
      for (const mapId of mapIds) {
        const pruneInfo = pruneInfoByMapId.get(mapId)
        const tile = this.tilesByTileUrl.get(tileUrl)?.tile

        if (tile) {
          // Prune for each mapId that doesn't have pruneInfo
          // Or for which it should be pruned
          if (
            !pruneInfo ||
            shouldPruneTile(tile, pruneInfo, {
              maxHigherLog2ScaleFactorDiff:
                PRUNE_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF,
              maxLowerLog2ScaleFactorDiff:
                PRUNE_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF
            })
          ) {
            this.removeCacheableTileForMapId(tileUrl, mapId)
          }
        }
      }
    }
  }

  clear() {
    for (const cacheableTile of this.getCacheableTiles()) {
      cacheableTile.abort()
      this.removeEventListenersFromCacheableTile(cacheableTile)
    }

    this.tilesByTileUrl = new Map()
    this.mapIdsByTileUrl = new Map()
    this.tileUrlsByMapId = new Map()
    this.tilesFetchingCount = 0
  }

  destroy() {
    this.clear()
  }

  private requestFetchableTile(fetchableTile: FetchableTile) {
    const mapId = fetchableTile.mapId
    const tileUrl = fetchableTile.tileUrl

    if (!this.tilesByTileUrl.has(tileUrl)) {
      const cacheableTile = this.cachableTileFactory(
        fetchableTile,
        this.fetchFn
      )
      this.addEventListenersToCacheableTile(cacheableTile)

      this.addCacheableTile(cacheableTile)
    } else {
      const cachedTile = this.tilesByTileUrl.get(tileUrl)
      if (cachedTile?.isCachedTile()) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.MAPTILELOADED, {
            mapIds: [mapId],
            tileUrl
          })
        )
      }
    }

    this.addTileUrlForMapId(tileUrl, mapId)
    this.addMapIdForTileUrl(mapId, tileUrl)
  }

  private addCacheableTile(cacheableTile: CacheableTile<D>) {
    this.tilesByTileUrl.set(cacheableTile.tileUrl, cacheableTile)

    // This is an async function that we are not awaiting to continue
    // The results are handled inside the tile using events
    cacheableTile.fetch()
    this.updateTilesFetchingCount(1)
  }

  private removeCacheableTileForMapId(tileUrl: string, mapId: string) {
    const cacheableTile = this.tilesByTileUrl.get(tileUrl)

    if (!cacheableTile) {
      return
    }

    const mapIds = this.removeMapIdForTileUrl(mapId, tileUrl)
    this.removeTileUrlForMapId(tileUrl, mapId)

    // If there are no other maps for this tile and it's still fetching,
    // abort the fetch and delete the tile from the cache.
    if (!mapIds.size) {
      if (!cacheableTile.isCachedTile()) {
        // Cancel fetch if tile is still being fetched
        cacheableTile.abort()
        this.updateTilesFetchingCount(-1)
      }

      this.tilesByTileUrl.delete(tileUrl)
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.MAPTILEDELETED, {
        mapIds: [mapId],
        tileUrl
      })
    )
  }

  private tileFetched(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.tileUrl) {
        throw new Error('Event data missing')
      }
      const { tileUrl } = event.data

      this.updateTilesFetchingCount(-1)

      for (const mapId of this.mapIdsByTileUrl.get(tileUrl) || []) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.MAPTILELOADED, {
            mapIds: [mapId],
            tileUrl
          })
        )

        const tileUrls = this.tileUrlsByMapId.get(mapId)
        const firstTileUrl = tileUrls?.values().next().value

        if (firstTileUrl === tileUrl) {
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.FIRSTMAPTILELOADED, {
              mapIds: [mapId],
              tileUrl
            })
          )
        }
      }
    }
  }

  private tileFetchError(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.tileUrl) {
        throw new Error('Event data missing')
      }
      const { tileUrl } = event.data

      if (!this.tilesByTileUrl.has(tileUrl)) {
        this.updateTilesFetchingCount(-1)
      }
    }
  }

  private addMapIdForTileUrl(mapId: string, tileUrl: string) {
    let mapIds = this.mapIdsByTileUrl.get(tileUrl)

    if (!mapIds) {
      mapIds = new Set([mapId])
    } else {
      mapIds.add(mapId)
    }

    this.mapIdsByTileUrl.set(tileUrl, mapIds)

    return mapIds
  }

  private removeMapIdForTileUrl(mapId: string, tileUrl: string) {
    const mapIds = this.mapIdsByTileUrl.get(tileUrl)

    if (!mapIds) {
      return new Set()
    } else {
      mapIds.delete(mapId)
    }

    if (!mapIds.size) {
      this.mapIdsByTileUrl.delete(tileUrl)
    } else {
      this.mapIdsByTileUrl.set(tileUrl, mapIds)
    }

    return mapIds
  }

  private addTileUrlForMapId(tileUrl: string, mapId: string) {
    let tileUrls = this.tileUrlsByMapId.get(mapId)

    if (!tileUrls) {
      tileUrls = new Set([tileUrl])
    } else {
      tileUrls.add(tileUrl)
    }

    this.tileUrlsByMapId.set(mapId, tileUrls)

    return tileUrls
  }

  private removeTileUrlForMapId(tileUrl: string, mapId: string) {
    const tileUrls = this.tileUrlsByMapId.get(mapId)

    if (!tileUrls) {
      return new Set()
    } else {
      tileUrls.delete(tileUrl)

      if (!tileUrls.size) {
        this.tileUrlsByMapId.delete(mapId)
      } else {
        this.tileUrlsByMapId.set(mapId, tileUrls)
      }

      return tileUrls
    }
  }

  get finished() {
    return this.tilesFetchingCount === 0
  }

  private updateTilesFetchingCount(delta: number) {
    this.tilesFetchingCount += delta

    if (this.tilesFetchingCount === 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.ALLREQUESTEDTILESLOADED)
      )
    }
  }

  private addEventListenersToCacheableTile(cacheableTile: CacheableTile<D>) {
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHED,
      this.tileFetched.bind(this)
    )
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHERROR,
      this.tileFetchError.bind(this)
    )
  }

  private removeEventListenersFromCacheableTile(
    cacheableTile: CacheableTile<D>
  ) {
    cacheableTile.removeEventListener(
      WarpedMapEventType.TILEFETCHED,
      this.tileFetched.bind(this)
    )
    cacheableTile.removeEventListener(
      WarpedMapEventType.TILEFETCHERROR,
      this.tileFetchError.bind(this)
    )
  }
}
