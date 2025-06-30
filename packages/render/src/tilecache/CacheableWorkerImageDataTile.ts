import { proxy as comlinkProxy, type Remote as ComlinkRemote } from 'comlink'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchAndGetImageDataWorkerType } from '../workers/fetch-and-get-image-data.js'

import type { FetchFn } from '@allmaps/types'

/**
 * Class for tiles that can be cached, and whose data can be processed to its imageData using a WebWorker.
 */
export class CacheableWorkerImageDataTile extends CacheableTile<ImageData> {
  #worker: ComlinkRemote<FetchAndGetImageDataWorkerType>

  constructor(
    fetchableTile: FetchableTile,
    worker: ComlinkRemote<FetchAndGetImageDataWorkerType>,
    fetchFn?: FetchFn
  ) {
    super(fetchableTile, fetchFn)
    this.#worker = worker
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
          this.tileUrl,
          comlinkProxy(() => this.abortController.abort()),
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
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, this.tileUrl)
        )
      }
    }

    return this.data
  }

  static createFactory(worker: ComlinkRemote<FetchAndGetImageDataWorkerType>) {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableWorkerImageDataTile(fetchableTile, worker, fetchFn)
  }
}

/**
 * Class for tiles that is cached, and whose data has been processed to an ImageData object using a WebWorker.
 */
export class CachedWorkerImageDataTile extends CacheableWorkerImageDataTile {
  declare data: ImageData
}
