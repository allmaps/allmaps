// import RTree from './RTree.js'

import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { fetchImage } from './shared/textures'
import { until } from './shared/until.js'

import type { NeededTile, CachedTile } from './shared/types.js'

export default class TileCache extends EventTarget {
  cachedTilesByUrl: Map<string, CachedTile> = new Map()
  cachedTileUrlsByMapId: Map<string, Set<string>> = new Map()
  // rtree?: RTree

  tilesLoadingCount = 0

  // constructor(rtree?: RTree) {
  //   super()
  //   this.rtree = rtree
  // }

  // TODO: support multiple scaleFactors
  // keepScaleFactorsCount

  async addTile(tile: NeededTile) {
    const cachedTile = this.cachedTilesByUrl.get(tile.url)

    if (cachedTile) {
      if (cachedTile.loading) {
        await until(() => {
          const cachedTile = this.cachedTilesByUrl.get(tile.url)
          if (cachedTile) {
            return !cachedTile.loading
          } else {
            return true
          }
        })
      } else {
        return
      }
    } else {
      await this.fetchTile(tile)
    }
  }

  async removeTile(tileUrl: string) {
    // TODO: cancel tiles if tile is still being fetched

    const cachedTile = this.cachedTilesByUrl.get(tileUrl)

    if (!cachedTile) {
      return
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

    // // Remove tile from rtree
    // if (this.rtree) {
    //   this.rtree.removeItem(url)
    // }

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
    this.storeTile(tile)

    const image = await fetchImage(tile.url)

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    if (context) {
      canvas.width = image.width
      canvas.height = image.height

      context.drawImage(image, 0, 0)
      const imageData = context.getImageData(0, 0, image.width, image.height)

      this.storeTile(tile, imageData)
    }
  }

  private storeTile(tile: NeededTile, imageData?: ImageData) {
    const tileUrl = tile.url
    const mapId = tile.mapId

    const loading = imageData ? false : true

    this.cachedTilesByUrl.set(tileUrl, {
      mapId,
      tile: tile.tile,
      imageRequest: tile.imageRequest,
      url: tile.url,
      loading,
      imageData
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
