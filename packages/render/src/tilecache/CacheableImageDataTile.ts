import { fetchUrl } from '@allmaps/stdlib'

import FetchableTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

/**
 * Class for tiles that are cached using the Canvas 2D ImageData object.
 *
 * @export
 * @class CacheableImageDataTile
 * @typedef {CacheableImageDataTile}
 * @extends {CacheableTile}
 */
export default class CacheableImageDataTile extends CacheableTile<ImageData> {
  /**
   * Fetch the tile and create its ImageData object.
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

      const width = this.tile.tileZoomLevel.width
      const height = this.tile.tileZoomLevel.height

      const blob = await response.blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = new OffscreenCanvas(width, height)
      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Could not create OffscreenCanvas context')
      }

      context.drawImage(bitmap, 0, 0)
      this.data = context.getImageData(0, 0, width, height)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, this.tileUrl)
      )
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
      new CacheableImageDataTile(fetchableTile, fetchFn)
  }
}

/**
 * Class for cacheable tiles that have been fetched.
 *
 * @export
 * @class CachedImageDataTile
 * @typedef {CachedImageDataTile}
 * @extends {CacheableImageDataTile}
 */
export class CachedImageDataTile extends CacheableImageDataTile {
  declare data: ImageData
}
