import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateGeoreferencedMap,
  type GeoreferencedMap
} from '@allmaps/annotation'
import { equalProjection, proj4 } from '@allmaps/project'

import { RTree } from './RTree.js'
import { WarpedMap } from './WarpedMap.js'

import {
  bboxToCenter,
  computeBbox,
  convexHull,
  mergeOptions,
  mergePartialOptions
} from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type {
  ProjectionOptions,
  SelectionOptions,
  WarpedMapFactory,
  WarpedMapListOptions
} from '../shared/types.js'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'
import type { Projection } from '@allmaps/project'
import type { Ring, Bbox, Gcp, Point, ImageInformations } from '@allmaps/types'

const defaultSelectionOptions: SelectionOptions = {
  onlyVisible: true
}

const defaultWarpedMapListOptions: Partial<WarpedMapListOptions> = {
  createRTree: true,
  imageInformations: new Map()
}

/**
 * An ordered list of WarpedMaps. This class contains an optional RTree
 * for quickly looking up maps using their Bbox
 * @template W - The type of WarpedMap objects in this list
 */
export class WarpedMapList<W extends WarpedMap> extends EventTarget {
  warpedMapFactory: WarpedMapFactory<W>

  /**
   * Maps in this list, indexed by their ID
   */
  warpedMapsById: Map<string, W>
  zIndices: Map<string, number>

  rtree?: RTree

  options: Partial<WarpedMapListOptions>

  /**
   * Creates an instance of a WarpedMapList
   *
   * @constructor
   * @param warpedMapFactory - Factory function for creating WarpedMap objects
   * @param partialWarpedMapListOptions - Options
   */
  constructor(
    warpedMapFactory: WarpedMapFactory<W>,
    partialWarpedMapListOptions?: Partial<WarpedMapListOptions>
  ) {
    super()

    this.warpedMapsById = new Map()
    this.zIndices = new Map()

    this.warpedMapFactory = warpedMapFactory

    this.options = mergePartialOptions(
      defaultWarpedMapListOptions,
      partialWarpedMapListOptions
    )

    if (this.options.createRTree) {
      this.rtree = new RTree()
    }
  }

  /**
   * Get mapIds for selected maps
   *
   * Also allows to only select maps whose geoBbox overlaps with the specified geoBbox
   *
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   * @returns mapIds
   */
  getMapIds(
    partialSelectionOptions?: Partial<SelectionOptions>
  ): Iterable<string> {
    // Enable the same selection options when getting mapIds
    return Array.from(this.getWarpedMaps(partialSelectionOptions)).map(
      (warpedMap) => warpedMap.mapId
    )
  }

