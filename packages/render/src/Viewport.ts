import World from './World.js'

import { computeIiifTilesForMapGeoBBox } from './shared/tiles.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Size, BBox, NeededTile } from './shared/types.js'

export default class Viewport extends EventTarget {
  world: World

  visibleWarpedMapIds: Set<string> = new Set()

  constructor(world: World) {
    super()

    this.world = world
  }

  getVisibleWarpedMapIds() {
    return this.visibleWarpedMapIds
  }

  // TODO: split function in two?
  // Find better name?
  updateViewportAndGetTilesNeeded(
    viewportSize: Size,
    geoBBox: BBox
  ): NeededTile[] {
    let possibleVisibleWarpedMapIds: Iterable<string> = []
    let possibleInvisibleWarpedMapIds = new Set(this.visibleWarpedMapIds)

    possibleVisibleWarpedMapIds =
      this.world.getPossibleVisibleWarpedMapIds(geoBBox)

    let neededTiles: NeededTile[] = []
    for (let mapId of possibleVisibleWarpedMapIds) {
      const warpedMap = this.world.getMap(mapId)

      if (!warpedMap) {
        continue
      }

      // TODO: don't show maps when they're too small
      // const topLeft = [indexedMap.geoMaskBBox[0], indexedMap.geoMaskBBox[1]]
      // const bottomRight = [
      //   indexedMap.geoMaskBBox[2],
      //   indexedMap.geoMaskBBox[3]
      // ]

      // const pixelTopLeft = applyTransform(coordinateToPixelTransform, topLeft)
      // const pixelBottomRight = applyTransform(
      //   coordinateToPixelTransform,
      //   bottomRight
      // )

      // const pixelWidth = Math.abs(pixelBottomRight[0] - pixelTopLeft[0])
      // const pixelHeight = Math.abs(pixelTopLeft[1] - pixelBottomRight[1])

      // // Only draw maps that are larger than 1 pixel in combined width and height
      // // TODO: use constant instead of 1
      // if (pixelWidth + pixelHeight < 1) {
      //   continue
      // }

      // TODO: rename function
      const tiles = computeIiifTilesForMapGeoBBox(
        warpedMap.transformer,
        warpedMap.parsedImage,
        viewportSize,
        geoBBox
      )

      if (tiles.length) {
        if (!this.visibleWarpedMapIds.has(mapId)) {
          this.visibleWarpedMapIds.add(mapId)
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
          )
        }

        possibleInvisibleWarpedMapIds.delete(mapId)

        for (let tile of tiles) {
          const imageRequest = warpedMap.parsedImage.getIiifTile(
            tile.zoomLevel,
            tile.column,
            tile.row
          )
          const url = warpedMap.parsedImage.getImageUrl(imageRequest)

          neededTiles.push({
            mapId,
            tile,
            imageRequest,
            url
          })
        }
      }
    }

    for (let mapId of possibleInvisibleWarpedMapIds) {
      if (this.visibleWarpedMapIds.has(mapId)) {
        this.visibleWarpedMapIds.delete(mapId)
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
        )
      }
    }

    return neededTiles
  }
}
