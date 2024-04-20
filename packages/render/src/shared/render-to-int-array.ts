import classifyPoint from 'robust-point-in-polygon'

import type WarpedMapList from '../maps/WarpedMapList.js'
import type Viewport from '../viewport/Viewport.js'
import type TileCache from '../tilecache/TileCache.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'

import type WarpedMap from '../maps/WarpedMap.js'
import type { Point } from '@allmaps/types'

import { GetImageDataValue, GetImageDataSize } from './types.js'

const CHANNELS = 4

export async function renderToIntArray<W extends WarpedMap, D>(
  warpedMapList: WarpedMapList<W>,
  tileCache: TileCache<D>,
  viewport: Viewport,
  getImageDataValue: GetImageDataValue<D>,
  getImageDataSize: GetImageDataSize<D>,
  intArray: Uint8ClampedArray
): Promise<void> {
  const [width, height] = viewport.viewportSize

  for (const warpedMap of warpedMapList.getWarpedMaps()) {
    const cachedTiles = tileCache.getCachedTilesForMapId(warpedMap.mapId)

    // Step through all warped tile pixels and set their color
    // TODO: if there's nothing to render, maybe send static empty PNG?
    for (
      let renderedImagePixelX = 0;
      renderedImagePixelX < width;
      renderedImagePixelX++
    ) {
      for (
        let renderedImagePixelY = 0;
        renderedImagePixelY < height;
        renderedImagePixelY++
      ) {
        // Go from warped tile pixel location to corresponding pixel location (with decimals) on resource tiles,
        // in two steps:
        //
        // 1) Detemine the projected geospatial coordinates of the warped image's pixel location
        const renderedImagePixelProjectedGeo: Point = [
          viewport.projectedGeoRectangleBbox[0] +
            viewport.projectedGeoSize[0] * (renderedImagePixelX / width),
          viewport.projectedGeoRectangleBbox[1] +
            viewport.projectedGeoSize[1] * (renderedImagePixelY / height)
        ]

        // 2) Determine corresponding resource coordinates (with decimals) on resource using transformer
        const resourceCoordinates =
          warpedMap.projectedTransformer.transformToResource(
            renderedImagePixelProjectedGeo
          )

        // Check if pixel is inside resource mask
        // classifyPoint returns an integer which determines the position of point relative to polygon:
        //   -1 if point lies inside polygon
        //    0 if point lies on the polygon's edge
        //    1 if point lies outside polygon
        if (classifyPoint(warpedMap.resourceMask, resourceCoordinates) === 1) {
          continue
        }

        // Determine tile index of resource tile on which this pixel location (with decimals) is
        let cachedTile: CachedTile<D> | undefined
        let tileXMin: number | undefined
        let tileYMin: number | undefined
        let foundCachedTile = false
        for (cachedTile of cachedTiles) {
          const tile = cachedTile.tile

          tileXMin = tile.column * tile.tileZoomLevel.originalWidth
          tileYMin = tile.row * tile.tileZoomLevel.originalHeight
          if (
            resourceCoordinates[0] >= tileXMin &&
            resourceCoordinates[0] <=
              tileXMin + tile.tileZoomLevel.originalWidth &&
            resourceCoordinates[1] >= tileYMin &&
            resourceCoordinates[1] <=
              tileYMin + tile.tileZoomLevel.originalHeight
          ) {
            foundCachedTile = true

            break
          }
        }

        // If tile is found, set color of this warped tile pixel
        if (
          foundCachedTile &&
          cachedTile &&
          tileXMin !== undefined &&
          tileYMin !== undefined
        ) {
          const tile = cachedTile.tile

          // Schematic drawing of resource tile and sub-pixel location of (pixelTileX, pixelTileY)
          //
          // PixelTile: +
          // Surrounding pixels: *
          //
          //   Y
          //   ^
          // 2 *---------* 3
          //   |         |
          //   |         |
          //   |   +     |
          // 0 *---------* 1 > X
          //
          // Determine (sub-)pixel coordinates on resource tile

          const pixelTileX =
            (resourceCoordinates[0] - tileXMin) / tile.tileZoomLevel.scaleFactor
          const pixelTileY =
            (resourceCoordinates[1] - tileYMin) / tile.tileZoomLevel.scaleFactor

          const [tileWidth, tileHeight] = getImageDataSize(cachedTile.data)

          // Determine coordinates of four surrounding pixels
          const pixelTileXFloor = Math.max(Math.floor(pixelTileX), 0)
          const pixelTileXCeil = Math.min(Math.ceil(pixelTileX), tileWidth - 1)
          const pixelTileYFloor = Math.max(Math.floor(pixelTileY), 0)
          const pixelTileYCeil = Math.min(Math.ceil(pixelTileY), tileHeight - 1)

          // Determine indices of four surrounding pixels
          const tileIntArrayIndices = [
            pixelToIndex(pixelTileXFloor, pixelTileYFloor, tileWidth, CHANNELS),
            pixelToIndex(pixelTileXCeil, pixelTileYFloor, tileWidth, CHANNELS),
            pixelToIndex(pixelTileXFloor, pixelTileYCeil, tileWidth, CHANNELS),
            pixelToIndex(pixelTileXCeil, pixelTileYCeil, tileWidth, CHANNELS)
          ]

          // Determine remaining (sub-)pixel decimals on resource tile
          const pixelTileXDecimals = pixelTileX - Math.floor(pixelTileX)
          const pixelTileYDecimals = pixelTileY - Math.floor(pixelTileY)

          // Define index in result intArray
          const intArrayIndex =
            ((height - renderedImagePixelY) * width + renderedImagePixelX) *
            CHANNELS

          // For each color, compute and set the RGBA colors in the intArray
          // by interpolating the color of the four surrounding pixels on the resource tile
          for (let color = 0; color < CHANNELS; color++) {
            intArray[intArrayIndex + color] =
              getImageDataValue(
                cachedTile.data,
                tileIntArrayIndices[0] + color
              ) *
                (1 - pixelTileXDecimals) *
                (1 - pixelTileYDecimals) +
              getImageDataValue(
                cachedTile.data,
                tileIntArrayIndices[1] + color
              ) *
                pixelTileXDecimals *
                (1 - pixelTileYDecimals) +
              getImageDataValue(
                cachedTile.data,
                tileIntArrayIndices[2] + color
              ) *
                (1 - pixelTileXDecimals) *
                pixelTileYDecimals +
              getImageDataValue(
                cachedTile.data,
                tileIntArrayIndices[3] + color
              ) *
                pixelTileXDecimals *
                pixelTileYDecimals
          }
        }
      }
    }
  }
}

function pixelToIndex(
  pixelX: number,
  pixelY: number,
  width: number,
  channels: number
): number {
  return (pixelY * width + pixelX) * channels
}
