import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { fetchImage } from './shared/textures'

import type { NeededTile, CachedTile } from './shared/types.js'

export default class TileCache extends EventTarget {
  cachedTilesByUrl: Map<string, CachedTile> = new Map()
  cachedTileUrlsByMapId: Map<string, Set<string>> = new Map()

  abortControllersByUrl: Map<string, AbortController> = new Map()

  tilesLoadingCount = 0

  // TODO: support multiple scaleFactors
  // keepScaleFactorsCount

  async addTile(tile: NeededTile) {
    const cachedTile = this.cachedTilesByUrl.get(tile.url)

    if (!cachedTile) {
      await this.fetchTile(tile)
    }
  }

  async removeTile(tileUrl: string) {
    const cachedTile = this.cachedTilesByUrl.get(tileUrl)

    if (!cachedTile) {
      return
    }

    if (cachedTile.loading) {
      // Cancel fetch if tile is still being fetched
      const abortController = this.abortControllersByUrl.get(tileUrl)
      if (abortController) {
        abortController.abort()
        this.abortControllersByUrl.delete(tileUrl)
      }
    }

    const mapId = cachedTile.mapId
    this.cachedTilesByUrl.delete(tileUrl)

    if (mapId) {
      const cachedTileUrlsForMapId = this.cachedTileUrlsByMapId.get(mapId)
      cachedTileUrlsForMapId?.delete(tileUrl)
      if (!cachedTileUrlsForMapId?.size) {
        this.cachedTileUrlsByMapId.delete(mapId)
      }
    }

    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILEREMOVED, {
        tileUrl,
        mapId
      })
    )
  }

  setTiles(tilesNeeded: NeededTile[]) {
    const tilesNeededUrls = new Set()
    for (let tile of tilesNeeded) {
      tilesNeededUrls.add(tile.url)
    }

    for (let url of this.cachedTilesByUrl.keys()) {
      if (!tilesNeededUrls.has(url)) {
        this.removeTile(url)
      }
    }

    for (let tile of tilesNeeded) {
      if (!this.cachedTilesByUrl.has(tile.url)) {
        this.fetchTile(tile)
      }
    }
  }

  getCachedTileUrls() {
    return this.cachedTilesByUrl.keys()
  }

  getCachedTile(url: string) {
    return this.cachedTilesByUrl.get(url)
  }

  *getCachedTilesForMapId(mapId: string) {
    const cachedTileUrlsForMapId = this.cachedTileUrlsByMapId.get(mapId)

    if (cachedTileUrlsForMapId) {
      for (let url of cachedTileUrlsForMapId) {
        const cachedTile = this.cachedTilesByUrl.get(url)
        if (cachedTile) {
          yield cachedTile
        }
      }
    }
  }

  private async fetchTile(tile: NeededTile) {
    await this.storeTile(tile)

    const abortController = new AbortController()
    this.abortControllersByUrl.set(tile.url, abortController)

    try {
      const image = await fetchImage(tile.url, abortController.signal)

      const imageBitmap = await createImageBitmap(image)
      await this.storeTile(tile, imageBitmap)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        // Something else happend
        console.error(err)
      }
    }
  }

  private async storeTile(tile: NeededTile, imageBitmap?: ImageBitmap) {
    const tileUrl = tile.url
    const mapId = tile.mapId
    const loading = imageBitmap ? false : true

    this.cachedTilesByUrl.set(tileUrl, {
      mapId,
      tile: tile.tile,
      imageRequest: tile.imageRequest,
      url: tile.url,
      loading,
      imageBitmap
    })

    if (!this.cachedTileUrlsByMapId.has(mapId)) {
      this.cachedTileUrlsByMapId.set(mapId, new Set())
    }
    this.cachedTileUrlsByMapId.get(mapId)?.add(tileUrl)

    this.tilesLoadingCount += loading ? 1 : -1

    if (!loading) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILELOADED, {
          tileUrl,
          mapId
        })
      )
    }

    if (this.tilesLoadingCount === 0) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ALLTILESLOADED))
    }

    // Remove tile from rtree
    // if (this.rtree && !loading) {
    //   geoBBox
    //   this.rtree.addItem(url, )
    // }
  }
}
