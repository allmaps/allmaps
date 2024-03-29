import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateMap,
  type Map as GeoreferencedMap
} from '@allmaps/annotation'

import GeojsonPolygonRTree from './RTree.js'
import WarpedMap from './WarpedMap.js'

import { combineBboxes } from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { TransformationType } from '@allmaps/transform'
import type { Ring, Bbox } from '@allmaps/types'

type WarpedMapListOptions = {
  createRTree: boolean
}

/**
 * Class for warped map lists, which describe an ordered array of maps to be drawn.
 * They contain an imageInfoCash, and and RTree for quickly looking up maps using their Bbox.
 *
 * @export
 * @class WarpedMapList
 * @typedef {WarpedMapList}
 * @extends {EventTarget}
 */
export default class WarpedMapList extends EventTarget {
  warpedMapsById: Map<string, WarpedMap> = new Map()

  zIndices: Map<string, number> = new Map()
  rtree?: GeojsonPolygonRTree
  imageInfoCache?: Cache

  /**
   * Creates an instance of WarpedMapList.
   *
   * @constructor
   * @param {?Cache} [imageInfoCache] - An image info cache
   * @param {?WarpedMapListOptions} [options] - Options
   */
  constructor(imageInfoCache?: Cache, options?: WarpedMapListOptions) {
    super()
    options = Object.assign({ createRTree: true }, options)

    this.imageInfoCache = imageInfoCache

    if (options.createRTree) {
      this.rtree = new GeojsonPolygonRTree()
    }
  }

  /**
   * Returns mapIds for the maps in this list.
   *
   * @returns {Iterable<string>}
   */
  getMaps(): Iterable<string> {
    return this.warpedMapsById.keys()
  }

