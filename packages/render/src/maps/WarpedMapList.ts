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
   * @param options - Options
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
  async removeGeoreferencedMapById(mapId: string) {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.removeGeoreferencedMap(warpedMap)
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
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.ZINDICESCHANGED))
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
        (selectionOptions.onlyVisible ? warpedMap.mergedOptions.visible : true)
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
   * Get the WarpedMap instance for a specific map
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
   * Get the z-index of a specific map ID
   *
   * @param mapId - Map ID for which to get the z-index
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.zIndices.get(mapId)
  }

  /**
   * Get the default options of this list
   */
  getDefaultOptions(): WarpedMapListOptions {
    return DEFAULT_SPECIFIC_WARPED_MAP_LIST_OPTIONS as WarpedMapListOptions
  }

  /**
   * Get the default map options
   */
  getDefaultMapOptions(): Partial<GetWarpedMapOptions<W>> {
    return {}
  }

  /**
   * Get the default map merged options
   *
   * @param mapId - Map ID for which the options apply
   */
  getDefaultMapMergedOptions(): GetWarpedMapOptions<W>
  getDefaultMapMergedOptions(mapId?: string): GetWarpedMapOptions<W> | undefined
  getDefaultMapMergedOptions(
    mapId?: string
  ): GetWarpedMapOptions<W> | undefined {
    if (mapId) {
      const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
      const warpedMap = Array.from(warpedMaps)[0]
      return warpedMap?.getDefaultAndGeoreferencedMapOptions() as GetWarpedMapOptions<W>
    } else {
      // Could we get default options from abstract type <W> instead of WebGL2WarpedMap?
      return WebGL2WarpedMap.getDefaultOptions() as GetWarpedMapOptions<W>
    }
  }

  /**
   * Get the options of this list
   */
  getOptions(): Partial<WarpedMapListOptions> {
    return this.options
  }

  /**
   * Get the map merged options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): Partial<GetWarpedMapOptions<W>> | undefined {
    const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
    const warpedMap = Array.from(warpedMaps)[0]
    return warpedMap?.options as GetWarpedMapOptions<W>
  }

  /**
   * Get the map merged options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMergedOptions(mapId: string): GetWarpedMapOptions<W> | undefined {
    const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
    const warpedMap = Array.from(warpedMaps)[0]
    return warpedMap?.mergedOptions as GetWarpedMapOptions<W>
  }

  /**
   * Set the options of this list
   *
   * Map-specific options will be passed to newly added maps.
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
    const test: Partial<WarpedMapListOptions> = {
      visible: true
    }
  }

  /**
   * Set the map options of specific map IDs
   *
   * @param mapIds - Map IDs for which the options apply
   * @param options - Options
   * @param listOptions - list options
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptions(
    mapIds: string[],
    options?: Partial<WarpedMapListOptions>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    const optionsByMapId = new Map<
      string,
      Partial<WarpedMapListOptions> | undefined
    >()
    for (const mapId of mapIds) {
      optionsByMapId.set(mapId, options)
    }
    this.internalSetMapsOptionsByMapId(
      optionsByMapId,
      listOptions,
      setOptionsOptions
    )
  }

  /**
   * Set the map options of specific maps by map ID
   *
   * This is useful when when multiple (and possibly different)
   * map options are changed at once,
   * but only one animation should be fired
   *
   * @param optionsByMapId - Options by map ID
   * @param listOptions - List options
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptionsByMapId(
    optionsByMapId?: Map<string, Partial<WarpedMapListOptions>>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    this.internalSetMapsOptionsByMapId(
      optionsByMapId,
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
   * Resets the map options of specific map IDs
   *
   * An empty array resets all options, undefined resets no options.
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map options to reset
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
      mapOptionKeys = Object.keys(this.getDefaultMapMergedOptions())
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
   * Resets the map options of specific maps by map ID
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   *
   * @param mapOptionkeysByMapId - Keys of map options to reset by map ID
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
      const defaultMapOptionsKeys = Object.keys(
        this.getDefaultMapMergedOptions()
      )
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

  // /**
  //  * Sets the object that caches image information
  //  *
  //  * @param imageInfos - object that caches image information
  //  */
  // setImageInformations(imageInfos: ImageInfoByMapId): void {
  //   this.options.imageInfos = imageInfos
  // }

  // /**
  //  * Sets the GCPs for a specific map
  //  *
  //  * @param gcps - new GCPs
  //  * @param mapId - Map ID
  //  */
  // setMapGcps(gcps: Gcp[], mapId: string): void {
  //   const warpedMap = this.warpedMapsById.get(mapId)
  //   if (warpedMap) {
  //     warpedMap.setOptions({ gcps })
  //     this.addToOrUpdateRtree(warpedMap)
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, mapId)
  //     )
  //   }
  // }

  // /**
  //  * Sets the resource mask for a specific map
  //  *
  //  * @param resourceMask - the new resource mask
  //  * @param mapId - Map ID
  //  */
  // setMapResourceMask(resourceMask: Ring, mapId: string): void {
  //   const warpedMap = this.warpedMapsById.get(mapId)
  //   if (warpedMap) {
  //     warpedMap.setOptions({ resourceMask })
  //     this.addToOrUpdateRtree(warpedMap)
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, mapId)
  //     )
  //   }
  // }

  // /**
  //  * Sets the transformation type for a specific map
  //  *
  //  * @param transformationType - the new transformation type
  //  * @param mapId - Map ID
  //  */
  // setMapTransformationType(
  //   transformationType: TransformationType,
  //   mapId: string
  // ): void {
  //   this.setMapsTransformationType(transformationType, { mapIds: [mapId] })
  // }

  // /**
  //  * Sets the transformation type for selected maps
  //  *
  //  * @param transformationType - the new transformation type
  //  * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
  //  */
  // setMapsTransformationType(
  //   transformationType: TransformationType,
  //   partialSelectionOptions?: Partial<SelectionOptions>
  // ): void {
  //   const mapIdsChanged = []
  //   const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
  //   for (const warpedMap of warpedMaps) {
  //     if (warpedMap.transformationType !== transformationType) {
  //       mapIdsChanged.push(warpedMap.mapId)
  //     }
  //   }

  //   if (mapIdsChanged.length > 0) {
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, mapIdsChanged)
  //     )
  //     mapIdsChanged.forEach((mapId) => {
  //       const warpedMap = this.warpedMapsById.get(mapId)
  //       if (warpedMap) {
  //         warpedMap.setOptions({ transformationType })
  //         this.addToOrUpdateRtree(warpedMap)
  //       }
  //     })
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, mapIdsChanged)
  //     )
  //   }
  // }

  // /**
  //  * Sets the distortionMeasure for a specific map
  //  *
  //  * @param distortionMeasure - the distortion measure
  //  * @param mapId - Map ID
  //  */
  // setMapDistortionMeasure(
  //   distortionMeasure: DistortionMeasure | undefined,
  //   mapId: string
  // ): void {
  //   this.setMapsDistortionMeasure(distortionMeasure, { mapIds: [mapId] })
  // }

  // /**
  //  * Sets the distortion measure for selected maps
  //  *
  //  * @param distortionMeasure - the distortion measure
  //  * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
  //  */
  // setMapsDistortionMeasure(
  //   distortionMeasure?: DistortionMeasure,
  //   partialSelectionOptions?: Partial<SelectionOptions>
  // ): void {
  //   const mapIdsChanged = []
  //   const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
  //   for (const warpedMap of warpedMaps) {
  //     if (warpedMap.distortionMeasure !== distortionMeasure) {
  //       mapIdsChanged.push(warpedMap.mapId)
  //     }
  //   }
  //   if (mapIdsChanged.length > 0) {
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, mapIdsChanged)
  //     )
  //     mapIdsChanged.forEach((mapId) => {
  //       const warpedMap = this.warpedMapsById.get(mapId)
  //       if (warpedMap) {
  //         warpedMap.setOptions({ distortionMeasure })
  //       }
  //     })
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, mapIdsChanged)
  //     )
  //   }
  // }

  // /**
  //  * Sets the internal projection for a specific map
  //  *
  //  * @param projection - the internal projection
  //  * @param mapId - Map ID
  //  */
  // setMapInternalProjection(projection: Projection, mapId: string): void {
  //   this.setMapsInternalProjection(projection, { mapIds: [mapId] })
  // }

  // /**
  //  * Sets the internal projection for selected maps
  //  *
  //  * @param projection - the internal projection
  //  * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
  //  */
  // setMapsInternalProjection(
  //   projection: Projection | undefined,
  //   partialSelectionOptions?: Partial<SelectionOptions>
  // ): void {
  //   const mapIdsChanged = []
  //   const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
  //   for (const warpedMap of warpedMaps) {
  //     if (!isEqualProjection(warpedMap.internalProjection, projection)) {
  //       mapIdsChanged.push(warpedMap.mapId)
  //     }
  //   }
  //   if (mapIdsChanged.length > 0) {
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, mapIdsChanged)
  //     )
  //     mapIdsChanged.forEach((mapId) => {
  //       const warpedMap = this.warpedMapsById.get(mapId)
  //       if (warpedMap) {
  //         warpedMap.setOptions({ internalProjection: projection })
  //         this.addToOrUpdateRtree(warpedMap)
  //       }
  //     })
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, mapIdsChanged)
  //     )
  //   }
  // }

  // /**
  //  * Sets the projection for a specific map
  //  *
  //  * @param projection - the projection
  //  * @param mapId - Map ID
  //  */
  // setMapProjection(projection: Projection, mapId: string): void {
  //   this.setMapsProjection(projection, { mapIds: [mapId] })
  // }

  // /**
  //  * Sets the projection for selected maps
  //  *
  //  * @param projection - the projection
  //  * @param partialSelectionOptions - Selection options (e.g. mapIds), defaults to all visible maps
  //  */
  // setMapsProjection(
  //   projection: Projection | undefined,
  //   partialSelectionOptions?: Partial<SelectionOptions>
  // ): void {
  //   const mapIdsChanged = []
  //   const warpedMaps = this.getWarpedMaps(partialSelectionOptions)
  //   for (const warpedMap of warpedMaps) {
  //     if (!isEqualProjection(warpedMap.projection, projection)) {
  //       mapIdsChanged.push(warpedMap.mapId)
  //     }
  //   }
  //   if (mapIdsChanged.length > 0) {
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, mapIdsChanged)
  //     )
  //     mapIdsChanged.forEach((mapId) => {
  //       const warpedMap = this.warpedMapsById.get(mapId)
  //       if (warpedMap) {
  //         warpedMap.setOptions({ projection })
  //         this.addToOrUpdateRtree(warpedMap)
  //       }
  //     })
  //     this.dispatchEvent(
  //       new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, mapIdsChanged)
  //     )
  //   }
  // }

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
    optionsByMapId?: Map<string, Partial<WarpedMapListOptions> | undefined>,
    listOptions?: Partial<WarpedMapListOptions>,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ): void {
    // If there are no maps yet, return
    if (this.warpedMapsById.size === 0 || optionsByMapId?.size === 0) {
      return
    }

    // We loop over all warped maps and set the maps options (if there are inoptionsByMapId)
    // and list options (if there are)

    // Some options can be set with animation.
    // When this function is called without specific animation options,
    // it sets options in two go's:
    // 1) first all options, exept those to be animated, and fire a direct change event
    // 2) then calls itself again with the 'animate' setting to now set all options
    // including those that will cause an animation, and fire an animated change event

    let changedOptionsKeys = []
    let changedMapIds = []
    for (const warpedMap of this.getWarpedMaps()) {
      let warpedMapChangedOptions
      if (setOptionsOptions?.animate === undefined) {
        // If no animation information is specified,
        // set all options exect those for animation
        const options = optionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setOptions(options, listOptions, {
          optionKeysToOmit: this.options.animatedOptions
        })
      } else {
        // If the option setting should be animated,
        // or if the option setting should not be animated
        // set all options
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.PREPARECHANGE, changedMapIds)
        )
        const options = optionsByMapId?.get(warpedMap.mapId)
        warpedMapChangedOptions = warpedMap.setOptions(options, listOptions)
      }

      const warpedMapChangedOptionsKeys = Object.keys(warpedMapChangedOptions)
      if (warpedMapChangedOptionsKeys.length > 0) {
        changedOptionsKeys.push(...warpedMapChangedOptionsKeys)
        changedMapIds.push(warpedMap.mapId)
      }

      if (
        this.options.rtreeUpdatedOptions.some(
          (option) => option in warpedMapChangedOptions
        )
      ) {
        this.addToOrUpdateRtree(warpedMap)
      }
    }

    if (
      setOptionsOptions?.animate === undefined ||
      setOptionsOptions?.animate === false
    ) {
      // If no animation information is specified,
      // or if the option setting should not be animated
      // finish by firing a direct change
      if (changedOptionsKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.IMMEDIATECHANGE, changedMapIds)
        )
      }

      if (setOptionsOptions?.animate === undefined) {
        // If no animation information is specified
        // set the options again but now all options and with animation
        this.internalSetMapsOptionsByMapId(
          optionsByMapId,
          listOptions,
          mergePartialOptions(setOptionsOptions, {
            animate: true
          })
        )
      }
    } else {
      // If the option setting should be animated,
      // finish by firing the animation
      if (changedOptionsKeys.length > 0) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.ANIMATEDCHANGE, changedMapIds)
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
