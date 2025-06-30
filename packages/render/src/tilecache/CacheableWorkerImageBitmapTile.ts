import { proxy as comlinkProxy, wrap as comlinkWrap } from 'comlink'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

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
      wrappedWorker
        .getImageBitmap(
          this.tileUrl,
          comlinkProxy(this.abortController.signal),
          this.fetchFn,
          this.tile.tileZoomLevel.width,
          this.tile.tileZoomLevel.height
        )
        .then((response) => {
          this.data = response
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, this.tileUrl)
          )
        })
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, this.tileUrl)
        )
      }
    }

    return this.data
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