  /**
   * Returns WarpedMap objects of the maps in this list.
   * Optionally specify mapId's whose WarpedMap objects are requested.
   *
   * @returns {Iterable<WarpedMap>}
   */
  getWarpedMaps(): Iterable<WarpedMap>
  getWarpedMaps(mapIds: string[]): Iterable<WarpedMap>
  getWarpedMaps(mapIds?: string[]): Iterable<WarpedMap> {
    if (mapIds === undefined) {
      return this.warpedMapsById.values()
    } else {
      const warpedMaps: WarpedMap[] = []
      for (const mapId of mapIds) {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMaps.push(warpedMap)
        }
      }
      return warpedMaps
    }
  }

  /**
   * Returns the WarpedMap object in this list of map specified by a mapId.
   *
   * @param {string} mapId
   * @returns {(WarpedMap | undefined)}
   */
  getWarpedMap(mapId: string): WarpedMap | undefined {
    return this.warpedMapsById.get(mapId)
  }

  /**
   * Returns the zIndex of a map.
   *
   * @param {string} mapId
   * @returns {number | undefined}
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.zIndices.get(mapId)
  }

  /**
   * Return the bounding box of all visible maps in this list, in longitude/latitude coordinates
   *
   * @returns {(Bbox | undefined)}
   */
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

  /**
   * Return the bounding box of all visible maps in this list, in projected coordinates
   *
   * @returns {(Bbox | undefined)}
   */
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

  /**
   * Returns mapIds of the maps whose geoBbox overlaps with the specified geoBbox.
   *
   * @param {Bbox} geoBbox
   * @returns {Iterable<string>}
   */
  getMapsByGeoBbox(geoBbox: Bbox): Iterable<string> {
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
      return this.rtree.searchFromBbox(geoBbox)
    } else {
      return Array.from(this.warpedMapsById.keys())
    }
  }

  /**
   * Sets the image info cache
   *
   * @param {Cache} cache - the image info cache
   */
  setImageInfoCache(cache: Cache): void {
    this.imageInfoCache = cache
  }

  /**
   * Sets the resource mask for a specified map
   *
   * @param {string} mapId - ID of the map
   * @param {Ring} resourceMask - the new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring): void {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      warpedMap.setResourceMask(resourceMask)
      this.addToOrUpdateRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.RESOURCEMASKUPDATED, mapId)
      )
    }
  }

  /**
   * Sets the transformation type of specified maps
   *
   * @param {Iterable<string>} mapIds - the IDs of the maps
   * @param {TransformationType} transformationType - the new transformation type
   */
  setMapsTransformationType(
    mapIds: Iterable<string>,
    transformationType: TransformationType
  ): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.setTransformationType(transformationType)
        this.addToOrUpdateRtree(warpedMap)
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.TRANSFORMATIONCHANGED, mapIds)
    )
  }

  /**
   * Changes the zIndex of the specified maps to bring them to front
   *
   * @param {Iterable<string>} mapIds
   */
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

  /**
   * Changes the zIndex of the specified maps to send them to back
   *
   * @param {Iterable<string>} mapIds
   */
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

  /**
   * Changes the zIndex of the specified maps to bring them forward
   *
   * @param {Iterable<string>} mapIds
   */
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

  /**
   * Changes the zIndex of the specified maps to send them backward
   *
   * @param {Iterable<string>} mapIds
   */
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

  /**
   * Changes the visibility of the specified maps to `true`
   *
   * @param {Iterable<string>} mapIds
   */
  showMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = true
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED, mapIds)
    )
  }

  /**
   * Changes the visibility of the specified maps to `false`
   *
   * @param {Iterable<string>} mapIds
   */
  hideMaps(mapIds: Iterable<string>): void {
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (warpedMap) {
        warpedMap.visible = false
      }
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.VISIBILITYCHANGED, mapIds)
    )
  }

  /**
   * Adds a georeferenced map to this list
   *
   * @async
   * @param {unknown} georeferencedMap
   * @returns {Promise<string | Error>}
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps = validateMap(georeferencedMap)
    const validatedGeoreferencedMap = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps[0]
      : validatedGeoreferencedMapOrMaps
    return this.addGeoreferencedMapInternal(validatedGeoreferencedMap)
  }

  /**
   * Removes a georeferenced map from this list
   *
   * @async
   * @param {unknown} georeferencedMap
   * @returns {Promise<string | Error>}
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps = validateMap(georeferencedMap)
    const validatedGeoreferencedMap = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps[0]
      : validatedGeoreferencedMapOrMaps
    return this.removeGeoreferencedMapInternal(validatedGeoreferencedMap)
  }

  /**
   * Parses an annotation and adds its georeferenced map to this list
   *
   * @async
   * @param {unknown} annotation
   * @returns {Promise<(string | Error)[]>}
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    const settledResults = await Promise.allSettled(
      maps.map((map) => this.addGeoreferencedMapInternal(map))
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

  /**
   * Parses an annotation and removes its georeferenced map from this list
   *
   * @async
   * @param {unknown} annotation
   * @returns {Promise<(string | Error)[]>}
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    for (const map of maps) {
      const mapIdOrError = await this.removeGeoreferencedMapInternal(map)
      results.push(mapIdOrError)
    }
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.GEOREFERENCEANNOTATIONREMOVED)
    )
    return results
  }

  clear(): void {
    this.warpedMapsById = new Map()
    this.zIndices = new Map()
    this.rtree?.clear()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CLEARED))
  }

  dispose() {
    for (const warpedMap of this.getWarpedMaps()) {
      this.removeEventListenersFromWarpedMap(warpedMap)
      warpedMap.dispose()
    }
  }

  private async addGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)
    const warpedMap = new WarpedMap(
      mapId,
      georeferencedMap,
      this.imageInfoCache
    )
    this.warpedMapsById.set(mapId, warpedMap)
    this.zIndices.set(mapId, this.warpedMapsById.size - 1)
    this.addToOrUpdateRtree(warpedMap)
    this.addEventListenersToWarpedMap(warpedMap)
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, mapId)
    )
    return mapId
  }

  private async removeGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)
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

  private async getOrComputeMapId(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId =
      georeferencedMap.id || (await generateChecksum(georeferencedMap))
    return mapId
  }

  private addToOrUpdateRtree(warpedMap: WarpedMap): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
      this.rtree.addItem(warpedMap.mapId, warpedMap.geoMask)
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

  private imageInfoLoaded() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  private addEventListenersToWarpedMap(warpedMap: WarpedMap) {
    warpedMap.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }

  private removeEventListenersFromWarpedMap(warpedMap: WarpedMap) {
    warpedMap.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }
}
