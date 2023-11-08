import CachedTile from './CachedTile.js'
import {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapTileEventDetail
} from './shared/events.js'

import type { NeededTile } from '@allmaps/types'

export default class TileCache extends EventTarget {
  // keep geo extent and scale factor for each CachedTile
  protected cachedTilesByTileUrl: Map<string, CachedTile> = new Map()
  protected mapIdsByTileUrl: Map<string, Set<string>> = new Map()
  protected tileUrlsByMapId: Map<string, Set<string>> = new Map()

  protected tilesLoadingCount = 0

  // TODO: support multiple scaleFactors
  // keep distance between each tile and viewport
  // different zoom levels also have a distance to current
  // zoom level.

  private addTile(neededTile: NeededTile) {
    const mapId = neededTile.mapId
    const tileUrl = neededTile.url

    const cachedTile = this.cachedTilesByTileUrl.get(tileUrl)

    if (!cachedTile) {
      const cachedTile = new CachedTile(neededTile)

      this.updateTilesLoadingCount(1)

      cachedTile.addEventListener(
        WarpedMapEventType.TILELOADED,
        this.tileLoaded.bind(this)
      )
      cachedTile.addEventListener(
        WarpedMapEventType.TILEFETCHERROR,
        this.tileFetchError.bind(this)
      )

      cachedTile.fetch()

      this.cachedTilesByTileUrl.set(tileUrl, cachedTile)
    } else {
      this.addTileUrlForMapId(mapId, tileUrl)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILELOADED, {
          mapId,
          tileUrl
        })
      )
    }

    this.addMapIdForTileUrl(mapId, tileUrl)
  }

  private removeTile(mapId: string, tileUrl: string) {
    const cachedTile = this.cachedTilesByTileUrl.get(tileUrl)

    if (!cachedTile) {
      return
    }

    const mapIds = this.removeMapIdForTileUrl(mapId, tileUrl)
    this.removeTileUrlForMapId(mapId, tileUrl)

    if (!mapIds.size) {
      if (cachedTile.loading) {
        // Cancel fetch if tile is still being fetched
        cachedTile.abort()
        this.updateTilesLoadingCount(-1)
      }

      this.cachedTilesByTileUrl.delete(tileUrl)
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILEREMOVED, {
        mapId,
        tileUrl
      })
    )
  }

  private tileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { tileUrl } = event.data as WarpedMapTileEventDetail

      this.updateTilesLoadingCount(-1)

      for (const mapId of this.mapIdsByTileUrl.get(tileUrl) || []) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILELOADED, {
            mapId,
            tileUrl
          })
        )

        this.addTileUrlForMapId(mapId, tileUrl)

        // Emit FIRSTTILELOADED events for mapId
        const tileUrls = this.tileUrlsByMapId.get(mapId)
        const firstTileUrl = tileUrls?.values().next().value

        if (firstTileUrl === tileUrl) {
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.FIRSTTILELOADED, {
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
      const { tileUrl } = event.data as WarpedMapTileEventDetail

      if (!this.cachedTilesByTileUrl.has(tileUrl)) {
        this.cachedTilesByTileUrl.delete(tileUrl)
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

  // TODO: why this instead of creating neededTileMapIdsUrls as a map?
  private createKey(mapId: string, tileUrl: string) {
    return `${mapId}:${tileUrl}`
  }

  setTiles(neededTiles: NeededTile[]) {
    const neededTileMapIdsUrls = new Set()
    for (const neededTile of neededTiles) {
      neededTileMapIdsUrls.add(this.createKey(neededTile.mapId, neededTile.url))
    }

    for (const [tileUrl, mapIds] of this.mapIdsByTileUrl) {
      for (const mapId of mapIds) {
        if (!neededTileMapIdsUrls.has(this.createKey(mapId, tileUrl))) {
          this.removeTile(mapId, tileUrl)
        }
      }
    }

    for (const neededTile of neededTiles) {
      if (!this.mapIdsByTileUrl.get(neededTile.url)?.has(neededTile.mapId)) {
        this.addTile(neededTile)
      }
    }
  }

  clear() {
    this.cachedTilesByTileUrl = new Map()
    this.mapIdsByTileUrl = new Map()
    this.tileUrlsByMapId = new Map()
    this.tilesLoadingCount = 0
  }

  getCachedTiles() {
    return this.cachedTilesByTileUrl.values()
  }

  getCachedTileUrls() {
    return this.cachedTilesByTileUrl.keys()
  }

  getCachedTile(tileUrl: string) {
    return this.cachedTilesByTileUrl.get(tileUrl)
  }

  private updateTilesLoadingCount(delta: number) {
    this.tilesLoadingCount += delta

    if (this.tilesLoadingCount === 0) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ALLTILESLOADED))
    }
  }
}
