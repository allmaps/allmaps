import WarpedMapList from './WarpedMapList.js'

import type { Size, Bbox, Transform } from '@allmaps/types'

import type { TileZoomLevel } from '@allmaps/types'

export default class Viewport extends EventTarget {
  size?: Size
  geoBbox?: Bbox
  coordinateToPixelTransform: Transform = [1, 0, 0, 1, 0, 0]
  projectionTransform: Transform = [1, 0, 0, 1, 0, 0]

  warpedMapList: WarpedMapList
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

  updateViewport(
    size: Size,
    geoBbox: Bbox,
    coordinateToPixelTransform: Transform
  ): void {
    this.size = size
    this.geoBbox = geoBbox
    this.coordinateToPixelTransform = coordinateToPixelTransform
  }

  clear() {
    this.visibleWarpedMapIds = new Set()
  }
}
