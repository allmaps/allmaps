// TODO: consider using
// https://github.com/mourner/flatbush
import RBush from 'rbush'

import { getPolygonBBox } from './shared/geo.js'
import { pointInPolygon } from './shared/geo.js'

import type { BBox, Position, GeoJSONPolygon } from './shared/types.js'

const DEFAULT_FILTER_INSIDE_POLYGON = true

interface RTreeItem {
  minX: number
  minY: number
  maxX: number
  maxY: number
  id: string
}

export default class RTree {
  rbush: RBush<RTreeItem> = new RBush()

  polygonsById: Map<string, GeoJSONPolygon> = new Map()
  bboxesById: Map<string, BBox> = new Map()
  itemsById: Map<string, RTreeItem> = new Map()

  addItem(id: string, polygon: GeoJSONPolygon) {
    const bbox = getPolygonBBox(polygon)

    const item = {
      minX: bbox[0],
      minY: bbox[1],
      maxX: bbox[2],
      maxY: bbox[3],
      id
    }

    this.polygonsById.set(id, polygon)
    this.bboxesById.set(id, bbox)
    this.itemsById.set(id, item)

    this.rbush.insert(item)
  }

  removeItem(id: string) {
    const item = this.itemsById.get(id)

    if (item) {
      this.rbush.remove(item)

      this.polygonsById.delete(id)
      this.bboxesById.delete(id)
      this.itemsById.delete(id)
    }
  }

  clear() {
    this.rbush.clear()
  }

  private search(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): RTreeItem[] {
    return this.rbush.search({
      minX,
      minY,
      maxX,
      maxY
    })
  }

  getBBox(id: string) {
    return this.bboxesById.get(id)
  }

  getPolygon(id: string) {
    return this.polygonsById.get(id)
  }

  searchBBox(geoBBox: BBox): string[] {
    const [minX, minY, maxX, maxY] = geoBBox
    return this.search(minX, minY, maxX, maxY).map((item) => item.id)
  }

  searchPoint(
    point: Position,
    filterInsidePolygon = DEFAULT_FILTER_INSIDE_POLYGON
  ): string[] {
    const [minX, minY, maxX, maxY] = [point[0], point[1], point[0], point[1]]

    const rtreeResults = this.search(minX, minY, maxX, maxY)

    if (filterInsidePolygon) {
      return rtreeResults
        .filter((item) => {
          const polygon = this.polygonsById.get(item.id)

          if (polygon) {
            return pointInPolygon(point, polygon.coordinates[0])
          } else {
            return false
          }
        })
        .map((item) => item.id)
    } else {
      return rtreeResults.map((item) => item.id)
    }
  }
}
