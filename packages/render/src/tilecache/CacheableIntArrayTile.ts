import { fetchUrl } from '@allmaps/stdlib'

import FetchableMapTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { GetImageData } from '../shared/types.js'

/**
 * Class for tiles that can be cached. These are used on the tile cache (and are not associated to a specific map)
 *
 * @export
 * @class CacheableArrayBufferTile
 * @typedef {CacheableArrayBufferTile}
 * @extends {EventTarget}
 */
export default class CacheableIntArrayTile<D> extends CacheableTile<D> {
  getImageData: GetImageData<D>

  constructor(
    fetchableMapTile: FetchableMapTile,
    getImageData: GetImageData<D>
  ) {
    super(fetchableMapTile)

    this.getImageData = getImageData
  }

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

      const arrayBuffer = await response.arrayBuffer()
      this.data = this.getImageData(new Uint8ClampedArray(arrayBuffer))

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

  static createFactory<D>(getImageData: GetImageData<D>) {
    return (fetchableMapTile: FetchableMapTile) =>
      new CacheableIntArrayTile(fetchableMapTile, getImageData)
  }
}

/**
 * Class for cacheable tiles whose caching has been completed
 * I.e. their fetching is completed and image bitmap is created
 *
 * @export
 * @class CachedIntArrayTile
 * @typedef {CachedIntArrayTile}
 * @extends {CacheableIntArrayTile}
 */
export class CachedIntArrayTile<D> extends CacheableIntArrayTile<D> {
  declare data: D
}
