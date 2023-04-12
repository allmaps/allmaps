import { fetchImage } from '@allmaps/stdlib'

import type { ImageRequest } from '@allmaps/iiif-parser'

import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Tile, NeededTile } from './shared/types.js'

type StoredTile = Omit<NeededTile, 'mapId'>

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

    this.fetchTile(this.tileUrl)
  }

  private async fetchTile(tileUrl: string) {
    try {
      const image = await fetchImage(tileUrl, this.abortController.signal)
      this.imageBitmap = await createImageBitmap(image)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, {
          tileUrl
        })
      )
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, {
            tileUrl
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
