import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateGeoreferencedMap,
  type GeoreferencedMap
} from '@allmaps/annotation'
import { proj4, webMercatorProjection } from '@allmaps/project'
import { Image } from '@allmaps/iiif-parser'

import { RTree } from './RTree.js'
import { createWarpedMapFactory, WarpedMap } from './WarpedMap.js'
import { WebGL2WarpedMap } from './WebGL2WarpedMap.js'

import {
  bboxToCenter,
  computeBbox,
  convexHull,
  mergeOptions,
  mergePartialOptions,
  optionKeysByMapIdToUndefinedOptionsByMapId,
  optionKeysToUndefinedOptions
} from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { Ring, Bbox, Point } from '@allmaps/types'

import type {
  GetWarpedMapOptions,
  ProjectionOptions,
  SelectionOptions,
  AnimationOptions,
  WarpedMapListOptions,
  AnimationInternalOptions,
  AnimationStage
} from '../shared/types.js'

const DEFAULT_SELECTION_OPTIONS: SelectionOptions = {}
export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  animate: true,
  duration: 750
}
export const DEFAULT_ANIMATION_INTERNAL_OPTIONS: AnimationInternalOptions = {
  stage: 'pre'
}

/**
 * An ordered list of WarpedMaps. This class contains an optional RTree
 * for quickly looking up maps using their Bbox
 * @template W - The type of WarpedMap objects in this list
 */
export class WarpedMapList<W extends WarpedMap> extends EventTarget {
  /**
   * Maps in this list, indexed by their ID
   */
  DEFAULT_WARPED_MAP_LIST_OPTIONS: WarpedMapListOptions<W>

  warpedMapsById: Map<string, W>
  zIndices: Map<string, number>

  imagesById: Map<string, Image>

  rtree?: RTree

  options: WarpedMapListOptions<W>

  private boundImageLoadedByMapId: Map<string, EventListener> = new Map()

  /**
   * Creates an instance of a WarpedMapList
   *
   * @constructor
   * @param warpedMapFactory - Factory function for creating WarpedMap objects
   * @param options - Options of this list, which will be set on newly added maps as their list options
   */
  constructor(options?: Partial<WarpedMapListOptions<W>>) {
    super()

    this.DEFAULT_WARPED_MAP_LIST_OPTIONS = {
      createRTree: true,
      rtreeUpdatedOptions: [
        'gcps',
        'resourceMask',
        'transformationType',
        'internalProjection',
        'projection'
      ],
      animatedOptions: [
        'visible',
        'applyMask',
        'transformationType',
        'internalProjection',
        'distortionMeasure'
      ],
      projection: webMercatorProjection,
      warpedMapFactory: createWarpedMapFactory<W>()
    }

    this.warpedMapsById = new Map()
    this.zIndices = new Map()
    this.imagesById = new Map()

    this.options = mergeOptions(
      this.DEFAULT_WARPED_MAP_LIST_OPTIONS,
      options
    ) as WarpedMapListOptions<W>

    if (this.options.createRTree) {
      this.rtree = new RTree()
    }
  }

  /**
   * Adds a georeferenced map to this list
   *
   * @param georeferencedMap - Georeferenced Map
   * @param mapOptions - Map options
   * @returns Map ID of the map that was added
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ): Promise<string> {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMap)
    const validatedGeoreferencedMap = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps[0]
      : validatedGeoreferencedMapOrMaps
    return this.addGeoreferencedMapInternal(
      validatedGeoreferencedMap,
      mapOptions
    )
  }

  /**
   * Removes a georeferenced map from this list
   *
   * @param georeferencedMap
   * @returns Map ID of the removed map, or an error
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
   * Removes a georeferenced map from the list by its ID
   *
   * @param mapId - Map ID
   * @returns Map ID of the removed map, or an error
   */
  async removeGeoreferencedMapById(
    mapId: string
  ): Promise<string | Error | undefined> {
    return this.removeGeoreferencedMapByIdInternal(mapId)
  }

