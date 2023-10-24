import WarpedMapList from './WarpedMapList.js'

import {
  getResourcePolygon,
  getBestZoomLevel,
  computeIiifTilesForPolygonAndZoomLevel
} from './shared/tiles.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { applyTransform } from './shared/matrix.js'

import type { Point, Size, Bbox, Transform, NeededTile } from '@allmaps/types'

import type { TileZoomLevel } from '@allmaps/types'

const MIN_COMBINED_PIXEL_SIZE = 5

export default class Viewport extends EventTarget {
  warpedMapList: WarpedMapList

  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]
  visibleWarpedMapIds: Set<string> = new Set()
  bestZoomLevelByMapId: Map<string, TileZoomLevel> = new Map()

  constructor(warpedMapList: WarpedMapList) {
    super()

    this.warpedMapList = warpedMapList
  }

  /**
   * Returns the mapIds of the warped maps that are visible in the viewport, sorted by z-index
   * @returns {Iterable<string>}
   */
  getVisibleWarpedMapIds() {
    const sortedVisibleWarpedMapIds = [...this.visibleWarpedMapIds].sort(
      (mapIdA, mapIdB) => {
        const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
        const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
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
    geoBbox: Bbox,
    coordinateToPixelTransform: Transform
  ): NeededTile[] {
    let possibleVisibleWarpedMapIds: Iterable<string> = []
    const possibleInvisibleWarpedMapIds = new Set(this.visibleWarpedMapIds)

    possibleVisibleWarpedMapIds =
      this.warpedMapList.getPossibleVisibleWarpedMapIds(geoBbox)

    const neededTiles: NeededTile[] = []
    for (const mapId of possibleVisibleWarpedMapIds) {
      const warpedMap = this.warpedMapList.getMap(mapId)

      if (!warpedMap) {
        continue
      }

      // Don't show maps when they're too small
      const topLeft: Point = [
        warpedMap.geoMaskBbox[0],
        warpedMap.geoMaskBbox[1]
      ]
      const bottomRight: Point = [
        warpedMap.geoMaskBbox[2],
        warpedMap.geoMaskBbox[3]
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

      const geoBboxResourcePolygon = getResourcePolygon(
        warpedMap.transformer,
        geoBbox
      )

      const zoomLevel = getBestZoomLevel(
        warpedMap.parsedImage,
        viewportSize,
        geoBboxResourcePolygon
      )

      // TODO: remove maps from this list when they're removed from WarpedMapList
      // or not visible anymore
      this.bestZoomLevelByMapId.set(mapId, zoomLevel)

      // TODO: rename function
      const tiles = computeIiifTilesForPolygonAndZoomLevel(
        warpedMap.parsedImage,
        geoBboxResourcePolygon,
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
