import { equalSet } from '@allmaps/stdlib'

import CacheableTile, { CachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import {
  tileByteSize,
  createKeyFromTile,
  createKeyFromMapIdAndTileUrl,
  fetchableMapTilesToKeys
} from '../shared/tiles.js'
import FetchableMapTile from './FetchableTile.js'

import type { FetchFn } from '@allmaps/types'

import type { CachableTileFactory, TileCacheOptions } from '../shared/types.js'

const MAX_HISTORY_TOTAL_COUNT = 0
const MAX_HISTORY_SIZE = 32 * 1000 * 1000 // size in bytes

/**
 * Class that caches IIIF tiles.
 *
 * @export
 * @class TileCache
 * @typedef {TileCache}
 * @extends {EventTarget}
 */
export default class TileCache<D> extends EventTarget {
  cachableTileFactory: CachableTileFactory<D>
  fetchFn?: FetchFn

  protected tilesByTileUrl: Map<string, CacheableTile<D>> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesFetchingCount = 0

  protected previousRequestedTiles: FetchableMapTile[] = []
  protected outgoingTilesHistory: FetchableMapTile[] = []

  constructor(
    cachableTileFactory: CachableTileFactory<D>,
    options?: Partial<TileCacheOptions>
  ) {
    super()

    this.cachableTileFactory = cachableTileFactory
    this.fetchFn = options?.fetchFn
  }

  /**
   * Get a specific cacheable tile in this cache
   * I.e. independent of whether their fetching is completed and image bitmap is created
   *
   * @param {string} tileUrl - the url of the requested tile
   * @returns {(CacheableTile | undefined)}
   */
  getCacheableTile(tileUrl: string): CacheableTile<D> | undefined {
    return this.tilesByTileUrl.get(tileUrl)
  }

  /**
   * Get a specific cached tile in this cache
   * I.e. with their fetching completed and image bitmap created
   *
   * @param {string} tileUrl - the url of the requested tile
   * @returns {(CachedTile | undefined)}
   */
  getCachedTile(tileUrl: string): CachedTile<D> | undefined {
    const cacheableTile = this.tilesByTileUrl.get(tileUrl)
    if (cacheableTile && cacheableTile.isCachedTile()) {
      return cacheableTile as CachedTile<D>
    }
  }

  /**
   * Get the tiles in this cache (independent of whether their caching has completed)
   *
   * @returns {IterableIterator<CacheableTile>}
   */
  getCacheableTiles(): IterableIterator<CacheableTile<D>> {
    return this.tilesByTileUrl.values()
  }

  /**
   * Get the tiles in this cache whose caching has completed
   *
   * @returns {CacheableTile[]}
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

  getCachedTilesForMapId(mapId: string): CachedTile<D>[] {
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
   * Get the URLs of all tiles in this cache
   *
   * @returns {IterableIterator<string>}
   */
  getTileUrls(): IterableIterator<string> {
    return this.tilesByTileUrl.keys()
  }

  /**
   * Process the request for new tiles to be added to this cache
   *
   * @param {FetchableMapTile[]} requestedTiles
   */
  requestFetchableMapTiles(requestedTiles: FetchableMapTile[]) {
    const previousRequestedTilesKeys = fetchableMapTilesToKeys(
      this.previousRequestedTiles
    )
    const requestedTilesKeys = fetchableMapTilesToKeys(requestedTiles)

    // If previous requested tiles is the same as current requested tiles, don't do anything
    if (equalSet(previousRequestedTilesKeys, requestedTilesKeys)) {
      return
    }

    // Compute outgoing tiles by comparing requested tiles to previous requested tiles
    const outgoingTiles = []
    for (const previousRequestedTile of this.previousRequestedTiles) {
      if (!requestedTilesKeys.has(createKeyFromTile(previousRequestedTile))) {
        outgoingTiles.push(previousRequestedTile)
      }
    }

    // Add outgoing tiles to outgoingTilesHistory
    this.updateOutgoingTilesHistory(outgoingTiles, requestedTiles.length)

    const outgoingTilesHistoryKeys = fetchableMapTilesToKeys(
      this.outgoingTilesHistory
    )

    // TODO: use union() when it becomes official
    const requestedTilesAndOutgoingTilesHistoryKeys = new Set([
      ...requestedTilesKeys,
      ...outgoingTilesHistoryKeys
    ])

    // Remove tiles from cache if not in request (or outgoing tiles history)
    // Loop over all tileUrl's in cache, and the mapId's they are for
    for (const [tileUrl, mapIds] of this.mapIdsByTileUrl) {
      for (const mapId of mapIds) {
        // If the requested tiles (or outgoing tiles history) keys don't include the (mapId, tileUrl) key of the loop
        // remove that (mapId, tileUrl) key from the cache
        if (
          !requestedTilesAndOutgoingTilesHistoryKeys.has(
            createKeyFromMapIdAndTileUrl(mapId, tileUrl)
          )
        ) {
          this.removeMapTile(mapId, tileUrl)
        }
      }
    }

    // Add requested tiles
    // Loop over all requested tiles, and add them (also do this if the cache already contains them, so as to trigger the loading events in addMapTile() which will trigger a rerender etc.)
    for (const requestedTile of requestedTiles) {
      this.addMapTile(requestedTile)
    }

    // Update previous requested tiles
    this.previousRequestedTiles = requestedTiles
  }

  waitUntilAllTilesLoaded(): Promise<void> {
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

  getTileUrlsForMapId(mapId: string) {
    return this.tileUrlsByMapId.get(mapId) || new Set()
  }

  clear() {
    this.tilesByTileUrl = new Map()
    this.mapIdsByTileUrl = new Map()
    this.tileUrlsByMapId = new Map()
    this.tilesFetchingCount = 0
    this.outgoingTilesHistory = []
  }

  dispose() {
    for (const cacheableTile of this.getCacheableTiles()) {
      this.removeEventListenersFromTile(cacheableTile)
    }
  }

  private addMapTile(fetchableMapTile: FetchableMapTile) {
    const mapId = fetchableMapTile.mapId
    const tileUrl = fetchableMapTile.tileUrl

    if (!this.tilesByTileUrl.has(tileUrl)) {
      const cacheableTile = this.cachableTileFactory(
        fetchableMapTile,
        this.fetchFn
      )

      this.addEventListenersToTile(cacheableTile)

      this.tilesByTileUrl.set(tileUrl, cacheableTile)
      this.updateTilesFetchingCount(1)

      // This is an async function that we are not awaiting to continue
      // The results are handled inside the tile using events
      cacheableTile.fetch()
    } else {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.MAPTILELOADED, {
          mapId,
          tileUrl
        })
      )
    }

    this.addTileUrlForMapId(mapId, tileUrl)
    this.addMapIdForTileUrl(mapId, tileUrl)
  }

  private removeMapTile(mapId: string, tileUrl: string) {
    const cacheableTile = this.tilesByTileUrl.get(tileUrl)

    if (!cacheableTile) {
      return
    }

    const mapIds = this.removeMapIdForTileUrl(mapId, tileUrl)
    this.removeTileUrlForMapId(mapId, tileUrl)

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
      new WarpedMapEvent(WarpedMapEventType.MAPTILEREMOVED, {
        mapId,
        tileUrl
      })
    )
  }

  private updateOutgoingTilesHistory(
    outgoingTiles: FetchableMapTile[],
    requestCount: number
  ) {
    // Add outgoing tiles to history:
    // to keep the most relevant tiles when trimming,
    // add the outgoing tiles are at the front of the Array
    // and add the first tiles of this request last
    // (since these are closest to the viewport center and hence more important)
    for (let index = outgoingTiles.length - 1; index >= 0; index--) {
      const fetchableMapTile = outgoingTiles[index]
      this.outgoingTilesHistory.unshift(fetchableMapTile)
    }

    // Make history unique
    this.outgoingTilesHistory = Array.from(new Set(this.outgoingTilesHistory))

    // Trim history based on maximum amounts
    let count = 0
    let size = 0
    let lastSize = 0
    for (const fetchableMapTile of this.outgoingTilesHistory) {
      count += 1
      lastSize = tileByteSize(fetchableMapTile)
      size += lastSize
      if (count + requestCount > MAX_HISTORY_TOTAL_COUNT) {
        count -= 1
        size -= lastSize
        break
      }
      if (size > MAX_HISTORY_SIZE) {
        count -= 1
        size -= lastSize
        break
      }
    }
    this.outgoingTilesHistory = this.outgoingTilesHistory.slice(0, count)
  }

  private tileFetched(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const tileUrl = event.data as string

      this.updateTilesFetchingCount(-1)

      for (const mapId of this.mapIdsByTileUrl.get(tileUrl) || []) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.MAPTILELOADED, {
            mapId,
            tileUrl
          })
        )

        const tileUrls = this.tileUrlsByMapId.get(mapId)
        const firstTileUrl = tileUrls?.values().next().value

        if (firstTileUrl === tileUrl) {
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.FIRSTMAPTILELOADED, {
              mapId,
              tileUrl
            })
          )
        }
      }
    }
  }

  private tileFetchError(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const tileUrl = event.data as string

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

  private addTileUrlForMapId(mapId: string, tileUrl: string) {
    let tileUrls = this.tileUrlsByMapId.get(mapId)

    if (!tileUrls) {
      tileUrls = new Set([tileUrl])
    } else {
      tileUrls.add(tileUrl)
    }

    this.tileUrlsByMapId.set(mapId, tileUrls)

    return tileUrls
  }

  private removeTileUrlForMapId(mapId: string, tileUrl: string) {
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

  private addEventListenersToTile(cacheableTile: CacheableTile<D>) {
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHED,
      this.tileFetched.bind(this)
    )
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHERROR,
      this.tileFetchError.bind(this)
    )
  }

  private removeEventListenersFromTile(cacheableTile: CacheableTile<D>) {
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
