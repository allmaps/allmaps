import { fetchUrl } from '@allmaps/stdlib'

import FetchableTile from './FetchableTile.js'
import CacheableTile from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

import type { GetImageData } from '../shared/types.js'

/**
 * Class for tiles that are cached using an IntArray
 *
 * @export
 * @class CacheableIntArrayTile
 * @typedef {CacheableIntArrayTile}
 * @extends {CacheableTile}
 */
export default class CacheableIntArrayTile<D> extends CacheableTile<D> {
  getImageData: GetImageData<D>

  constructor(
    fetchableTile: FetchableTile,
    getImageData: GetImageData<D>,
    fetchFn?: FetchFn
  ) {
    super(fetchableTile, fetchFn)

    this.getImageData = getImageData
  }

  /**
   * Fetch the tile and create its IntArray data using the supplied getImageData function.
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
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableIntArrayTile(fetchableTile, getImageData, fetchFn)
  }
}

/**
 * Class for cacheable tiles that have been fetched.
 *
 * @export
 * @class CachedIntArrayTile
 * @typedef {CachedIntArrayTile}
 * @extends {CacheableIntArrayTile}
 */
export class CachedIntArrayTile<D> extends CacheableIntArrayTile<D> {
  declare data: D
}
