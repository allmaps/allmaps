import { proxy as comlinkProxy, type Remote as ComlinkRemote } from 'comlink'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile, CachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

import type { TileCache } from './TileCache.js'
import type { SpritesInfo } from '../shared/types.js'
import type { WarpedMapWithImage } from '../maps/WarpedMap.js'
import type { FetchAndGetImageDataWorkerType } from '../workers/fetch-and-get-image-data.js'
import type { ApplySpritesImageDataWorkerType } from '../workers/apply-sprites-image-data.js'

/**
 * Class for tiles that can be cached, and whose data can be processed to its imageData using a WebWorker.
 */
export class CacheableWorkerImageDataTile extends CacheableTile<ImageData> {
  #worker: ComlinkRemote<FetchAndGetImageDataWorkerType>
  #spritesWorker: ComlinkRemote<ApplySpritesImageDataWorkerType>

  constructor(
    fetchableTile: FetchableTile,
    worker: ComlinkRemote<FetchAndGetImageDataWorkerType>,
    spritesWorker: ComlinkRemote<ApplySpritesImageDataWorkerType>,
    fetchFn?: FetchFn
  ) {
    super(fetchableTile, fetchFn)
    this.#worker = worker
    this.#spritesWorker = spritesWorker
  }

  /**
   * Fetch the tile and create its ImageData using a WebWorker.
   *
   * @returns
   */
  async fetch() {
    try {
      this.#worker
        .getImageData(
          this.fetchableTile.tileUrl,
          comlinkProxy(() => this.abortController.abort()),
          this.fetchFn,
          this.fetchableTile.tile.tileZoomLevel.width,
          this.fetchableTile.tile.tileZoomLevel.height
        )
        .then((response) => {
          this.data = response
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, {
              tileUrl: this.fetchableTile.tileUrl
            })
          )
        })
        .catch((err) => {
          if (err instanceof Error && err.name === 'AbortError') {
            console.log('Fetch aborted') // Handle the abort error
          } else {
            console.error(err) // Handle other errors
          }
        })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, {
            tileUrl: this.fetchableTile.tileUrl
          })
        )
      }
    }

    return this.data
  }

  async applySprites() {
    const data = this.data
    const spritesInfo = this.fetchableTile.options?.spritesInfo
    const warpedMapsByResourceId =
      this.fetchableTile.options?.warpedMapsByResourceId
    if (!data || !spritesInfo || !warpedMapsByResourceId) {
      return
    }

    // TODO: this could be optimised:
    // If there are multiple maps using the same resourceId and with a different tileSize
    // then we could perform the sprite application and cached tile creation only once,
    // but this seems like an uncommon situation.
    const tileSizesByResourceId = new Map(
      Array.from(warpedMapsByResourceId.entries()).map(
        ([resourceId, warpedMaps]) => [
          resourceId,
          warpedMaps.map((warpedMap) => warpedMap.tileSize)
        ]
      )
    )

    return this.#spritesWorker
      .applySprites(data, spritesInfo.sprites, tileSizesByResourceId)
      .then((clippedImageDatas) => {
        this.cachedTilesFromSprites = this.spritesDataToCachedTiles(
          clippedImageDatas,
          spritesInfo,
          warpedMapsByResourceId
        )
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILESFROMSPRITETILE, {
            tileUrl: this.fetchableTile.tileUrl
          })
        )
      })
  }

  spritesDataToCachedTiles(
    clippedImageDatas: ImageData[],
    spritesInfo: SpritesInfo,
    warpedMapsByResourceId: Map<string, WarpedMapWithImage[]>
  ): CachedTile<ImageData>[] {
    const cachedTiles: CachedWorkerImageDataTile[] = []
    for (const [i, sprite] of spritesInfo.sprites.entries()) {
      const warpedMaps = warpedMapsByResourceId.get(
        spritesInfo.sprites[i].imageId
      )
      if (!warpedMaps) {
        break
      }
      for (const warpedMap of warpedMaps) {
        const cachedTile = new CachedWorkerImageDataTile(
          FetchableTile.fromSprite(sprite, spritesInfo.imageSize, warpedMap, {
            spritesInfo
          }),
          this.#worker,
          this.#spritesWorker,
          clippedImageDatas[i]
        )
        cachedTiles.push(cachedTile)
      }
    }
    return cachedTiles
  }

  static createFactory(
    worker: ComlinkRemote<FetchAndGetImageDataWorkerType>,
    spritesWorker: ComlinkRemote<ApplySpritesImageDataWorkerType>
  ) {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableWorkerImageDataTile(
        fetchableTile,
        worker,
        spritesWorker,
        fetchFn
      )
  }
}

/**
 * Class for tiles that is cached, and whose data has been processed to an ImageData object using a WebWorker.
 */
export class CachedWorkerImageDataTile extends CacheableWorkerImageDataTile {
  declare data: ImageData

  /**
   * Creates an instance of CachedTile.
   *
   * @constructor
   * @param fetchableTile
   * @param data
   */
  constructor(
    fetchableTile: FetchableTile,
    worker: ComlinkRemote<FetchAndGetImageDataWorkerType>,
    spritesWorker: ComlinkRemote<ApplySpritesImageDataWorkerType>,
    data: ImageData
  ) {
    super(fetchableTile, worker, spritesWorker)
    this.data = data
  }
}
