import { mergePartialOptions } from '@allmaps/stdlib'

import { WarpedMapWithImage } from '../maps/WarpedMap.js'
import { fetchableTileKey, tileKey } from '../shared/tiles.js'

import type { Tile, Size } from '@allmaps/types'

import type { FetchableTileOptions, Sprite } from '../shared/types.js'

/**
 * Class for tiles that can be fetched.
 */
export class FetchableTile {
  readonly mapId: string
  readonly tile: Tile
  readonly tileUrl: string
  readonly tileKey: string
  readonly fetchableTileKey: string
  readonly options?: Partial<FetchableTileOptions>

  /**
   * Creates an instance of FetchableTile.
   *
   * @constructor
   * @param tile - the tile
   * @param mapId - Map ID
   * @param tileUrl - Tile URL
   * @param imageRequest - Image Request
   * @param options - FetchableTileOptions
   */
  constructor(
    tile: Tile,
    mapId: string,
    tileUrl: string,
    options?: Partial<FetchableTileOptions>
  ) {
    this.tile = tile
    this.mapId = mapId
    this.tileUrl = tileUrl
    this.options = options
    this.tileKey = tileKey(tile)
    this.fetchableTileKey = fetchableTileKey(this)
  }

  /**
   * Creates an instance of FetchableTile from a WarpedMap.
   *
   * @constructor
   * @param tile - the tile
   * @param warpedMap - A WarpedMap with fetched image
   */
  static fromWarpedMap(
    tile: Tile,
    warpedMap: WarpedMapWithImage,
    options?: Partial<FetchableTileOptions>
  ) {
    const tileImageRequest = warpedMap.image.getTileImageRequest(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    return new FetchableTile(
      tile,
      warpedMap.mapId,
      warpedMap.image.getImageUrl(tileImageRequest),
      mergePartialOptions(options, { imageRequest: tileImageRequest })
    )
  }

  /**
   * Creates an instance of FetchableTile from a sprite.
   *
   * @constructor
   * @param sprite - Sprite
   * @param imageSize - imageSize
   * @param warpedMap - A WarpedMap with fetched image
   */
  static fromSprite(
    sprite: Sprite,
    imageSize: Size,
    warpedMap: WarpedMapWithImage,
    options?: Partial<FetchableTileOptions>
  ) {
    const width = warpedMap.tileSize[0]
    const height = warpedMap.tileSize[1]
    const tile = {
      column: 0,
      row: 0,
      tileZoomLevel: {
        scaleFactor: sprite.scaleFactor,
        width,
        height,
        originalWidth: width * sprite.scaleFactor,
        originalHeight: height * sprite.scaleFactor,
        columns: 1,
        rows: 1
      },
      imageSize
    }
    const tileImageRequest = warpedMap.image.getTileImageRequest(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    return new FetchableTile(
      tile,
      warpedMap.mapId,
      sprite.imageId,
      mergePartialOptions(options, { imageRequest: tileImageRequest })
    )
  }
}
