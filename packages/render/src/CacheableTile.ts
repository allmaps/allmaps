import { fetchImage } from '@allmaps/stdlib'
import FetchableMapTile from './FetchableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Tile, ImageRequest } from '@allmaps/types'

/**
 * Class for tiles that can be cached. These are used on the tile cache (and are not associated to a specific map)
 *
 * @export
 * @class CacheableTile
 * @typedef {CacheableTile}
 * @extends {EventTarget}
 */
export default class CacheableTile extends EventTarget {
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string
  imageBitmap?: ImageBitmap

  protected abortController: AbortController

  /**
   * Creates an instance of CacheableTile.
   *
   * @constructor
   * @param {FetchableMapTile} fetchableMapTile
   */
  constructor(fetchableMapTile: FetchableMapTile) {
    super()

    this.tile = fetchableMapTile.tile
    this.imageRequest = fetchableMapTile.imageRequest
    this.tileUrl = fetchableMapTile.tileUrl

    this.abortController = new AbortController()
  }

  /**
   * Fetch the tile and create its image bitmap.
   *
   * Returns and event when completed (or error).
   *
   * @async
   * @returns {Promise<ImageBitmap> | void}
   */
  async fetch() {
    try {
      const image = await fetchImage(this.tileUrl, this.abortController.signal)
      this.imageBitmap = await createImageBitmap(image)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, this.tileUrl)
      )

      return this.imageBitmap
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
  }

  /**
   * Whether a tile has completed its caching
   * I.e. their fetching is completed and image bitmap is created
   *
   * @returns {cacheableTile is CachedTile}
   */
  isCachedTile(): this is CachedTile {
    return this.imageBitmap !== undefined
  }

  /**
   * Abort the fetch
   */
  abort() {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort()
    }
  }
}

/**
 * Class for cacheable tiles whose caching has been completed
 * I.e. their fetching is completed and image bitmap is created
 *
 * @export
 * @class CachedTile
 * @typedef {CachedTile}
 * @extends {CacheableTile}
 */
export class CachedTile extends CacheableTile {
  imageBitmap!: ImageBitmap
  constructor(fetchableMapTile: FetchableMapTile) {
    super(fetchableMapTile)
  }
}
