import { fetchImage } from '@allmaps/stdlib'

import type { ImageRequest } from '@allmaps/types'

import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Tile, StoredTile } from '@allmaps/types'

export default class CachedTile extends EventTarget {
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string
  imageBitmap?: ImageBitmap

  protected abortController: AbortController

  constructor(storedTile: StoredTile) {
    super()

    this.tile = storedTile.tile
    this.imageRequest = storedTile.imageRequest
    this.tileUrl = storedTile.url

    this.abortController = new AbortController()
  }

  async fetch() {
    try {
      const image = await fetchImage(this.tileUrl, this.abortController.signal)
      this.imageBitmap = await createImageBitmap(image)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILELOADED, {
          tileUrl: this.tileUrl
        })
      )

      return this.imageBitmap
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, {
            tileUrl: this.tileUrl
          })
        )
      }
    }
  }

  get loading() {
    return this.imageBitmap ? false : true
  }

  abort() {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort()
    }
  }
}
