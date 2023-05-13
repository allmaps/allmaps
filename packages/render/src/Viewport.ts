import World from './World.js'

import { computeIiifTilesForMapGeoBBox } from './shared/tiles.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { applyTransform } from './shared/matrix.js'

import type {
  Position,
  Size,
  BBox,
  Transform,
  NeededTile
} from './shared/types.js'

const MIN_COMBINED_PIXEL_SIZE = 5

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
    geoBBox: BBox,
    coordinateToPixelTransform: Transform
  ): NeededTile[] {
    let possibleVisibleWarpedMapIds: Iterable<string> = []
    const possibleInvisibleWarpedMapIds = new Set(this.visibleWarpedMapIds)

    possibleVisibleWarpedMapIds =
      this.world.getPossibleVisibleWarpedMapIds(geoBBox)

    const neededTiles: NeededTile[] = []
    for (const mapId of possibleVisibleWarpedMapIds) {
      const warpedMap = this.world.getMap(mapId)

      if (!warpedMap) {
        continue
      }

      // Don't show maps when they're too small
      const topLeft: Position = [
        warpedMap.geoMaskBBox[0],
        warpedMap.geoMaskBBox[1]
      ]
      const bottomRight: Position = [
        warpedMap.geoMaskBBox[2],
        warpedMap.geoMaskBBox[3]
      ]

      const pixelTopLeft = applyTransform(coordinateToPixelTransform, topLeft)
      const pixelBottomRight = applyTransform(
        coordinateToPixelTransform,
        bottomRight
      )

      const pixelWidth = Math.abs(pixelBottomRight[0] - pixelTopLeft[0])
      const pixelHeight = Math.abs(pixelTopLeft[1] - pixelBottomRight[1])

      // Only draw maps that are larger than MIN_COMBINED_PIXEL_SIZE pixels
      // in combined width and height
      if (pixelWidth + pixelHeight < MIN_COMBINED_PIXEL_SIZE) {
        continue
      }

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

        for (const tile of tiles) {
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

    for (const mapId of possibleInvisibleWarpedMapIds) {
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
