import { proxy as comlinkProxy } from 'comlink'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile, CachedTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import { WorkerPool } from '../workers/PoolWorkers.js'

import type { FetchFn } from '@allmaps/types'

import type { SpritesInfo } from '../shared/types.js'
import type { WarpedMapWithImage } from '../maps/WarpedMap.js'
import type { FetchAndGetImageBitmapWorkerType } from '../workers/fetch-and-get-image-bitmap.js'

/**
 * Class for tiles that can be cached, and whose data can be processed to its ImageBitmap using a WebWorker.
 */
export class CacheableWorkerImageBitmapTile extends CacheableTile<ImageBitmap> {
  #workerPool: WorkerPool<FetchAndGetImageBitmapWorkerType>

  constructor(
    fetchableTile: FetchableTile,
    workerPool: WorkerPool<FetchAndGetImageBitmapWorkerType>,
    fetchFn?: FetchFn
  ) {
    super(fetchableTile, fetchFn)
    this.#workerPool = workerPool
  }

  /**
   * Fetch the tile and create its ImageBitmap using a WebWorker.
   *
   * @returns
   */
  async fetch() {
    const { worker, index } = this.#workerPool.acquire()
    try {
      worker
        .getImageBitmap(
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
            // fetchImage was aborted because viewport was moved and tile
            // is no longer needed. This error can be ignored, nothing to do.
          } else {
            this.dispatchTileFetchError(err)
          }
        })
        .finally(() => {
          this.#workerPool.release(index)
        })
    } catch (err) {
      this.#workerPool.release(index) // release even if setup itself throws synchronously
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchTileFetchError(err)
      }
    }

    return this.data
  }

  /**
   * Clip this tile's sprite-atlas ImageBitmap into one ImageBitmap per
   * (sprite, warped map) pair.
   *
   * `createImageBitmap` crops off the main thread and yields a directly
   * GPU-uploadable bitmap, so no ImageData readback or sprites worker is needed.
   */
  async applySprites() {
    const data = this.data
    const spritesInfo = this.fetchableTile.options?.spritesInfo
    const warpedMapsByResourceId =
      this.fetchableTile.options?.warpedMapsByResourceId
    if (!data || !spritesInfo || !warpedMapsByResourceId) {
      return
    }

    // Build the clipped ImageBitmaps in the same (sprite → warped map) order
    // that spritesDataToCachedTiles consumes them.
    const clippedImageBitmaps: ImageBitmap[] = []
    for (const sprite of spritesInfo.sprites) {
      const warpedMaps = warpedMapsByResourceId.get(sprite.imageId)
      if (!warpedMaps) {
        break
      }
      for (const warpedMap of warpedMaps) {
        const tileSize = warpedMap.tileSize

        // TODO: support sprites larger than one tile: split by tileSize
        if (sprite.width > tileSize[0] || sprite.height > tileSize[1]) {
          throw new Error('Sprites larger then one tile not supported yet')
        }

        clippedImageBitmaps.push(
          await createImageBitmap(
            data,
            sprite.x,
            sprite.y,
            sprite.width,
            sprite.height
          )
        )
      }
    }

    this.cachedTilesFromSprites = this.spritesDataToCachedTiles(
      clippedImageBitmaps,
      spritesInfo,
      warpedMapsByResourceId
    )
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILESFROMSPRITETILE, {
        tileUrl: this.fetchableTile.tileUrl
      })
    )
  }

  spritesDataToCachedTiles(
    clippedImageBitmaps: ImageBitmap[],
    spritesInfo: SpritesInfo,
    warpedMapsByResourceId: Map<string, WarpedMapWithImage[]>
  ): CachedTile<ImageBitmap>[] {
    const cachedTiles: CachedWorkerImageBitmapTile[] = []
    let index = 0
    for (const sprite of spritesInfo.sprites) {
      const warpedMaps = warpedMapsByResourceId.get(sprite.imageId)
      if (!warpedMaps) {
        break
      }
      for (const warpedMap of warpedMaps) {
        const cachedTile = new CachedWorkerImageBitmapTile(
          FetchableTile.fromSprite(sprite, spritesInfo.imageSize, warpedMap, {
            spritesInfo
          }),
          this.#workerPool,
          clippedImageBitmaps[index]
        )
        cachedTiles.push(cachedTile)
        index++
      }
    }
    return cachedTiles
  }

  static createFactory(
    workerPool: WorkerPool<FetchAndGetImageBitmapWorkerType>
  ) {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableWorkerImageBitmapTile(fetchableTile, workerPool, fetchFn)
  }
}

/**
 * Class for tiles that is cached, and whose data has been processed to an ImageBitmap object using a WebWorker.
 */
export class CachedWorkerImageBitmapTile extends CacheableWorkerImageBitmapTile {
  declare data: ImageBitmap

  constructor(
    fetchableTile: FetchableTile,
    workerPool: WorkerPool<FetchAndGetImageBitmapWorkerType>,
    data: ImageBitmap
  ) {
    super(fetchableTile, workerPool)
    this.data = data
  }
}
