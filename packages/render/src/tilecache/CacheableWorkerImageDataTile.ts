import { fetchUrl } from '@allmaps/stdlib'

import FetchableTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

/**
 * Class for tiles that can be cached, and whose data can be processed to an ImageData object using a WebWorker.
 *
 * @export
 * @class CacheableWorkerImageDataTile
 * @typedef {CacheableWorkerImageDataTile}
 * @extends {CacheableTile}
 */
export default class CacheableWorkerImageDataTile extends CacheableTile<ImageData> {
  getImageDataWorker: typeof import('../workers/blob-to-image-data.js')

  constructor(fetchableTile: FetchableTile, fetchFn?: FetchFn) {
    super(fetchableTile, fetchFn)

    this.getImageDataWorker = new ComlinkWorker(
      new URL('../workers/blob-to-image-data.js', import.meta.url),
      {
        name: 'getImageData',
        type: 'module'
      }
    )
  }
  /**
   * Fetch the tile and create its ImageData using a WebWorker.
   *
   * @async
   * @returns {Promise<void>}
   */
  async fetch() {
    try {
      const response = await fetchUrl(
        this.tileUrl,
        {
          signal: this.abortController.signal
        },
        this.fetchFn
      )

      const blob = await response.blob()

      // TODO: move fetch to WebWorker too?

      // Note: Could this become obsolete in the future
      // once we can pull bytes directly from Blob?
      // see: https://developer.mozilla.org/en-US/docs/Web/API/Blob/bytes
      this.getImageDataWorker
        .getImageData(
          blob,
          this.tile.tileZoomLevel.width,
          this.tile.tileZoomLevel.height
        )
        .then((response) => {
          this.data = response
          //
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
