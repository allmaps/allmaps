import { fetchUrl } from '@allmaps/stdlib'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

import type { GetImageData } from '../shared/types.js'

/**
 * Class for tiles that can be cached, and whose data can be processed to an IntArray.
 */
export class CacheableIntArrayTile<D> extends CacheableTile<D> {
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
 * Class for tiles that is cached, and whose data has been processed to an IntArray.
 */
export class CachedIntArrayTile<D> extends CacheableIntArrayTile<D> {
  declare data: D
}
