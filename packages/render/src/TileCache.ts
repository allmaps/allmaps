import CacheableTile, { CachedTile, isCachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import FetchableMapTile from './FetchableTile.js'

const MAX_HISTORY_SIZE = 20 * 1000 * 1000 // size in bites
const MAX_HISTORY_LENGTH = 20

export default class TileCache extends EventTarget {
  protected tilesByTileUrl: Map<string, CacheableTile> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesFetchingCount = 0

  protected requestedTilesHistory: FetchableMapTile[] = []

  getCacheableTile(tileUrl: string) {
    return this.tilesByTileUrl.get(tileUrl)
  }

  getCachedTile(tileUrl: string) {
    const cacheableTile = this.tilesByTileUrl.get(tileUrl)
    if (cacheableTile && isCachedTile(cacheableTile)) {
      return cacheableTile as CachedTile
    }
  }

  getCacheableTiles() {
    return this.tilesByTileUrl.values()
  }

  getCachedTiles() {
    const cacheableTiles = Array.from(this.tilesByTileUrl.values())
    const cachedTiles: CachedTile[] = []
    cacheableTiles.forEach((cacheableTile) => {
      if (isCachedTile(cacheableTile)) {
        cachedTiles.push(cacheableTile)
      }
    })
    return cachedTiles
  }

  getTileUrls() {
    return this.tilesByTileUrl.keys()
  }

  requestFetcableMapTiles(requestedTiles: FetchableMapTile[]) {
    // Currently this function is called with fetchableMapTiles of the same map
    // so we don't expect doubles of (mapId, tileUrl) cominations, but that could change.

    // Make set of unique (mapId, tileUrl) cominations that are part of this request
    const requestedTilesKeys = new Set(
      requestedTiles.map((fetchableMapTile) =>
        this.createKey(fetchableMapTile.mapId, fetchableMapTile.tileUrl)
      )
    )
    // Make set of unique (mapId, tileUrl) cominations that are part of the historic requests
    const requestedTilesHistoryKeys = new Set(
      this.requestedTilesHistory.map((fetchableMapTile) =>
        this.createKey(fetchableMapTile.mapId, fetchableMapTile.tileUrl)
      )
    )
    // Make set of unique (mapId, tileUrl) cominations that are part of this request but not of the historic requests
    const requestedTilesAndRequestedTilesHistoryKeys = new Set([
      ...requestedTilesKeys,
      ...requestedTilesHistoryKeys
    ]) // TODO: use union() when it becomes official
    // Make set of unique (mapId, tileUrl) cominations that are new in the request compared to the historic requests
    const requestedTilesKeysNotInHistory = Array.from(
      requestedTilesKeys
    ).filter((key) => !Array.from(requestedTilesHistoryKeys).includes(key))

    // Remove tiles from cache if not in request (or historic request)
    // Loop over all tileUrl's in cache, and the mapId's they are for
    for (const [tileUrl, mapIds] of this.mapIdsByTileUrl) {
      for (const mapId of mapIds) {
        // If the requests (and historic requests) tiles don't include the (mapId, tileUrl) combination of the loop
        // remove that (mapId, tileUrl) combination from the cache
        if (
          !requestedTilesAndRequestedTilesHistoryKeys.has(
            this.createKey(mapId, tileUrl)
          )
        ) {
          this.removeMapTile(mapId, tileUrl)
        }
      }
    }

    // Add requested tiles if not in cache
    // Loop over all requested tiles
    for (const fetchableMapTile of requestedTiles) {
      // If the cache doesn't contain the set tile's tileUrl and mapId, add the requested tile
      if (
        !this.mapIdsByTileUrl
          .get(fetchableMapTile.tileUrl)
          ?.has(fetchableMapTile.mapId)
      ) {
        this.addMapTile(fetchableMapTile)
      }
    }

    // Update historic requests
    const requestedTilesNotInHistory = requestedTiles.filter(
      (fetchableMapTile) =>
        Array.from(requestedTilesKeysNotInHistory).includes(
          this.createKey(fetchableMapTile.mapId, fetchableMapTile.tileUrl)
        )
    )
    this.updateRequestedTilesHistory(requestedTilesNotInHistory)
  }

  updateRequestedTilesHistory(requestedTilesNotInHistory: FetchableMapTile[]) {
    // Add fetchableMapTiles to history:
    // adding items to the front and
    // adding the last requested tiles first
    // such that the first requested tiles are at the start of the array
    for (
      let index = requestedTilesNotInHistory.length - 1;
      index >= 0;
      index--
    ) {
      const fetchableMapTile = requestedTilesNotInHistory[index]
      this.requestedTilesHistory.unshift(fetchableMapTile)
    }

    // Trim history based on maximum amounts
    let count = 0
    let size = 0
    for (const fetchableMapTile of this.requestedTilesHistory) {
      count += 1
      size +=
        (fetchableMapTile.imageRequest.size?.height || 0) *
        (fetchableMapTile.imageRequest.size?.width || 0) *
        3 // RBG, so 3 values per pixel
      if (count >= MAX_HISTORY_LENGTH) {
        break
      }
      if (size >= MAX_HISTORY_SIZE) {
        break
      }
    }
    this.requestedTilesHistory = this.requestedTilesHistory.slice(0, count)
  }

  clear() {
    this.tilesByTileUrl = new Map()
    this.mapIdsByTileUrl = new Map()
    this.tileUrlsByMapId = new Map()
    this.tilesFetchingCount = 0
  }

  private addMapTile(fetchableMapTile: FetchableMapTile) {
    const mapId = fetchableMapTile.mapId
    const tileUrl = fetchableMapTile.tileUrl

    if (!this.tilesByTileUrl.has(tileUrl)) {
      const cacheableTile = new CacheableTile(fetchableMapTile)

      cacheableTile.addEventListener(
        WarpedMapEventType.TILEFETCHED,
        this.tileFetched.bind(this)
      )
      cacheableTile.addEventListener(
        WarpedMapEventType.TILEFETCHERROR,
        this.tileFetchError.bind(this)
      )

      this.tilesByTileUrl.set(tileUrl, cacheableTile)
      this.updateTilesFetchingCount(1)

      // This is an async function that we are not awaiting to continue
      // The results are handled inside the tile using events
      cacheableTile.fetch()
    } else {
      // This should not happen given the way the tiles are added

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

    // If there are no other maps for this tile and it's still fetching, abort the fetch and delete the tile from the cache.
    if (!mapIds.size) {
      if (cacheableTile.fetching) {
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
        // TODO: why delete it if it's not there?
        this.tilesByTileUrl.delete(tileUrl)
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

  // TODO: consider a way to make this more elegant:
  // - many to many datastructures
  // - a new compact class with just these two properties and an equality function between elements
  private createKey(mapId: string, tileUrl: string) {
    return `${mapId}:${tileUrl}`
  }

  private updateTilesFetchingCount(delta: number) {
    this.tilesFetchingCount += delta

    if (this.tilesFetchingCount === 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.ALLREQUESTEDTILESLOADED)
      )
    }
  }
}
