import { equalSet } from '@allmaps/stdlib'

import { CacheableTile, CachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import { FetchableTile } from './FetchableTile.js'

import type { FetchFn } from '@allmaps/types'

import type {
  CacheableTileFactory,
  TileCacheOptions,
  MapPruneInfo
} from '../shared/types.js'

const PRUNE_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 4
const PRUNE_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 2

/**
 * Class that fetches and caches IIIF tiles.
 */
export class TileCache<D> extends EventTarget {
  cacheableTileFactory: CacheableTileFactory<D>
  fetchFn?: FetchFn
  tileCacheForTilesFromSprites?: TileCache<D>

  protected tilesByTileUrl: Map<string, CacheableTile<D>> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesFetchingCount = 0

  protected fetchableTiles: FetchableTile[] = []

  constructor(
    cacheableTileFactory: CacheableTileFactory<D>,
    partialTileCacheOptions?: Partial<TileCacheOptions<D>>
  ) {
    super()

    this.setOptions(partialTileCacheOptions)

    this.cacheableTileFactory = cacheableTileFactory
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
    const tileUrls = this.tileUrlsByMapId.get(mapId)

    if (tileUrls) {
      for (const tileUrl of tileUrls) {
        const cacheableTile = this.tilesByTileUrl.get(tileUrl)
        if (cacheableTile) {
          cacheableTiles.push(cacheableTile)
        }
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
    const tileUrls = this.tileUrlsByMapId.get(mapId)

    if (tileUrls) {
      for (const tileUrl of tileUrls) {
        const cacheableTile = this.tilesByTileUrl.get(tileUrl)
        if (cacheableTile && cacheableTile.isCachedTile()) {
          cachedTiles.push(cacheableTile)
        }
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
  setOptions(partialTileCacheOptions?: Partial<TileCacheOptions<D>>) {
    this.fetchFn = partialTileCacheOptions?.fetchFn
    this.tileCacheForTilesFromSprites =
      partialTileCacheOptions?.tileCacheForSprites
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
        const cacheableTile = this.tilesByTileUrl.get(tileUrl)

        if (cacheableTile) {
          if (
            cacheableTile.shouldPrune(pruneInfo, {
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

  protected requestFetchableTile(fetchableTile: FetchableTile) {
    const mapId = fetchableTile.mapId
    const tileUrl = fetchableTile.tileUrl

    if (!this.tilesByTileUrl.has(tileUrl)) {
      const cacheableTile = this.cacheableTileFactory(
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

  protected addCacheableTile(cacheableTile: CacheableTile<D>) {
    this.tilesByTileUrl.set(cacheableTile.fetchableTile.tileUrl, cacheableTile)

    // This is an async function that we are not awaiting to continue
    // The results are handled inside the tile using events
    cacheableTile.fetch()
    this.updateTilesFetchingCount(1)
  }

  // Directly add cached tiles created from sprites
  addCachedTile(cachedTile: CachedTile<D>) {
    const mapId = cachedTile.fetchableTile.mapId
    const tileUrl = cachedTile.fetchableTile.tileUrl

    if (this.tilesByTileUrl.has(tileUrl)) {
      return
    }
    this.tilesByTileUrl.set(tileUrl, cachedTile)
    this.addTileUrlForMapId(tileUrl, mapId)
    this.addMapIdForTileUrl(mapId, tileUrl)

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.MAPTILELOADED, {
        mapIds: [mapId],
        tileUrl
      })
    )
  }

  protected removeCacheableTileForMapId(tileUrl: string, mapId: string) {
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

  protected tileFetched(event: Event) {
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

      // If this is a spritesTileChache
      if (this.tileCacheForTilesFromSprites) {
        this.tilesByTileUrl.get(tileUrl)?.applySprites()
      }
    }
  }

  protected tileFetchError(event: Event) {
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

  // If this is a spritesTileChache
  protected tilesFromSpriteTile(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.tileUrl) {
        throw new Error('Event data missing')
      }
      const { tileUrl } = event.data

      this.passTilesFromSprites(tileUrl)
    }
  }

  // If this is a spritesTileChache
  protected passTilesFromSprites(tileUrl?: string) {
    let cacheableSpritesTiles: CacheableTile<D>[]
    if (!tileUrl) {
      cacheableSpritesTiles = Array.from(this.getCacheableTiles())
    } else {
      const cacheableSpritesTile = this.tilesByTileUrl.get(tileUrl)
      cacheableSpritesTiles = cacheableSpritesTile ? [cacheableSpritesTile] : []
    }

    for (const cacheableSpritesTile of cacheableSpritesTiles) {
      const cachedTilesFromSprites =
        cacheableSpritesTile.getCachedTilesFromSprites()
      if (!cachedTilesFromSprites) {
        throw new Error('Cached tiles from sprites not found')
      }
      for (const cachedTile of cachedTilesFromSprites) {
        if (!cachedTile.isCachedTile()) {
          break
        }
        this.tileCacheForTilesFromSprites?.addCachedTile(cachedTile)
      }
      const mapIds = cachedTilesFromSprites.map(
        (cachedTile) => cachedTile.fetchableTile.mapId
      )
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.MAPTILESLOADEDFROMSPRITES, {
          mapIds,
          spritesInfo: cacheableSpritesTile.fetchableTile.options?.spritesInfo
        })
      )
    }
  }

  protected addMapIdForTileUrl(mapId: string, tileUrl: string) {
    let mapIds = this.mapIdsByTileUrl.get(tileUrl)

    if (!mapIds) {
      mapIds = new Set([mapId])
    } else {
      mapIds.add(mapId)
    }

    this.mapIdsByTileUrl.set(tileUrl, mapIds)

    return mapIds
  }

  protected removeMapIdForTileUrl(mapId: string, tileUrl: string) {
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

  protected addTileUrlForMapId(tileUrl: string, mapId: string) {
    let tileUrls = this.tileUrlsByMapId.get(mapId)

    if (!tileUrls) {
      tileUrls = new Set([tileUrl])
    } else {
      tileUrls.add(tileUrl)
    }

    this.tileUrlsByMapId.set(mapId, tileUrls)

    return tileUrls
  }

  protected removeTileUrlForMapId(tileUrl: string, mapId: string) {
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

  protected updateTilesFetchingCount(delta: number) {
    this.tilesFetchingCount += delta

    if (this.tilesFetchingCount === 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.ALLREQUESTEDTILESLOADED)
      )
    }
  }

  protected addEventListenersToCacheableTile(cacheableTile: CacheableTile<D>) {
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHED,
      this.tileFetched.bind(this)
    )
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHERROR,
      this.tileFetchError.bind(this)
    )
    cacheableTile.addEventListener(
      WarpedMapEventType.TILESFROMSPRITETILE,
      this.tilesFromSpriteTile.bind(this)
    )
  }

  protected removeEventListenersFromCacheableTile(
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
    cacheableTile.removeEventListener(
      WarpedMapEventType.TILESFROMSPRITETILE,
      this.tilesFromSpriteTile.bind(this)
    )
  }
}
