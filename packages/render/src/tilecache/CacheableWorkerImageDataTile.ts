import * as Comlink from 'comlink'

import FetchableTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'
import type { FetchAndGetImageDataWorkerType } from '../workers/fetch-and-get-image-data.js'

/**
 * Class for tiles that can be cached, and whose data can be processed to its imageData using a WebWorker.
 *
 * @export
 * @class CacheableWorkerImageDataTile
 * @typedef {CacheableWorkerImageDataTile}
 * @extends {CacheableTile}
 */
export default class CacheableWorkerImageDataTile extends CacheableTile<ImageData> {
  /**
   * Fetch the tile and create its ImageData using a WebWorker.
   *
   * @async
   * @returns {Promise<void>}
   */
  async fetch() {
    try {
      // TODO: move fetch to WebWorker too?

      // Note: Could this become obsolete in the future
      // once we can pull bytes directly from Blob?
      // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob/bytes
      const worker = new Worker(
        new URL('../workers/fetch-and-get-image-data', import.meta.url)
      )
      const wrappedWorker = Comlink.wrap<FetchAndGetImageDataWorkerType>(worker)
      wrappedWorker
        .getImageData(
          this.tileUrl,
          Comlink.proxy(this.abortController.signal),
          this.fetchFn,
          this.tile.tileZoomLevel.width,
          this.tile.tileZoomLevel.height
        )
        .then((response) => {
          this.data = response
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, this.tileUrl)
          )
          worker.terminate()
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

  static createFactory() {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableWorkerImageDataTile(fetchableTile, fetchFn)
  }
}

/**
 * Class for tiles that is cached, and whose data has been processed to an ImageData object using a WebWorker.
 *
 * @export
 * @class CachedWorkerImageDataTile
 * @typedef {CachedWorkerImageDataTile}
 * @extends {CacheableWorkerImageDataTile}
 */
export class CachedWorkerImageDataTile extends CacheableWorkerImageDataTile {
  declare data: ImageData
}