  /**
   * Parses an annotation and adds its georeferenced map to this list
   *
   * @param annotation - Annotation
   * @param mapOptions - Map options
   * @returns Map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    const results: (string | Error)[] = []
    const maps = parseAnnotation(annotation)
    const settledResults = await Promise.allSettled(
      maps.map((map) => this.addGeoreferencedMapInternal(map, mapOptions))
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  /**
   * Parses an annotation and removes its georeferenced map from this list
   *
   * @param annotation
   * @returns Map IDs of the maps that were removed, or an error per map
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

  /**
   * Update the maps in the list using the warpedMapFactory
   *
   * This function is used when creating a WarpedMapList from scratch
   * and later including it in a specific renderer (e.g. a WebGL2Renderer)
   * which has a specific warpedMapFactory (e.g. including the WebGL context)
   * which could not be applied in the initial WarpedMapList.
   * This function recreates the WarpedMaps using the factory.
   *
   * It is import to do this after the event listeners on the warpedmaplist
   * are added to the renderer, so the WARPEDMAPADDED event is passed.
   */
  updateWarpedMapsUsingFactory() {
    for (const warpedMap of this.warpedMapsById.values()) {
      const updatedWarpedMap = this.options.warpedMapFactory(
        warpedMap.mapId,
        warpedMap.georeferencedMap,
        this.options,
        warpedMap.mapOptions as Partial<GetWarpedMapOptions<W>>
      )

      this.warpedMapsById.set(warpedMap.mapId, updatedWarpedMap)

      // Note: zIndices don't have to be updated since they only use mapId
      // Note: RTree doesn't have to be updated since they only use mapId and geoMask

      this.addEventListenersToWarpedMap(updatedWarpedMap)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, {
          mapIds: [warpedMap.mapId]
        })
      )
    }

    return this
  }

  /**
   * Adds image informations, parses them to images and adds them to the image cache
   *
   * @param imageInfos - Image informations
   * @returns Image IDs of the image informations that were added
   */
  addImageInfos(imageInfos: unknown[]): string[] {
    const result = []
    for (const imageInfo of imageInfos) {
      const image = Image.parse(imageInfo)
      this.imagesById.set(image.uri, image)
      result.push(image.uri)
    }

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOSADDED))

    return result
  }

  /**
   * Get mapIds for selected maps
   *
   * The selectionOptions allow a.o. to:
   * - filter for visible maps
   * - filter for specific mapIds
   * - filter for maps whose geoBbox overlap with the specified geoBbox
   * - filter for maps that overlap with a given geoPoint
   *
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   * @returns mapIds
   */
  getMapIds(partialSelectionOptions?: Partial<SelectionOptions>): string[] {
    // Enable the same selection options when getting mapIds
    return Array.from(this.getWarpedMaps(partialSelectionOptions)).map(
      (warpedMap) => warpedMap.mapId
    )
  }

  /**
   * Get the WarpedMap instances for selected maps
   *
   * The selectionOptions allow a.o. to:
   * - filter for visible maps
   * - filter for specific mapIds
   * - filter for maps whose geoBbox overlap with the specified geoBbox
   * - filter for maps that overlap with a given geoPoint
   *
   * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
   * @returns WarpedMap instances
   */
  getWarpedMaps(
    partialSelectionOptions?: Partial<SelectionOptions>
  ): Iterable<W> {
    const selectionOptions = mergeOptions(
      DEFAULT_SELECTION_OPTIONS,
      partialSelectionOptions
    )

    let mapIds
    if (selectionOptions.mapIds === undefined) {
      if (this.rtree && selectionOptions.geoBbox) {
        mapIds = this.rtree.searchFromBbox(selectionOptions.geoBbox)
      } else if (this.rtree && selectionOptions.geoPoint) {
        mapIds = this.rtree.searchFromPoint(selectionOptions.geoPoint)
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
        (selectionOptions.onlyVisible ? warpedMap.options.visible : true)
      ) {
        warpedMaps.push(warpedMap)
      }
    }

    warpedMaps.sort((map0, map1) =>
      this.orderMapIdsByZIndex(map0.mapId, map1.mapId)
    )

    return warpedMaps
  }

  /**
   * Get the WarpedMap instance for a map
   *
   * @param mapId - Map ID of the requested WarpedMap instance
   * @returns WarpedMap instance, or undefined
   */
  getWarpedMap(mapId: string): W | undefined {
    return this.warpedMapsById.get(mapId)
  }

  /**
   * Get the center of the bounding box of the maps in this list
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
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
   * The result is returned in lon-lat `EPSG:4326` by default.
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

    if (projectedGeoMaskPoints.length === 0) {
      return
    }

    return computeBbox(projectedGeoMaskPoints)
  }

  /**
   * Get the convex hull of the maps in this list
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
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
   * Get the z-index of a map
   *
   * @param mapId - Map ID for which to get the z-index
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.zIndices.get(mapId)
  }

  /**
   * Get the default options of the list
   */
  getDefaultOptions(): WarpedMapListOptions<W> & GetWarpedMapOptions<W> {
    // Could we get default options from abstract type <W> instead of WebGL2WarpedMap?
    return mergeOptions(
      this.DEFAULT_WARPED_MAP_LIST_OPTIONS,
      WebGL2WarpedMap.getDefaultOptions() as GetWarpedMapOptions<W>
    )
  }

  /**
   * Get the default options of a map
   *
   * These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapDefaultOptions(mapId: string): GetWarpedMapOptions<W> | undefined {
    const warpedMap = this.getWarpedMap(mapId)
    return warpedMap?.getDefaultAndGeoreferencedMapOptions() as
      | GetWarpedMapOptions<W>
      | undefined
  }

  /**
   * Get the options of this list
   */
  getOptions(): Partial<WarpedMapListOptions<W>> {
    return this.options
  }

  /**
   * Get the map-specific options of a map
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMapOptions(mapId: string): Partial<GetWarpedMapOptions<W>> | undefined {
    const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
    const warpedMap = Array.from(warpedMaps)[0]
    return warpedMap?.mapOptions as GetWarpedMapOptions<W>
  }

  /**
   * Get the options of a map
   *
   * These options are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): GetWarpedMapOptions<W> | undefined {
    const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
    const warpedMap = Array.from(warpedMaps)[0]
    return warpedMap?.options as GetWarpedMapOptions<W>
  }

  /**
   * Set the options of this list
   *
   * Note: Map-specific options set here will be passed to newly added maps.
   *
   * @param options - List Options
   * @param animationOptions - Animation options
   */
  setOptions(
    options?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.options = mergeOptions(this.options, options)
    this.setMapsOptionsByMapIdInternal(undefined, options, animationOptions)
  }

  /**
   * Set the map-specific options of maps (and the list options)
   *
   * @param mapIds - Map IDs for which the options apply
   * @param mapOptions - Map-specific options
   * @param listOptions - list options
   * @param animationOptions - Animation options
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions?: Partial<WarpedMapListOptions<W>>,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    const optionsByMapId = new Map<
      string,
      Partial<WarpedMapListOptions<W>> | undefined
    >()
    for (const mapId of mapIds) {
      optionsByMapId.set(mapId, mapOptions)
    }
    this.setMapsOptionsByMapIdInternal(
      optionsByMapId,
      listOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of maps by map ID (and the list options)
   *
   * This is useful when when multiple (and possibly different)
   * map-specific options are changed at once,
   * but only one animation should be fired
   *
   * @param mapOptionsByMapId - Map-specific options by map ID
   * @param listOptions - List options
   * @param animationOptions - Animation options
   */
  setMapsOptionsByMapId(
    mapOptionsByMapId?: Map<string, Partial<WarpedMapListOptions<W>>>,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.setMapsOptionsByMapIdInternal(
      mapOptionsByMapId,
      listOptions,
      animationOptions
    )
  }

  /**
   * Resets the list options
   *
   * An empty array resets all options, undefined resets no options.
   *
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetOptions(
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    if (listOptionKeys && listOptionKeys.length == 0) {
      listOptionKeys = Object.keys(this.getDefaultOptions())
    }
    this.setOptions(
      optionKeysToUndefinedOptions(listOptionKeys) as Partial<
        WarpedMapListOptions<W>
      >,
      animationOptions
    )
  }

  /**
   * Resets the map-specific options of maps (and the list options)
   *
   * An empty array resets all options, undefined resets no options.
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    if (mapOptionKeys && mapOptionKeys.length == 0) {
      mapOptionKeys = Object.keys(this.getDefaultOptions())
    }
    // Note: undefined resets no options,
    // otherwise leaving out listOptionKeys would reset all list options
    if (listOptionKeys && listOptionKeys.length == 0) {
      listOptionKeys = Object.keys(this.getDefaultOptions())
    }
    this.setMapsOptions(
      mapIds,
      optionKeysToUndefinedOptions(mapOptionKeys) as Partial<
        WarpedMapListOptions<W>
      >,
      optionKeysToUndefinedOptions(listOptionKeys) as Partial<
        WarpedMapListOptions<W>
      >,
      animationOptions
    )
  }

  /**
   * Resets the map-specific options of maps by map ID (and the list options)
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   *
   * @param mapOptionkeysByMapId - Keys of map-specific options to reset by map ID
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptionsByMapId(
    mapOptionkeysByMapId?: Map<string, string[]>,
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    if (mapOptionkeysByMapId && mapOptionkeysByMapId.size == 0) {
      const mapIds = this.getMapIds()
      const defaultMapOptionsKeys = Object.keys(this.getDefaultOptions())
      for (const mapId of mapIds) {
        mapOptionkeysByMapId.set(mapId, defaultMapOptionsKeys)
      }
    }
    // Note: undefined resets no options,
    // otherwise leaving out listOptionKeys would reset all list options
    if (listOptionKeys && listOptionKeys.length == 0) {
      listOptionKeys = Object.keys(this.getDefaultOptions())
    }

    this.setMapsOptionsByMapId(
      optionKeysByMapIdToUndefinedOptionsByMapId(mapOptionkeysByMapId) as Map<
        string,
        Partial<WarpedMapListOptions<W>>
      >,
      optionKeysToUndefinedOptions(listOptionKeys) as Partial<
        WarpedMapListOptions<W>
      >,
      animationOptions
    )
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  /**
   * Order mapIds
   *
   * Use this as anonymous sort function in Array.prototype.sort()
   */
  orderMapIdsByZIndex(mapId0: string, mapId1: string): number {
    const zIndex0 = this.getMapZIndex(mapId0)
    const zIndex1 = this.getMapZIndex(mapId1)
    if (zIndex0 !== undefined && zIndex1 !== undefined) {
      return zIndex0 - zIndex1
    }
    return 0
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
    georeferencedMap: GeoreferencedMap,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)

    const warpedMap = this.options.warpedMapFactory(
      mapId,
      georeferencedMap,
      this.options,
      mapOptions
    )

    this.warpedMapsById.set(mapId, warpedMap)
    this.zIndices.set(mapId, this.warpedMapsById.size - 1)
    this.addToOrUpdateRtree(warpedMap)
    this.addEventListenersToWarpedMap(warpedMap)
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, { mapIds: [mapId] })
    )
    return mapId
  }

  private async removeGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap
  ): Promise<string> {
    const mapId = await this.getOrComputeMapId(georeferencedMap)
    return this.removeGeoreferencedMapByIdInternal(mapId)
  }

  private async removeGeoreferencedMapByIdInternal(
    mapId: string
  ): Promise<string> {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.warpedMapsById.delete(mapId)
      this.zIndices.delete(mapId)
      this.removeFromRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, {
          mapIds: [mapId]
        })
      )
      this.removeZIndexHoles()
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))

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
    const projection = partialSelectionAndProjectionOptions?.projection
    if (projection) {
      const geoMaskPoints: Point[] = []
      for (const warpedMap of warpedMaps) {
        geoMaskPoints.push(...warpedMap.geoMask)
      }

      const projectedGeoMaskPoints = geoMaskPoints.map((point) =>
        proj4(projection.definition, point)
      )
      return projectedGeoMaskPoints
    } else {
      const projectedGeoMaskPoints: Point[] = []
      for (const warpedMap of warpedMaps) {
        projectedGeoMaskPoints.push(...warpedMap.geoMask)
      }

      return projectedGeoMaskPoints
    }
  }

  /**
   * Internal set map options
   */
  private setMapsOptionsByMapIdInternal(
    mapOptionsByMapId?: Map<
      string,
      Partial<WarpedMapListOptions<W>> | undefined
    >,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    partialAnimationOptions?: Partial<AnimationOptions> &
      Partial<AnimationInternalOptions>
  ): void {
    // If there are no maps yet, return
    if (this.warpedMapsById.size === 0 || mapOptionsByMapId?.size === 0) {
      return
    }

    const animationOptions = mergeOptions(
      mergeOptions(
        DEFAULT_ANIMATION_OPTIONS,
        DEFAULT_ANIMATION_INTERNAL_OPTIONS
      ),
      partialAnimationOptions
    )

    // If this function is called in the 'animate' stage.
    // prepare an upcoming change
    // (i.e. mix previous and current warped map properties if the animation is ongoing)
    // TODO: can we omit also executing this when animationOptions.animate is false?
    if (
      (animationOptions.animate && animationOptions.stage == 'animate') ||
      !animationOptions.animate
    ) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, {
          mapIds: this.getMapIds()
        })
      )
    }

    // We loop over all warped maps and set the maps options (if there are in mapOptionsByMapId)
    // and list options (if there are)

    // Animation options:
    //
    // When this function is called with { animate: true }, it sets options in two go's:
    //
    // 1) first the 'pre' stage is run:
    // this function sets all options, exept those to be animated,
    // and fires an immediate change event
    //
    // Then this function calls itself again with the 'animate' stage
    //
    // 2) When the 'animate' stage is run:
    // this function now sets all options, including those that will cause an animation,
    // and fires an animated change event
    //
    // When this function is called with { animate: false }, all options are set
    // and a immedite change event is fired where all options are changed immediately

    let changedOptionKeys = []
    const changedMapIds = []
    for (const warpedMap of this.getWarpedMaps()) {
      let warpedMapChangedOptions = {}
      if (animationOptions.animate && animationOptions.stage == 'pre') {
        // If animating and in the 'pre' stage: set all options except those to be animated
        const mapOptions = mapOptionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setMapOptions(
          mapOptions,
          listOptions,
          mergePartialOptions(animationOptions, {
            optionKeysToOmit:
              animationOptions.animatedOptions ?? this.options.animatedOptions
          })
        )
      }
      if (
        (animationOptions.animate && animationOptions.stage == 'animate') ||
        !animationOptions.animate
      ) {
        // If animating and in the 'animate' stage, or if not animating: set all options
        const mapOptions = mapOptionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setMapOptions(
          mapOptions,
          listOptions,
          animationOptions
        )
      }

      const warpedMapChangedOptionKeys = Object.keys(warpedMapChangedOptions)
      if (warpedMapChangedOptionKeys.length > 0) {
        changedOptionKeys.push(...warpedMapChangedOptionKeys)
        changedMapIds.push(warpedMap.mapId)
      }

      // Update RTree if necessary
      if (
        this.options.rtreeUpdatedOptions.some(
          (option) => option in warpedMapChangedOptions
        )
      ) {
        this.addToOrUpdateRtree(warpedMap)
      }
    }

    // Make option keys unique
    changedOptionKeys = Array.from(new Set(changedOptionKeys))

    if (
      (animationOptions.animate && animationOptions.stage == 'pre') ||
      !animationOptions.animate
    ) {
      // If animating and in the 'pre' stage, or if not animating: finish by firing a direct change
      if (changedOptionKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, {
            mapIds: changedMapIds,
            optionKeys: changedOptionKeys
          })
        )
      }

      if (animationOptions.animate && animationOptions.stage == 'pre') {
        // If animating and in the 'pre' stage:
        // call this function again but now all options and with animation
        this.setMapsOptionsByMapIdInternal(
          mapOptionsByMapId,
          listOptions,
          mergePartialOptions(animationOptions, {
            stage: 'animate'
          } as { stage: AnimationStage })
        )
      }
    }
    if (animationOptions.animate && animationOptions.stage == 'animate') {
      // If animating and in the 'animate' stage:
      // finish by firing the animation
      if (changedOptionKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, {
            mapIds: changedMapIds,
            optionKeys: changedOptionKeys,
            animationOptions: animationOptions
          })
        )
      }
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

  // This function and the listeners below transform an IMAGELOADED event by a WarpedMap
  // to an IMAGELOADED of the WarpedMapList, which is listened to in the Renderer
  private imageLoaded(mapId: string) {
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.IMAGELOADED, {
        mapIds: [mapId]
      })
    )
  }

  private addEventListenersToWarpedMap(warpedMap: W) {
    const bound = this.imageLoaded.bind(this, warpedMap.mapId)
    this.boundImageLoadedByMapId.set(warpedMap.mapId, bound)

    warpedMap.addEventListener(WarpedMapEventType.IMAGELOADED, bound)
  }

  private removeEventListenersFromWarpedMap(warpedMap: W) {
    const bound = this.boundImageLoadedByMapId.get(warpedMap.mapId)
    if (bound) {
      warpedMap.removeEventListener(WarpedMapEventType.IMAGELOADED, bound)
      this.boundImageLoadedByMapId.delete(warpedMap.mapId)
    }
  }
}
