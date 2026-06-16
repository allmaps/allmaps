import { proxy as comlinkProxy, wrap as comlinkWrap } from 'comlink'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'

import type { FetchFn } from '@allmaps/types'
import type { FetchAndGetImageBitmapWorkerType } from '../workers/fetch-and-get-image-bitmap.js'

/**
 * Class for tiles that can be cached, and whose data can be processed to its imageBitmap using a WebWorker.
 */
export class CacheableWorkerImageBitmapTile extends CacheableTile<ImageBitmap> {
  #worker: Worker

  constructor(fetchableTile: FetchableTile, worker: Worker, fetchFn?: FetchFn) {
    super(fetchableTile, fetchFn)
    this.#worker = worker
  }

  /**
   * Fetch the tile and create its ImageBitmap using a WebWorker.
   *
   * @returns
   */
  async fetch() {
    try {
      // TODO: move fetch to WebWorker too?

      const wrappedWorker = comlinkWrap<FetchAndGetImageBitmapWorkerType>(
        this.#worker
      )
      this.data = await wrappedWorker.getImageBitmap(
        this.fetchableTile.tileUrl,
        comlinkProxy(this.abortController.signal),
        this.fetchFn,
        this.fetchableTile.tile.tileZoomLevel.width,
        this.fetchableTile.tile.tileZoomLevel.height
      )

      this.dispatchTileFetched()
    } catch (err) {
      if (this.isAbortError(err)) {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchTileFetchError(err)
      }
    }

    return this.data
  }

  async applySprites() {
    // TODO
    return
  }
  spritesDataToCachedTiles() {
    // TODO
    return []
  }

  // When calling createFactory, create the worker like this:
  //  const worker = new Worker(
  //    new URL('../workers/fetch-and-get-image-bitmap.ts', import.meta.url)
  //  )

  static createFactory(worker: Worker) {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableWorkerImageBitmapTile(fetchableTile, worker, fetchFn)
  }
}

/**
 * Class for tiles that is cached, and whose data has been processed to an ImageBitmap object using a WebWorker.
 */
export class CachedWorkerImageBitmapTile extends CacheableWorkerImageBitmapTile {
  declare data: ImageBitmap
}
