import FetchableTile from './FetchableTile.js'

import type { Tile, ImageRequest, FetchFn } from '@allmaps/types'

/**
 * Class for tiles that can be cached.
 *
 * @export
 * @tamplate D
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
   * @param {FetchableTile} fetchableTile
   * @param {FetchFn} [fetchFn] Optional fetch function to use
   */
  constructor(fetchableTile: FetchableTile, fetchFn?: FetchFn) {
    super()

    this.tile = fetchableTile.tile
    this.imageRequest = fetchableTile.imageRequest
    this.tileUrl = fetchableTile.tileUrl
    this.fetchFn = fetchFn

    this.abortController = new AbortController()
  }

  abstract fetch(): Promise<D | undefined>

  /**
   * Whether a tile has fetched its data
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
 * Class for tiles that are cached, i.e. their data has been fetched and processed
 *
 * @export
 * @class CachedTile
 * @typedef {CachedTile}
 * @extends {CacheableTile}
 */
export abstract class CachedTile<D> extends CacheableTile<D> {
  declare data: D
}
