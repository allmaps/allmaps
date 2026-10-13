import { FetchableTile } from './FetchableTile.js'

import {
  ResourceFetchError,
  bufferBboxByRatio,
  doBboxesIntersect
} from '@allmaps/stdlib'

import { computeBboxTile } from '../shared/tiles.js'
import {
  WarpedMapErrorEvent,
  WarpedMapEvent,
  WarpedMapEventType
} from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

import type { WarpedMapWithImage } from '../maps/WarpedMap.js'
import type {
  MapPruneConstants,
  MapPruneInfo,
  SpritesInfo
} from '../shared/types.js'

/**
 * Class for tiles that can be cached.
 */
export abstract class CacheableTile<D> extends EventTarget {
  readonly fetchableTile: FetchableTile
  readonly fetchFn?: FetchFn

  protected abortController: AbortController

  protected data?: D
  protected cachedTilesFromSprites?: CachedTile<D>[]

  /**
   * Creates an instance of CacheableTile.
   *
   * Note that there can be multiple FetchableTiles with the same tileUrl, but only one CachedTile per tileUrl.
   *
   * @constructor
   * @param fetchableTile - The FetchableTile which created this CachedTile.
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
    clippedTilesData: D[],
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

  isTileFromSprites() {
    return this.fetchableTile.options?.spritesInfo != undefined
  }

  getCachedTilesFromSprites(): CachedTile<D>[] | undefined {
    return this.cachedTilesFromSprites
  }

  /**
   * Abort the fetch
   */
  abort() {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort()
    }
  }

  /**
   * Release any native resources held by this tile's data (e.g. close an
   * ImageBitmap, whose decoded pixels live outside the JS heap and are only
   * reclaimed lazily by GC). Called when the tile is removed from the cache.
   */
  release(): void {}

  protected isAbortError(error: unknown) {
    return (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    )
  }

  protected dispatchTileFetched() {
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, {
        mapIds: [this.fetchableTile.mapId],
        tileUrl: this.fetchableTile.tileUrl
      })
    )
  }

  protected dispatchTileFetchError(error: unknown) {
    const normalizedError =
      error instanceof Error ? error : new Error(String(error))
    const resourceFetchError =
      normalizedError instanceof ResourceFetchError
        ? normalizedError
        : undefined
    const errorLike = normalizedError as Partial<ResourceFetchError>
    const errorKind =
      resourceFetchError?.kind ??
      (typeof errorLike.kind === 'string' ? errorLike.kind : 'unknown')
    const corsLikely =
      resourceFetchError?.corsLikely ??
      (typeof errorLike.corsLikely === 'boolean' ? errorLike.corsLikely : false)
    const status =
      resourceFetchError?.status ??
      (typeof errorLike.status === 'number' ? errorLike.status : undefined)

    this.dispatchEvent(
      new WarpedMapErrorEvent(
        normalizedError,
        {
          mapIds: [this.fetchableTile.mapId],
          tileUrl: this.fetchableTile.tileUrl,
          errorKind,
          corsLikely,
          status
        },
        WarpedMapEventType.TILEFETCHERROR
      )
    )
  }

  shouldPrune(
    mapPruneInfo: MapPruneInfo | undefined,
    mapPruneConstants: MapPruneConstants
  ) {
    const tile = this.fetchableTile.tile

    // Don't prune if sprite
    if (this.isTileFromSprites()) {
      return false
    }

    // Prune if no prune info
    if (!mapPruneInfo) {
      return true
    }

    // Don't prune if overview
    // Note that resourceViewportRingBboxForViewport and tileZoomLevelForViewport are only undefined
    // if overview tile, so we add them here to prevent TypeScript errors furter on
    if (
      mapPruneInfo.overviewTileZoomLevelForViewport &&
      tile.tileZoomLevel.scaleFactor ==
        mapPruneInfo.overviewTileZoomLevelForViewport.scaleFactor
    ) {
      return false
    }

    // Prune if the tileZoomLevelForViewport or resourceViewportRingBboxForViewport are undefined
    // (this only happens if the map is too small to render)
    if (
      mapPruneInfo.resourceViewportRingBboxForViewport === undefined ||
      mapPruneInfo.tileZoomLevelForViewport === undefined
    ) {
      return true
    }

    // Should prune if scale factor too much off
    //
    // Example:
    // Available scaleFactors in tileZoomLevels:
    // 1 (full original resolution), 2, 4, 8, 16 (zoomed out)
    //
    // Tile scale factor: 16, so log2 tile scale factor: 4
    // Scale factor for viewport: 8, so log2 scale factor for viewport: 3
    // Difference: 4 - 3 = 1, check if not more then max
    // This is positive if tile scale factor is higher then scale factor for viewport, so tiles are lower original resolution
    //
    // Since there are less lower original resolution tiles,
    // MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF can be higher then MAX_LOWER_LOG2_SCALE_FACTOR_DIFF
    //
    const log2ScaleFactorDiff =
      Math.log2(tile.tileZoomLevel.scaleFactor) -
      Math.log2(mapPruneInfo.tileZoomLevelForViewport.scaleFactor)
    // Check if scale factor not too high, i.e. tile resolution too low
    const tileScaleFactorTooHigh =
      log2ScaleFactorDiff > mapPruneConstants.maxHigherLog2ScaleFactorDiff
    if (tileScaleFactorTooHigh) {
      return true
    }
    // Check if scale factor not too low, i.e. tile resolution too high
    const tileScaleFactorTooLow =
      -log2ScaleFactorDiff > mapPruneConstants.maxLowerLog2ScaleFactorDiff
    if (tileScaleFactorTooLow) {
      return true
    }

    // Prune if too far away
    // Note that we correct the tile bbox by buffering the scale factor difference (if positive)
    // This allows us to keep all tiles that would be needed if we zoom out again
    // Even if they currently don't overlap with the viewport ring bbox
    if (
      !doBboxesIntersect(
        bufferBboxByRatio(
          computeBboxTile(tile),
          Math.pow(2, log2ScaleFactorDiff)
        ),
        mapPruneInfo.resourceViewportRingBboxForViewport
      )
    ) {
      return true
    }

    // By default, don't prune
    return false
  }
}

/**
 * Class for tiles that are cached, i.e. their data has been fetched and processed
 */
export abstract class CachedTile<D> extends CacheableTile<D> {
  declare data: D
}
