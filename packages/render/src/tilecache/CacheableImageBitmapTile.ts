import { fetchUrl } from '@allmaps/stdlib'

import FetchableMapTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

/**
 * Class for tiles that can be cached. These are used on the tile cache (and are not associated to a specific map)
 *
 * @export
 * @class CacheableImageBitmapTile
 * @typedef {CacheableImageBitmapTile}
 * @extends {CacheableTile}
 */
export default class CacheableImageBitmapTile extends CacheableTile<ImageBitmap> {
  /**
   * Fetch the tile and create its image bitmap.
   *
   * Returns and event when completed (or error).
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
      this.data = await createImageBitmap(blob)

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
    return (fetchableMapTile: FetchableMapTile) =>
      new CacheableImageBitmapTile(fetchableMapTile)
  }
}

/**
 * Class for cacheable tiles whose caching has been completed
 * I.e. their fetching is completed and image bitmap is created
 *
 * @export
 * @class CachedImageBitmapTile
 * @typedef {CachedImageBitmapTile}
 * @extends {CacheableImageBitmapTile}
 */
export class CachedImageBitmapTile extends CacheableImageBitmapTile {
  declare data: ImageBitmap
}
