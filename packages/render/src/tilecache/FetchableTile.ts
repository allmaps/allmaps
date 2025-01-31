import { WarpedMapWithImageInfo } from '../maps/WarpedMap.js'
import { fetchableTileKey, tileKey } from '../shared/tiles.js'

import type { Tile, ImageRequest } from '@allmaps/types'

/**
 * Class for tiles that can be fetched.
 */
export class FetchableTile {
  readonly mapId: string
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string
  readonly tileKey: string
  readonly fetchableTileKey: string

  /**
   * Creates an instance of FetchableTile.
   *
   * @constructor
   * @param tile - the tile
   * @param warpedMap - A WarpedMap with fetched image information
   */
  constructor(tile: Tile, warpedMap: WarpedMapWithImageInfo) {
    this.mapId = warpedMap.mapId
    this.tile = tile

    const imageRequest = warpedMap.parsedImage.getTileImageRequest(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    this.imageRequest = imageRequest
    this.tileUrl = warpedMap.parsedImage.getImageUrl(imageRequest)
    this.tileKey = tileKey(tile)
    this.fetchableTileKey = fetchableTileKey(this)
  }
}
