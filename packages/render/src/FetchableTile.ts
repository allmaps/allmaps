import { WarpedMapWithImageInfo } from './WarpedMap.js'

import type { Tile, ImageRequest } from '@allmaps/types'

export default class FetchableMapTile {
  readonly mapId: string
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string

  constructor(tile: Tile, warpedMap: WarpedMapWithImageInfo) {
    this.mapId = warpedMap.mapId
    this.tile = tile

    const imageRequest = warpedMap.parsedImage.getIiifTile(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    this.imageRequest = imageRequest

    const url = warpedMap.parsedImage.getImageUrl(imageRequest)
    this.tileUrl = url
  }
}
