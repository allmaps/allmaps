import World from './World.js'

import {
  getResourcePolygon,
  getBestZoomLevel,
  computeIiifTilesForPolygonAndZoomLevel
} from './shared/tiles.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { applyTransform } from './shared/matrix.js'

import type {
  Position,
  Size,
  BBox,
  Transform,
  NeededTile,
  TileZoomLevel
} from './shared/types.js'

const MIN_COMBINED_PIXEL_SIZE = 5

export default class Viewport extends EventTarget {
  world: World

  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]
  visibleWarpedMapIds: Set<string> = new Set()
  bestZoomLevelByMapId: Map<string, TileZoomLevel> = new Map()

  constructor(world: World) {
    super()

    this.world = world
  }

  /**
   * Returns the mapIds of the warped maps that are visible in the viewport, sorted by z-index
   * @returns {Iterable<string>}
   */
  getVisibleWarpedMapIds() {
    const sortedVisibleWarpedMapIds = [...this.visibleWarpedMapIds].sort(
      (mapIdA, mapIdB) => {
        const zIndexA = this.world.getMapZIndex(mapIdA)
        const zIndexB = this.world.getMapZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }

        return 0
      }
    )

    return sortedVisibleWarpedMapIds
  }

  setProjectionTransform(projectionTransform: Transform) {
    this.projectionTransform = projectionTransform
  }

  getProjectionTransform() {
    return this.projectionTransform
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

      const geoBBoxResourcePolygon = getResourcePolygon(
        warpedMap.transformer,
        geoBBox
      )

      const zoomLevel = getBestZoomLevel(
        warpedMap.parsedImage,
        viewportSize,
        geoBBoxResourcePolygon
      )

      // TODO: remove maps from this list when they're removed from World
      // or not visible anymore
      this.bestZoomLevelByMapId.set(mapId, zoomLevel)

      // TODO: rename function
      const tiles = computeIiifTilesForPolygonAndZoomLevel(
        warpedMap.parsedImage,
        geoBBoxResourcePolygon,
        zoomLevel
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

  clear() {
    this.visibleWarpedMapIds = new Set()
  }
}
