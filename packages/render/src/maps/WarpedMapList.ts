import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  validateGeoreferencedMap,
  type GeoreferencedMap
} from '@allmaps/annotation'
import { proj4 } from '@allmaps/project'

import { RTree } from './RTree.js'
import { WarpedMap } from './WarpedMap.js'

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
  SetOptionsOptions,
  SpecificWarpedMapListOptions,
  WarpedMapFactory,
  WarpedMapListOptions
} from '../shared/types.js'
import { WebGL2WarpedMap } from './WebGL2WarpedMap.js'

const defaultSelectionOptions: SelectionOptions = {}

const DEFAULT_SPECIFIC_WARPED_MAP_LIST_OPTIONS: SpecificWarpedMapListOptions = {
  createRTree: true,
  rtreeUpdatedOptions: [
    'gcps',
    'resourceMask',
    'transformationType',
    'internalProjection',
    'projection'
  ],
  animatedOptions: [
    'transformationType',
    'internalProjection',
    'distortionMeasure'
  ]
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

  options: WarpedMapListOptions

  /**
   * Creates an instance of a WarpedMapList
   *
   * @constructor
   * @param warpedMapFactory - Factory function for creating WarpedMap objects
   * @param options - Options of this list, which will be set on newly added maps as their list options
   */
  constructor(
    warpedMapFactory: WarpedMapFactory<W>,
    options?: Partial<WarpedMapListOptions>
  ) {
    super()

    this.warpedMapsById = new Map()
    this.zIndices = new Map()

    this.warpedMapFactory = warpedMapFactory

    this.options = mergeOptions(
      DEFAULT_SPECIFIC_WARPED_MAP_LIST_OPTIONS,
      options
    ) as WarpedMapListOptions

    if (this.options.createRTree) {
      this.rtree = new RTree()
    }
  }

  /**
   * Adds a georeferenced map to this list
   *
   * @param georeferencedMap
   * @returns Map ID of the map that was added
   */
  async addGeoreferencedMap(georeferencedMap: unknown): Promise<string> {
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
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      return this.removeGeoreferencedMap(warpedMap)
    }
  }

  /**
   * Parses an annotation and adds its georeferenced map to this list
   *
   * @param annotation
   * @returns Map IDs of the maps that were added, or an error per map
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
      defaultSelectionOptions,
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
   * The result is returned in the list's projection, `EPSG:3857` by default
   * Use {projection: {definition: 'EPSG:4326'}} to request the result in lon-lat `EPSG:4326`
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
   * The result is returned in the list's projection, `EPSG:3857` by default
   * Use {projection: {definition: 'EPSG:4326'}} to request the result in lon-lat `EPSG:4326`
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
   * The result is returned in the list's projection, `EPSG:3857` by default
   * Use {projection: {definition: 'EPSG:4326'}} to request the result in lon-lat `EPSG:4326`
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
  getDefaultOptions(): WarpedMapListOptions & GetWarpedMapOptions<W> {
    // Could we get default options from abstract type <W> instead of WebGL2WarpedMap?
    return mergeOptions(
      DEFAULT_SPECIFIC_WARPED_MAP_LIST_OPTIONS,
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
  getOptions(): Partial<WarpedMapListOptions> {
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
   * @param setOptionsOptions - Options when setting the options
   */
  setOptions(
    options?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    this.options = mergeOptions(this.options, options)
    this.internalSetMapsOptionsByMapId(undefined, options, setOptionsOptions)
  }

  /**
   * Set the map-specific options of maps (and the list options)
   *
   * @param mapIds - Map IDs for which the options apply
   * @param mapOptions - Map-specific options
   * @param listOptions - list options
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions?: Partial<WarpedMapListOptions>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    const optionsByMapId = new Map<
      string,
      Partial<WarpedMapListOptions> | undefined
    >()
    for (const mapId of mapIds) {
      optionsByMapId.set(mapId, mapOptions)
    }
    this.internalSetMapsOptionsByMapId(
      optionsByMapId,
      listOptions,
      setOptionsOptions
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
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptionsByMapId(
    mapOptionsByMapId?: Map<string, Partial<WarpedMapListOptions>>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    this.internalSetMapsOptionsByMapId(
      mapOptionsByMapId,
      listOptions,
      setOptionsOptions
    )
  }

  /**
   * Resets the list options
   *
   * An empty array resets all options, undefined resets no options.
   *
   * @param listOptionKeys - Keys of the list options to reset
   * @param setOptionsOptions - Options when setting the options
   */
  resetOptions(
    listOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    if (listOptionKeys && listOptionKeys.length == 0) {
      listOptionKeys = Object.keys(this.getDefaultOptions())
    }
    this.setOptions(
      optionKeysToUndefinedOptions(
        listOptionKeys
      ) as Partial<WarpedMapListOptions>,
      setOptionsOptions
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
   * @param setOptionsOptions - Options when setting the options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    listOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
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
      optionKeysToUndefinedOptions(
        mapOptionKeys
      ) as Partial<WarpedMapListOptions>,
      optionKeysToUndefinedOptions(
        listOptionKeys
      ) as Partial<WarpedMapListOptions>,
      setOptionsOptions
    )
  }

  /**
   * Resets the map-specific options of maps by map ID (and the list options)
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   *
   * @param mapOptionkeysByMapId - Keys of map-specific options to reset by map ID
   * @param listOptionKeys - Keys of the list options to reset
   * @param setOptionsOptions - Options when setting the options
   */
  resetMapsOptionsByMapId(
    mapOptionkeysByMapId?: Map<string, string[]>,
    listOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
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
        Partial<WarpedMapListOptions>
      >,
      optionKeysToUndefinedOptions(
        listOptionKeys
      ) as Partial<WarpedMapListOptions>,
      setOptionsOptions
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
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, { mapIds: [mapId] })
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
        projectedGeoMaskPoints.push(...warpedMap.projectedGeoMask)
      }

      return projectedGeoMaskPoints
    }
  }

  /**
   * Internal set map options
   */
  private internalSetMapsOptionsByMapId(
    mapOptionsByMapId?: Map<string, Partial<WarpedMapListOptions> | undefined>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    // If there are no maps yet, return
    if (this.warpedMapsById.size === 0 || mapOptionsByMapId?.size === 0) {
      return
    }

    // If the option setting should be animated,
    // prepare an upcoming change
    // (i.e. mix previous and current warped map properties if the animation is ongoing)
    if (setOptionsOptions?.animate !== undefined) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, {
          mapIds: this.getMapIds()
        })
      )
    }

    // We loop over all warped maps and set the maps options (if there are in mapOptionsByMapId)
    // and list options (if there are)

    // Some options can be set with animation.
    // When this function is called without specific animation options,
    // it sets options in two go's:
    // 1) first all options, exept those to be animated, and fire a direct change event
    // 2) then calls itself again with the 'animate' setting to now set all options
    // including those that will cause an animation, and fire an animated change event

    let changedOptionKeys = []
    const changedMapIds = []
    for (const warpedMap of this.getWarpedMaps()) {
      let warpedMapChangedOptions
      if (setOptionsOptions?.animate === undefined) {
        // If no animation information is specified,
        // set all options exect those for animation
        const mapOptions = mapOptionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setMapOptions(
          mapOptions,
          listOptions,
          {
            optionKeysToOmit: this.options.animatedOptions
          }
        )
      } else {
        // If the option setting should be animated,
        // or if the option setting should not be animated
        // set all options
        const mapOptions = mapOptionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setMapOptions(
          mapOptions,
          listOptions
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
      setOptionsOptions?.animate === undefined ||
      setOptionsOptions?.animate === false
    ) {
      // If no animation information is specified,
      // or if the option setting should not be animated
      // finish by firing a direct change
      if (changedOptionKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, {
            mapIds: changedMapIds,
            optionKeys: changedOptionKeys
          })
        )
      }

      if (setOptionsOptions?.animate === undefined) {
        // If no animation information is specified
        // set the options again but now all options and with animation
        this.internalSetMapsOptionsByMapId(
          mapOptionsByMapId,
          listOptions,
          mergePartialOptions(setOptionsOptions, {
            animate: true
          })
        )
      }
    } else {
      // If the option setting should be animated,
      // finish by firing the animation
      if (changedOptionKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, {
            mapIds: changedMapIds,
            optionKeys: changedOptionKeys
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

  // This function and the listeners below transform an IMAGEINFOLOADED event by a WarpedMap
  // to an IMAGEINFOLOADED of the WarpedMapList, which is listened to in the Renderer
  private imageInfoLoaded(mapId: string) {
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED, {
        mapIds: [mapId]
      })
    )
  }

  private addEventListenersToWarpedMap(warpedMap: W) {
    warpedMap.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this, warpedMap.mapId)
    )
  }

  private removeEventListenersFromWarpedMap(warpedMap: W) {
    warpedMap.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this, warpedMap.mapId)
    )
  }
}
