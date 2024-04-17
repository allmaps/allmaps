import FetchableMapTile from './FetchableTile.js'

import type { Tile, ImageRequest, FetchFn } from '@allmaps/types'

/**
 * Class for tiles that can be cached. These are used on the tile cache (and are not associated to a specific map)
 *
 * @export
 * @class CacheableTile
 * @typedef {CacheableTile}
 * @extends {EventTarget}
 */
export default abstract class CacheableTile<D> extends EventTarget {
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string
  readonly fetchFn?: FetchFn

  protected abortController: AbortController

  protected data?: D

  /**
   * Creates an instance of CacheableTile.
   *
   * @constructor
   * @param {FetchableMapTile} fetchableMapTile
   */
  constructor(fetchableMapTile: FetchableMapTile, fetchFn?: FetchFn) {
    super()

    this.tile = fetchableMapTile.tile
    this.imageRequest = fetchableMapTile.imageRequest
    this.tileUrl = fetchableMapTile.tileUrl
    this.fetchFn = fetchFn

    this.abortController = new AbortController()
  }

  abstract fetch(): Promise<D | undefined>

  /**
   * Whether a tile has completed its caching
   * I.e. their fetching is completed and tile data is created
   *
   * @returns {boolean}
   */
  isCachedTile(): this is CachedTile<D> {
    return this.data !== undefined
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
export abstract class CachedTile<D> extends CacheableTile<D> {
  data!: D
}
