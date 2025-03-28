import { fetchUrl } from '@allmaps/stdlib'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

/**
 * Class for tiles that can be cached, and whose data can be processed to an ImageBitMap.
 */
export class CacheableImageBitmapTile extends CacheableTile<ImageBitmap> {
  /**
   * Fetch the tile and create its ImageBitMap.
   * @returns
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
      this.data = await createImageBitmap(
        blob,
        0,
        0,
        this.tile.tileZoomLevel.width,
        this.tile.tileZoomLevel.height
      )

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
      new CacheableImageBitmapTile(fetchableTile, fetchFn)
  }
}

/**
 * Class for cacheable tiles that have been fetched.
 */
export class CachedImageBitmapTile extends CacheableImageBitmapTile {
  declare data: ImageBitmap
}