  /**
   * Get the WarpedMap instances for selected maps
   *
   * Also allows to only select maps whose geoBbox overlaps with the specified geoBbox
   *
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   * @returns WarpedMap instances
   */
  getWarpedMaps(
    partialSelectionOptions?: Partial<SelectionOptions>
  ): Iterable<W> {
    const selectionOptions = mergeOptions(
      defaultSelectionOptions,
      partialSelectionOptions
    )

    let mapIds
    if (selectionOptions.mapIds === undefined) {
      if (this.rtree && selectionOptions.geoBbox) {
        mapIds = this.rtree.searchFromBbox(selectionOptions.geoBbox)
      } else {
        mapIds = Array.from(this.warpedMapsById.keys())
      }
    } else {
      mapIds = selectionOptions.mapIds
    }

    const warpedMaps: W[] = []

    if (mapIds === undefined) {
      return warpedMaps
    }

    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (
        warpedMap &&
        (selectionOptions.onlyVisible ? warpedMap.visible : true)
      ) {
        warpedMaps.push(warpedMap)
      }
    }
    return warpedMaps
  }

  /**
   * Get the WarpedMap instance for a specific map
   *
   * @param mapId - Map ID of the requested WarpedMap instance
   * @returns WarpedMap instance, or undefined
   */
  getWarpedMap(mapId: string): W | undefined {
    return this.warpedMapsById.get(mapId)
  }

  /**
   * Get the z-index for a specific map
   *
   * @param mapId
   * @returns
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.zIndices.get(mapId)
  }

  /**
   * Get the center of the bounding box of the maps in this list
   *
   * Use {projection: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * @param partialSelectionAndProjectionOptions - Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection
   * @returns The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsCenter(
    partialSelectionAndProjectionOptions?: Partial<
      SelectionOptions & ProjectionOptions
    >
  ): Point | undefined {
    const bbox = this.getMapsBbox(partialSelectionAndProjectionOptions)
    if (bbox) {
      return bboxToCenter(bbox)
    }
  }

  /**
   * Get the bounding box of the maps in this list
   *
   * Use {projection: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * @param partialSelectionAndProjectionOptions - Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection
   * @returns The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsBbox(
    partialSelectionAndProjectionOptions?: Partial<
      SelectionOptions & ProjectionOptions
    >
  ): Bbox | undefined {
    // Note: we can't use the geoMaskBboxes since creating a bbox
    // gives a different result in a different projection

    const projectedGeoMaskPoints = this.getProjectedGeoMaskPoints(
      partialSelectionAndProjectionOptions
    )
    return computeBbox(projectedGeoMaskPoints)
  }

  /**
   * Get the convex hull of the maps in this list
   *
   * Use {projection: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * @param partialSelectionAndProjectionOptions - Selection (e.g. mapIds) and projection options, defaults to all visible maps and current projection
   * @returns The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsConvexHull(
    partialSelectionAndProjectionOptions?: Partial<
      SelectionOptions & ProjectionOptions
    >
  ): Ring | undefined {
    const projectedGeoMaskPoints = this.getProjectedGeoMaskPoints(
      partialSelectionAndProjectionOptions
    )
    return convexHull(projectedGeoMaskPoints)
  }

  /**
   * Sets the object that caches image information
   *
   * @param imageInformations - object that caches image information
   */
  setImageInformations(imageInformations: ImageInformations): void {
    this.options.imageInformations = imageInformations
  }

  /**
   * Sets the GCPs for a specific map
   *
   * @param gcps - new GCPs
   * @param mapId - ID of the map
   */
  setMapGcps(gcps: Gcp[], mapId: string): void {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      warpedMap.setGcps(gcps)
      this.addToOrUpdateRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.GCPSCHANGED, mapId)
      )
    }
  }

  /**
   * Sets the resource mask for a specific map
   *
   * @param resourceMask - the new resource mask
   * @param mapId - ID of the map
   */
  setMapResourceMask(resourceMask: Ring, mapId: string): void {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      warpedMap.setResourceMask(resourceMask)
      this.addToOrUpdateRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.RESOURCEMASKCHANGED, mapId)
      )
    }
  }

  /**
   * Sets the transformation type for a specific map
   *
   * @param transformationType - the new transformation type
   * @param mapId - the ID of the map
   */
  setMapTransformationType(
    transformationType: TransformationType,
    mapId: string
  ): void {
    this.setMapsTransformationType(transformationType, { mapIds: [mapId] })
  }

  /**
   * Sets the transformation type for selected maps
   *
   * @param transformationType - the new transformation type
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   */
  setMapsTransformationType(
    transformationType: TransformationType,
    partialSelectionOptions?: Partial<SelectionOptions>
  ): void {
    const mapIdsChanged = []
    const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
    for (const warpedMap of warpedMaps) {
      if (warpedMap.transformationType !== transformationType) {
        mapIdsChanged.push(warpedMap.mapId)
      }
    }

    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setTransformationType(transformationType)
          this.addToOrUpdateRtree(warpedMap)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(
          WarpedMapEventType.TRANSFORMATIONCHANGED,
          mapIdsChanged
        )
      )
    }
  }

  /**
   * Sets the distortionMeasure for a specific map
   *
   * @param distortionMeasure - the distortion measure
   * @param mapId - the ID of the map
   */
  setMapDistortionMeasure(
    distortionMeasure: DistortionMeasure | undefined,
    mapId: string
  ): void {
    this.setMapsDistortionMeasure(distortionMeasure, { mapIds: [mapId] })
  }

  /**
   * Sets the distortion measure for selected maps
   *
   * @param distortionMeasure - the distortion measure
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   */
  setMapsDistortionMeasure(
    distortionMeasure?: DistortionMeasure,
    partialSelectionOptions?: Partial<SelectionOptions>
  ): void {
    const mapIdsChanged = []
    const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
    for (const warpedMap of warpedMaps) {
      if (warpedMap.distortionMeasure !== distortionMeasure) {
        mapIdsChanged.push(warpedMap.mapId)
      }
    }
    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setDistortionMeasure(distortionMeasure)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.DISTORTIONCHANGED, mapIdsChanged)
      )
    }
  }

  /**
   * Sets the internal projection for a specific map
   *
   * @param projection - the internal projection
   * @param mapId - the ID of the map
   */
  setMapInternalProjection(projection: Projection, mapId: string): void {
    this.setMapsInternalProjection(projection, { mapIds: [mapId] })
  }

  /**
   * Sets the internal projection for selected maps
   *
   * @param projection - the internal projection
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   */
  setMapsInternalProjection(
    projection: Projection | undefined,
    partialSelectionOptions?: Partial<SelectionOptions>
  ): void {
    const mapIdsChanged = []
    const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
    for (const warpedMap of warpedMaps) {
      if (!equalProjection(warpedMap.internalProjection, projection)) {
        mapIdsChanged.push(warpedMap.mapId)
      }
    }
    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setInternalProjection(projection)
          this.addToOrUpdateRtree(warpedMap)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(
          WarpedMapEventType.INTERNALPROJECTIONCHANGED,
          mapIdsChanged
        )
      )
    }
  }

  /**
   * Sets the projection for a specific map
   *
   * @param projection - the projection
   * @param mapId - the ID of the map
   */
  setMapProjection(projection: Projection, mapId: string): void {
    this.setMapsProjection(projection, { mapIds: [mapId] })
  }

  /**
   * Sets the projection for selected maps
   *
   * @param projection - the projection
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   */
  setMapsProjection(
    projection: Projection | undefined,
    partialSelectionOptions?: Partial<SelectionOptions>
  ): void {
    const mapIdsChanged = []
    const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
    for (const warpedMap of warpedMaps) {
      if (!equalProjection(warpedMap.projection, projection)) {
        mapIdsChanged.push(warpedMap.mapId)
      }
    }
    if (mapIdsChanged.length > 0) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PRECHANGE, mapIdsChanged)
      )
      mapIdsChanged.forEach((mapId) => {
        const warpedMap = this.warpedMapsById.get(mapId)
        if (warpedMap) {
          warpedMap.setProjection(projection)
          this.addToOrUpdateRtree(warpedMap)
        }
      })
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PROJECTIONCHANGED, mapIdsChanged)
      )
    }
  }

  /**
   * Removes a warped map by its ID
   *
   * @param mapId - the ID of the map
   *
   * @param mapIds - Map IDs
   */
  removeGeoreferencedMapById(mapId: string) {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.removeGeoreferencedMap(warpedMap)
      this.removeFromRtree(warpedMap)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, mapId)
      )
    }
  }

  /**
   * Changes the z-index of the specified maps to bring them to front
   *
   * @param mapIds - Map IDs
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the z-index of the specified maps to send them to back
   *
   * @param mapIds - Map IDs
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the z-index of the specified maps to bring them forward
   *
   * @param mapIds - Map IDs
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the zIndex of the specified maps to send them backward
   *
   * @param mapIds - Map IDs
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
  }

  /**
   * Changes the visibility of the specified maps to `true`
   *
   * @param mapIds - Map IDs
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
   * @param mapIds - Map IDs
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
   * @param georeferencedMap
   * @returns
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMap)
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
   * @param georeferencedMap
   * @returns
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMap)
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
   * @param annotation
   * @returns
   */
  async addGeoreferenceAnnotation(annotation: unknown) {
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
    return results
  }

  /**
   * Parses an annotation and removes its georeferenced map from this list
   *
   * @param annotation
   * @returns
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

  destroy() {
    for (const warpedMap of this.getWarpedMaps()) {
      this.removeEventListenersFromWarpedMap(warpedMap)
      warpedMap.destroy()
    }

    this.clear()
  }

  private async addGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)

    const warpedMap = this.warpedMapFactory(
      mapId,
      georeferencedMap,
      this.options
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
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))

      warpedMap.destroy()
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

  private getProjectedGeoMaskPoints(
    partialSelectionAndProjectionOptions?: Partial<
      SelectionOptions & ProjectionOptions
    >
  ): Point[] {
    const warpedMaps = this.getWarpedMaps(partialSelectionAndProjectionOptions)

    // Project geoMask using projection, if specified in options
    // otherwise use available projectedGeoMask
    let projection = partialSelectionAndProjectionOptions?.projection
    if (projection) {
      let geoMaskPoints: Point[] = []
      for (const warpedMap of warpedMaps) {
        geoMaskPoints.push(...warpedMap.geoMask)
      }

      const projectedGeoMaskPoints = geoMaskPoints.map((point) =>
        proj4(projection, point)
      )
      return projectedGeoMaskPoints
    } else {
      let projectedGeoMaskPoints: Point[] = []
      for (const warpedMap of warpedMaps) {
        projectedGeoMaskPoints.push(...warpedMap.projectedGeoMask)
      }

      return projectedGeoMaskPoints
    }
  }

  private addToOrUpdateRtree(warpedMap: W): void {
    if (this.rtree) {
      this.rtree.removeItem(warpedMap.mapId)
      this.rtree.addItem(warpedMap.mapId, [warpedMap.geoMask])
    }
  }

  private removeFromRtree(warpedMap: W): void {
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

  // This function and the listeners below transform an IMAGEINFOLOADED event by a WarpedMap
  // to an IMAGEINFOLOADED of the WarpedMapList, which is listened to in the Renderer
  private imageInfoLoaded() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
  }

  private addEventListenersToWarpedMap(warpedMap: W) {
    warpedMap.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }

  private removeEventListenersFromWarpedMap(warpedMap: W) {
    warpedMap.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )
  }
}
