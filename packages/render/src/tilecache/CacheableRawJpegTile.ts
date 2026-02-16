import { fetchUrl } from '@allmaps/stdlib'

import { FetchableTile } from './FetchableTile.js'
import { CacheableTile } from './CacheableTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { FetchFn } from '@allmaps/types'

/**
 * Raw JPEG tile data - stores compressed JPEG bytes for WASM decoding
 */
export interface RawJpegData {
  jpegBytes: Uint8ClampedArray
  width: number
  height: number
}

/**
 * Class for tiles that cache raw JPEG bytes for WASM decoding
 * This avoids JavaScript JPEG decoding and lets WASM handle it
 */
export class CacheableRawJpegTile extends CacheableTile<RawJpegData> {
  decodeJpegForDimensions: (jpegBytes: Uint8ClampedArray) => { width: number; height: number }

  constructor(
    fetchableTile: FetchableTile,
    decodeJpegForDimensions: (jpegBytes: Uint8ClampedArray) => { width: number; height: number },
    fetchFn?: FetchFn
  ) {
    super(fetchableTile, fetchFn)
    this.decodeJpegForDimensions = decodeJpegForDimensions
  }

  /**
   * Fetch the tile and store raw JPEG bytes
   * Only decodes to get dimensions, then stores raw bytes for WASM
   */
  async fetch() {
    try {
      const response = await fetchUrl(
        this.fetchableTile.tileUrl,
        {
          signal: this.abortController.signal
        },
        this.fetchFn
      )

      const arrayBuffer = await response.arrayBuffer()
      const jpegBytes = new Uint8ClampedArray(arrayBuffer)

      // Decode just to get dimensions (WASM will decode again during render)
      const { width, height } = this.decodeJpegForDimensions(jpegBytes)

      // Store raw JPEG bytes, not decoded pixels
      this.data = {
        jpegBytes,
        width,
        height
      }

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, {
          tileUrl: this.fetchableTile.tileUrl
        })
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, {
            tileUrl: this.fetchableTile.tileUrl
          })
        )
      }
    }

    return this.data
  }

  async applySprites() {
    // TODO
    return
  }

  spritesDataToCachedTiles() {
    // TODO
    return []
  }

  static createFactory(
    decodeJpegForDimensions: (jpegBytes: Uint8ClampedArray) => { width: number; height: number }
  ) {
    return (fetchableTile: FetchableTile, fetchFn?: FetchFn) =>
      new CacheableRawJpegTile(fetchableTile, decodeJpegForDimensions, fetchFn)
  }
}

/**
 * Class for tiles that have been fetched and cached as raw JPEG
 */
export class CachedRawJpegTile extends CacheableRawJpegTile {
  declare data: RawJpegData
}
