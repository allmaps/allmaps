import CachedTile from './CachedTile.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { NeededTile } from './shared/types.js'

export default class TileCache extends EventTarget {
  protected cachedTilesByUrl: Map<string, CachedTile> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()

  protected tilesLoadingCount = 0

  // TODO: support multiple scaleFactors
  // keep distance between each tile and viewport
  // different zoom levels also have a distance to current
  // zoom level.

  private addTile(neededTile: NeededTile) {
    const mapId = neededTile.mapId
    const tileUrl = neededTile.url

    let cachedTile = this.cachedTilesByUrl.get(tileUrl)

    if (!cachedTile) {
      const cachedTile = new CachedTile(neededTile)
      this.updateTilesLoadingCount(1)
      cachedTile.addEventListener(
        WarpedMapEventType.TILEFETCHED,
        this.tileFetched.bind(this)
      )
      cachedTile.addEventListener(
        WarpedMapEventType.TILEFETCHERROR,
        this.tileFetchError.bind(this)
      )

      this.cachedTilesByUrl.set(tileUrl, cachedTile)
    } else {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEADDED, {
          mapId,
          tileUrl
        })
      )
    }

    this.addMapIdForTileUrl(mapId, tileUrl)
  }

  private removeTile(mapId: string, tileUrl: string) {
    const cachedTile = this.cachedTilesByUrl.get(tileUrl)

    if (!cachedTile) {
      return
    }

    const mapIds = this.removeMapIdForTileUrl(mapId, tileUrl)

    if (!mapIds.size) {
      if (cachedTile.loading) {
        // Cancel fetch if tile is still being fetched
        cachedTile.abort()
        this.updateTilesLoadingCount(-1)
      }

      this.cachedTilesByUrl.delete(tileUrl)
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILEREMOVED, {
        mapId,
        tileUrl
      })
    )
  }

  private tileFetched(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { tileUrl } = event.data

      this.updateTilesLoadingCount(-1)

      for (const mapId of this.mapIdsByTileUrl.get(tileUrl) || []) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEADDED, {
            mapId,
            tileUrl
          })
        )
      }
    }
  }

  private tileFetchError(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { tileUrl } = event.data

      if (!this.cachedTilesByUrl.has(tileUrl)) {
        this.cachedTilesByUrl.delete(tileUrl)
        this.updateTilesLoadingCount(-1)
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
    let mapIds = this.mapIdsByTileUrl.get(tileUrl)

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

  private createKey(mapId: string, tileUrl: string) {
    return `${mapId}:${tileUrl}`
  }

  setTiles(neededTiles: NeededTile[]) {
    const neededTileMapIdsUrls = new Set()
    for (let neededTile of neededTiles) {
      neededTileMapIdsUrls.add(this.createKey(neededTile.mapId, neededTile.url))
    }

    for (let [tileUrl, mapIds] of this.mapIdsByTileUrl) {
      for (let mapId of mapIds) {
        if (!neededTileMapIdsUrls.has(this.createKey(mapId, tileUrl))) {
          this.removeTile(mapId, tileUrl)
        }
      }
    }

    for (let neededTile of neededTiles) {
      if (!this.mapIdsByTileUrl.get(neededTile.url)?.has(neededTile.mapId)) {
        this.addTile(neededTile)
      }
    }
  }

  clear() {
    this.cachedTilesByUrl = new Map()
    this.mapIdsByTileUrl = new Map()
    this.tilesLoadingCount = 0
  }

  getCachedTileUrls() {
    return this.cachedTilesByUrl.keys()
  }

  getCachedTile(tileUrl: string) {
    return this.cachedTilesByUrl.get(tileUrl)
  }

  private updateTilesLoadingCount(delta: number) {
    this.tilesLoadingCount += delta

    if (this.tilesLoadingCount === 0) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ALLTILESLOADED))
    }
  }
}
