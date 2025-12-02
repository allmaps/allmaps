import { FetchableTile } from './FetchableTile.js'

import type { FetchFn } from '@allmaps/types'

import type { WarpedMapWithImage } from '../maps/WarpedMap.js'
import type { SpritesInfo } from '../shared/types.js'

/**
 * Class for tiles that can be cached.
 */
export abstract class CacheableTile<D> extends EventTarget {
  readonly fetchableTile: FetchableTile
  readonly fetchFn?: FetchFn

  protected abortController: AbortController

  protected data?: D
  protected cachedTilesFromSpritesData?: CachedTile<D>[]

  /**
   * Creates an instance of CacheableTile.
   *
   * @constructor
   * @param fetchableTile
   * @param fetchFn - Optional fetch function to use
   */
  constructor(fetchableTile: FetchableTile, fetchFn?: FetchFn) {
    super()

    this.fetchableTile = fetchableTile
    this.fetchFn = fetchFn

    this.abortController = new AbortController()
  }

  abstract fetch(): Promise<D | undefined>

  abstract applySprites(): Promise<void>
  abstract spritesDataToCachedTiles(
    clippedImageDatas: ImageData[],
    spritesInfo: SpritesInfo,
    warpedMapsByResourceId: Map<string, WarpedMapWithImage[]>
  ): CachedTile<D>[]

  /**
   * Whether a tile has fetched its data
   *
   * @returns
   */
  isCachedTile(): this is CachedTile<D> {
    return this.data !== undefined
  }

  getCachedTilesFromSprites(): CachedTile<D>[] | undefined {
    return this.cachedTilesFromSpritesData
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
 */
export abstract class CachedTile<D> extends CacheableTile<D> {
  declare data: D
}
