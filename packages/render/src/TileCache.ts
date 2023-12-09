import CacheableTile, { CachedTile, isCachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import { tileByteSize } from './shared/tiles.js'
import FetchableMapTile from './FetchableTile.js'

const MAX_HISTORY_SIZE = 32 * 1000 * 1000 // size in bites

export default class TileCache extends EventTarget {
  protected tilesByTileUrl: Map<string, CacheableTile> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesFetchingCount = 0

  protected previousRequestedTiles: FetchableMapTile[] = []
  protected outgoingTilesHistory: FetchableMapTile[] = []

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
    // Make set of unique (mapId, tileUrl) keys that are part of this request
    const requestedTilesKeys = new Set(
      requestedTiles.map((fetchableMapTile) =>
        this.createKey(fetchableMapTile.mapId, fetchableMapTile.tileUrl)
      )
    )

    // Compute outgoing tiles by comparing requested tiles to previous requested tiles
    const outgoingTiles = []
    for (const requestedTile of this.previousRequestedTiles) {
      // If the requested tiles doesn't contain the set previous requested tile's tileUrl and mapId, add the previous requested tile as outgoing tile
      if (
        !requestedTilesKeys.has(
          this.createKey(requestedTile.mapId, requestedTile.tileUrl)
        )
      ) {
        outgoingTiles.push(requestedTile)
      }
    }

    // Add outgoing tiles to outgoingTilesHistory
    this.updateOutgoingTilesHistory(outgoingTiles)

    // Make set of unique (mapId, tileUrl) keys that are part of the outgoing tiles history
    const outgoingTilesHistoryKeys = new Set(
      this.outgoingTilesHistory.map((fetchableMapTile) =>
        this.createKey(fetchableMapTile.mapId, fetchableMapTile.tileUrl)
      )
    )
    // Make set of unique (mapId, tileUrl) keys that are part of one of the above
    const requestedTilesAndOutgoingTilesHistoryKeys = new Set([
      ...requestedTilesKeys,
      ...outgoingTilesHistoryKeys
    ]) // TODO: use union() when it becomes official

    // Remove tiles from cache if not in request (or outgoing tiles history)
    // Loop over all tileUrl's in cache, and the mapId's they are for
    for (const [tileUrl, mapIds] of this.mapIdsByTileUrl) {
      for (const mapId of mapIds) {
        // If the requested tiles (or outgoing tiles history) keys don't include the (mapId, tileUrl) key of the loop
        // remove that (mapId, tileUrl) key from the cache
        if (
          !requestedTilesAndOutgoingTilesHistoryKeys.has(
            this.createKey(mapId, tileUrl)
          )
        ) {
          this.removeMapTile(mapId, tileUrl)
        }
      }
    }

    // Add requested tiles if not in cache
    // Loop over all requested tiles
    for (const requestedTile of requestedTiles) {
      // If the cache doesn't contain the set tile's tileUrl and mapId, add the requested tile
      if (
        !this.mapIdsByTileUrl
          .get(requestedTile.tileUrl)
          ?.has(requestedTile.mapId)
      ) {
        this.addMapTile(requestedTile)
      }
    }

    // Update previous requested tiles
    this.previousRequestedTiles = requestedTiles
  }

  updateOutgoingTilesHistory(outgoingTiles: FetchableMapTile[]) {
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
    for (const fetchableMapTile of this.outgoingTilesHistory) {
      count += 1
      size += tileByteSize(fetchableMapTile)
      // if (count >= MAX_HISTORY_LENGTH) {
      //   break
      // }
      if (size >= MAX_HISTORY_SIZE) {
        break
      }
    }
    this.outgoingTilesHistory = this.outgoingTilesHistory.slice(0, count)
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
      const cacheableTile = new CacheableTile(fetchableMapTile)

      this.addEventListenersToTile(cacheableTile)

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

  private addEventListenersToTile(cacheableTile: CacheableTile) {
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHED,
      this.tileFetched.bind(this)
    )
    cacheableTile.addEventListener(
      WarpedMapEventType.TILEFETCHERROR,
      this.tileFetchError.bind(this)
    )
  }

  private removeEventListenersFromTile(cacheableTile: CacheableTile) {
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
