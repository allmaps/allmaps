import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateMap,
  type Map as Georef
} from '@allmaps/annotation'

import RTree from './RTree.js'
import WarpedMap from './WarpedMap.js'

import { combineBboxes } from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { TransformationType } from '@allmaps/transform'
import type { Ring, Bbox } from '@allmaps/types'

type WarpedMapListOptions = {
  createRTree: boolean
}

export default class WarpedMapList extends EventTarget {
  warpedMapsById: Map<string, WarpedMap> = new Map()

  zIndices: Map<string, number> = new Map()
  rtree?: RTree
  imageInfoCache?: Cache

  constructor(imageInfoCache?: Cache, options?: WarpedMapListOptions) {
    super()
    options = Object.assign({ createRTree: true }, options)

    this.imageInfoCache = imageInfoCache

    if (options.createRTree) {
      this.rtree = new RTree()
    }
  }

  getMaps(): Iterable<string> {
    return this.warpedMapsById.keys()
  }

  getWarpedMaps(): Iterable<WarpedMap> {
    return this.warpedMapsById.values()
  }

  getWarpedMap(mapId: string): WarpedMap | undefined {
    return this.warpedMapsById.get(mapId)
  }

  getMapZIndex(mapId: string) {
    return this.zIndices.get(mapId)
  }

  getProjectedBbox(): Bbox | undefined {
    let bbox

    for (const warpedMap of this.getWarpedMaps()) {
      if (warpedMap.visible) {
        if (!bbox) {
          bbox = warpedMap.projectedGeoMaskBbox
        } else {
          bbox = combineBboxes(bbox, warpedMap.projectedGeoMaskBbox)
        }
      }
    }

    return bbox
  }

  getBbox(): Bbox | undefined {
    let bbox

    for (const warpedMap of this.getWarpedMaps()) {
      if (warpedMap.visible) {
        if (!bbox) {
          bbox = warpedMap.geoMaskBbox
        } else {
          bbox = combineBboxes(bbox, warpedMap.geoMaskBbox)
        }
      }
    }

    return bbox
  }

  getMapsByBbox(geoBbox: Bbox): Iterable<string> {
    // TODO: to make sure only tiles for visible parts of the map are requested
    // (and not for parts hidden behind maps on top of it)
    // Subtract geoMasks of maps that have been added before the current map:
    // Map A (topmost): show completely
    // Map B: B - A
    // Map C: C - B - A
    // Map D: D - C - B - A
    //
    // Possible libraries:
    //  - https://github.com/w8r/martinez
    //  - https://github.com/mfogel/polygon-clipping
    //
    // Do this only if transparancy of upper map is 0

    if (this.rtree) {
      return this.rtree.searchBbox(geoBbox)
    } else {
      return Array.from(this.warpedMapsById.keys())
    }
  }

  setImageInfoCache(cache: Cache): void {
    this.imageInfoCache = cache
  }

  setMapResourceMask(mapId: string, resourceMask: Ring): void {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      warpedMap.setResourceMask(resourceMask)
      this.updateRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.RESOURCEMASKUPDATED, mapId)
      )
    }
  }

  setMapsTransformationType(
    mapIds: Iterable<string>,
    transformationType: TransformationType
  ): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.setTransformationType(transformationType)
        this.updateRtree(warpedMap)
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TRANSFORMATIONCHANGED, mapIds)
    )
  }

  bringMapsToFront(mapIds: Iterable<string>): void {
    let newZIndex = this.warpedMapsById.size
    for (const mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  sendMapsToBack(mapIds: Iterable<string>): void {
    let newZIndex = -Array.from(mapIds).length
    for (const mapId of mapIds) {
      if (this.zIndices.has(mapId)) {
        this.zIndices.set(mapId, newZIndex)
        newZIndex++
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  bringMapsForward(mapIds: Iterable<string>): void {
    for (const [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }
    for (const mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex + 3)
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  sendMapsBackward(mapIds: Iterable<string>): void {
    for (const [mapId, zIndex] of this.zIndices.entries()) {
      this.zIndices.set(mapId, zIndex * 2)
    }
    for (const mapId of mapIds) {
      const zIndex = this.zIndices.get(mapId)
      if (zIndex !== undefined) {
        this.zIndices.set(mapId, zIndex - 3)
      }
    }
    this.removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
  }

  showMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = true
      }
    }
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED))
  }

  hideMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = false
      }
    }
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED))
  }

  async addMap(map: unknown): Promise<string | Error> {
    const validatedMapOrMaps = validateMap(map)
    const validatedMap = Array.isArray(validatedMapOrMaps)
      ? validatedMapOrMaps[0]
      : validatedMapOrMaps
    return this.addMapInternal(validatedMap)
  }

  async removeMap(map: unknown): Promise<string | Error> {
    const validatedMapOrMaps = validateMap(map)
    const validatedMap = Array.isArray(validatedMapOrMaps)
      ? validatedMapOrMaps[0]
      : validatedMapOrMaps
    return this.removeMapInternal(validatedMap)
  }

  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    const settledResults = await Promise.allSettled(
      maps.map((map) => this.addMapInternal(map))
    )
    // TODO: make sure reason contains Error
    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        results.push(settledResult.value)
      } else {
        results.push(settledResult.reason)
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFERENCEANNOTATIONADDED)
    )
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
    return results
  }

  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    for (const map of maps) {
      const mapIdOrError = await this.removeMapInternal(map)
      results.push(mapIdOrError)
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFERENCEANNOTATIONREMOVED)
    )
    return results
  }

  private async addMapInternal(map: Georef): Promise<string> {
    const mapId = await this.getMapId(map)
    const warpedMap = new WarpedMap(mapId, map, this.imageInfoCache)
    this.warpedMapsById.set(mapId, warpedMap)
    this.zIndices.set(mapId, this.warpedMapsById.size - 1)
    this.updateRtree(warpedMap)
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, mapId)
    )
    return mapId
  }

  private async removeMapInternal(map: Georef): Promise<string> {
    const mapId = await this.getMapId(map)
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.warpedMapsById.delete(mapId)
      this.zIndices.delete(mapId)
      this.removeFromRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, mapId)
      )
      this.removeZIndexHoles()
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGES))
    } else {
      throw new Error(`No map found with ID ${mapId}`)
    }
    return mapId
  }

  private async getMapId(map: Georef): Promise<string> {
    const mapId = map.id || (await generateChecksum(map))
    return mapId
  }

  private updateRtree(warpedMap: WarpedMap): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
      this.rtree.addItem(warpedMap.mapId, warpedMap.projectedGeoMask)
    }
  }

  private removeFromRtree(warpedMap: WarpedMap): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
    }
  }

  private removeZIndexHoles(): void {
    const sortedZIndices = [...this.zIndices.entries()].sort(
      (entryA, entryB) => entryA[1] - entryB[1]
    )
    let zIndex = 0
    for (const entry of sortedZIndices) {
      const mapId = entry[0]
      this.zIndices.set(mapId, zIndex)
      zIndex++
    }
  }

  clear(): void {
    this.warpedMapsById = new Map()
    this.zIndices = new Map()
    this.rtree?.clear()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CLEARED))
  }
}
