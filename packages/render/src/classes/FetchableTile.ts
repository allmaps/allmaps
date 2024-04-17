import { WarpedMapWithImageInfo } from './WarpedMap.js'

import type { Tile, ImageRequest } from '@allmaps/types'

/**
 * Class for tiles associated to a warped map. These are used to describe the tiles requested by the renderer.
 *
 * @export
 * @class FetchableMapTile
 * @typedef {FetchableMapTile}
 */
export default class FetchableMapTile {
  readonly mapId: string
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string

  /**
   * Creates an instance of FetchableMapTile.
   *
   * @constructor
   * @param {Tile} tile - the tile
   * @param {WarpedMapWithImageInfo} warpedMap - the warpedMap, which must have its image info so the tileUrl can be assigned
   */
  constructor(tile: Tile, warpedMap: WarpedMapWithImageInfo) {
    this.mapId = warpedMap.mapId
    this.tile = tile

    const imageRequest = warpedMap.parsedImage.getIiifTile(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    this.imageRequest = imageRequest
    this.tileUrl = warpedMap.parsedImage.getImageUrl(imageRequest)
  }
}
