import proj4 from 'proj4'
import inside from 'point-in-polygon-hao'

import { generateChecksum } from '@allmaps/id/sync'
import {
  parseAnnotation,
  validateGeoreferencedMap,
  type GeoreferencedMap
} from '@allmaps/annotation'
import {
  isEqualProjection,
  lonLatProjection,
  webMercatorProjection
} from '@allmaps/project'
import { Image } from '@allmaps/iiif-parser'

import { RTree } from './RTree.js'
import { createWarpedMapFactory, WarpedMap } from './WarpedMap.js'
import { WebGL2WarpedMap } from './WebGL2WarpedMap.js'

import {
  bboxToCenter,
  bboxToLine,
  closePolygon,
  computeBbox,
  convexHull,
  doBboxesIntersect,
  mergeOptions,
  mergePartialOptions,
  optionKeysToUndefinedOptions,
  pointInBbox
} from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'

import type { Ring, Bbox, Point } from '@allmaps/types'
import type { Projection } from '@allmaps/project'

import type {
  GetWarpedMapOptions,
  ProjectionOptions,
  SelectionOptions,
  AnimationOptions,
  WarpedMapListOptions,
  AnimationInternalOptions,
  AnimationStage,
  WebGL2WarpedMapOptions
} from '../shared/types.js'

const DEFAULT_SELECTION_OPTIONS: SelectionOptions = { applyMask: true }
export const DEFAULT_ANIMATION_OPTIONS: AnimationOptions = {
  animate: true,
  duration: 300
}
export const DEFAULT_ANIMATION_INTERNAL_OPTIONS: AnimationInternalOptions = {
  stage: 'pre'
}

function ensureError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
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

  geoMaskRTree?: RTree
  geoFullMaskRTree?: RTree
  projectedGeoMaskRTree?: RTree
  projectedGeoFullMaskRTree?: RTree

  options: WarpedMapListOptions<W>

  #boundImageLoadedByMapId: Map<string, EventListener>

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
    this.#boundImageLoadedByMapId = new Map()

    this.options = mergeOptions(
      this.DEFAULT_WARPED_MAP_LIST_OPTIONS,
      options
    ) as WarpedMapListOptions<W>

    if (this.options.createRTree) {
      this.geoMaskRTree = new RTree()
      this.geoFullMaskRTree = new RTree()
      this.projectedGeoMaskRTree = new RTree()
      this.projectedGeoFullMaskRTree = new RTree()
    }
  }

  /**
   * Adds a georeferenced map to this list
   *
   * @param georeferencedMap - Georeferenced Map
   * @param mapOptions - Map options
   * @returns Map ID of the map that was added
   */
  addGeoreferencedMap(
    georeferencedMap: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ): string {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMap)

    if (Array.isArray(validatedGeoreferencedMapOrMaps)) {
      throw new Error(
        'Expected a single georeferenced map, but got an array of georeferenced maps. Please use addGeoreferencedMaps to add multiple maps at once.'
      )
    }

    const validatedGeoreferencedMap = validatedGeoreferencedMapOrMaps

    const results = this.#addGeoreferencedMapInternal(
      validatedGeoreferencedMap,
      mapOptions
    )

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  addGeoreferencedMaps(
    georeferencedMaps: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMaps)

    const validatedGeoreferencedMaps = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps
      : [validatedGeoreferencedMapOrMaps]

    const results = this.#addGeoreferencedMapsInternal(
      validatedGeoreferencedMaps,
      mapOptions
    )

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  /**
   * Removes a georeferenced map from this list
   *
   * @param georeferencedMap
   * @returns Map ID of the removed map, or an error
   */
  removeGeoreferencedMap(georeferencedMap: unknown): string {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMap)

    if (Array.isArray(validatedGeoreferencedMapOrMaps)) {
      throw new Error(
        'Expected a single georeferenced map, but got an array of georeferenced maps. Please use addGeoreferencedMaps to add multiple maps at once.'
      )
    }

    const validatedGeoreferencedMap = validatedGeoreferencedMapOrMaps
    const results = this.#removeGeoreferencedMapInternal(
      validatedGeoreferencedMap
    )
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  removeGeoreferencedMaps(georeferencedMaps: unknown): (string | Error)[] {
    const validatedGeoreferencedMapOrMaps =
      validateGeoreferencedMap(georeferencedMaps)

    const validatedGeoreferencedMaps = Array.isArray(
      validatedGeoreferencedMapOrMaps
    )
      ? validatedGeoreferencedMapOrMaps
      : [validatedGeoreferencedMapOrMaps]

    const results = this.#removeGeoreferencedMapsInternal(
      validatedGeoreferencedMaps
    )

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  /**
   * Removes a georeferenced map from the list by its ID
   *
   * @param mapId - Map ID
   * @returns Map ID of the removed map, or an error
   */
  removeGeoreferencedMapById(mapId: string): string {
    const result = this.#removeGeoreferencedMapByIdInternal(mapId)
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return result
  }

  /**
   * Parses an annotation and adds its georeferenced map to this list
   *
   * @param annotation - Annotation
   * @param mapOptions - Map options
   * @returns Map IDs of the maps that were added, or an error per map
   */
  addGeoreferenceAnnotation(
    annotation: unknown,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    const maps = parseAnnotation(annotation)
    const results = this.#addGeoreferencedMapsInternal(maps, mapOptions)
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    return results
  }

  /**
   * Parses an annotation and removes its georeferenced map from this list
   *
   * @param annotation
   * @returns Map IDs of the maps that were removed, or an error per map
   */
  removeGeoreferenceAnnotation(annotation: unknown): (string | Error)[] {
    const maps = parseAnnotation(annotation)
    const results = this.#removeGeoreferencedMapsInternal(maps)
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
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

      this.#addEventListenersToWarpedMap(updatedWarpedMap)

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
   * The options allow a.o. to:
   * - filter for visible maps
   * - filter for specific mapIds
   * - filter for maps that overlap with a given point. Use geoPoint or projectedGeoPoint. Optionally specify projection for projectedGeoPoint. Optionally specify whether mask should be applied when computing overlap using applyMask.
   * - filter for maps whose bbox overlap with the specified bbox. Use geoBbox or projectedGeoBbox. Optionally specify projection for projectedGeoBbox. Optionally specify whether mask should be applied when computing overlap using applyMask.
   *
   * @param partialOptions - Selection, mask and projection options, defaults to all visible maps, applied mask and current projection
   * @returns mapIds
   */
  getMapIds(partialOptions?: Partial<SelectionOptions>): string[] {
    // Enable the same selection options when getting mapIds
    return this.getWarpedMaps(partialOptions).map(
      (warpedMap) => warpedMap.mapId
    )
  }

  /**
   * Get the WarpedMap instances for selected maps
   *
   * The options allow a.o. to:
   * - filter for visible maps
   * - filter for specific mapIds
   * - filter for maps that overlap with a given point. Use geoPoint or projectedGeoPoint. Optionally specify projection for projectedGeoPoint. Optionally specify whether mask should be applied when computing overlap using applyMask.
   * - filter for maps whose bbox overlap with the specified bbox. Use geoBbox or projectedGeoBbox. Optionally specify projection for projectedGeoBbox. Optionally specify whether mask should be applied when computing overlap using applyMask.
   *
   * @param partialOptions - Selection, mask and projection options, defaults to all visible maps, applied mask and current projection
   * @returns WarpedMap instances
   */
  getWarpedMaps(
    partialOptions?: Partial<SelectionOptions & ProjectionOptions>
  ): Array<W> {
    const options = mergeOptions(
      mergeOptions(DEFAULT_SELECTION_OPTIONS, {
        projection: this.options.projection
      }),
      partialOptions
    )

    let mapIds
    if (options.mapIds === undefined) {
      if (options.geoPoint) {
        // Select by geoPoint
        if (options.applyMask) {
          mapIds =
            this.geoMaskRTree?.searchFromPoint(options.geoPoint) ??
            this.#getMapIdsFromPoint(
              options.geoPoint,
              (warpedMap) => warpedMap.geoMaskBbox,
              (warpedMap) => warpedMap.geoMask
            )
        } else {
          mapIds =
            this.geoFullMaskRTree?.searchFromPoint(options.geoPoint) ??
            this.#getMapIdsFromPoint(
              options.geoPoint,
              (warpedMap) => warpedMap.geoFullMaskBbox,
              (warpedMap) => warpedMap.geoFullMask
            )
        }
      } else if (options.geoBbox) {
        // Select by geoBbox
        if (options.applyMask) {
          mapIds =
            this.geoMaskRTree?.searchFromBbox(options.geoBbox) ??
            this.#getMapIdsFromBbox(
              options.geoBbox,
              (warpedMap) => warpedMap.geoMaskBbox
            )
        } else {
          mapIds =
            this.geoFullMaskRTree?.searchFromBbox(options.geoBbox) ??
            this.#getMapIdsFromBbox(
              options.geoBbox,
              (warpedMap) => warpedMap.geoFullMaskBbox
            )
        }
      } else if (options.projectedGeoPoint) {
        // Select by projectedGeoPoint
        const projectedGeoPoint = WarpedMapList.projectPointIfNeeded(
          this.options.projection,
          options.projection,
          options.projectedGeoPoint
        )
        if (options.applyMask) {
          mapIds =
            this.projectedGeoMaskRTree?.searchFromPoint(projectedGeoPoint) ??
            this.#getMapIdsFromPoint(
              projectedGeoPoint,
              (warpedMap) => warpedMap.projectedGeoMaskBbox,
              (warpedMap) => warpedMap.projectedGeoMask
            )
        } else {
          mapIds =
            this.projectedGeoFullMaskRTree?.searchFromPoint(
              projectedGeoPoint
            ) ??
            this.#getMapIdsFromPoint(
              projectedGeoPoint,
              (warpedMap) => warpedMap.projectedGeoFullMaskBbox,
              (warpedMap) => warpedMap.projectedGeoFullMask
            )
        }
      } else if (options.projectedGeoBbox) {
        // Select by projectedGeoBbox
        const projectedGeoBbox = WarpedMapList.projectBboxIfNeeded(
          this.options.projection,
          options.projection,
          options.projectedGeoBbox
        )
        if (options.applyMask) {
          mapIds =
            this.projectedGeoMaskRTree?.searchFromBbox(projectedGeoBbox) ??
            this.#getMapIdsFromBbox(
              projectedGeoBbox,
              (warpedMap) => warpedMap.projectedGeoMaskBbox
            )
        } else {
          mapIds =
            this.projectedGeoFullMaskRTree?.searchFromBbox(projectedGeoBbox) ??
            this.#getMapIdsFromBbox(
              projectedGeoBbox,
              (warpedMap) => warpedMap.projectedGeoFullMaskBbox
            )
        }
      } else {
        // Select all
        mapIds = Array.from(this.warpedMapsById.keys())
      }
    } else {
      // Select specified
      mapIds = options.mapIds
    }

    const warpedMaps: W[] = []

    // If failed to find maps, return empty
    if (mapIds === undefined) {
      return warpedMaps
    }

    // Limit to visible
    for (const mapId of mapIds) {
      const warpedMap = this.warpedMapsById.get(mapId)
      if (
        warpedMap &&
        (options.onlyVisible ? warpedMap.options.visible : true)
      ) {
        warpedMaps.push(warpedMap)
      }
    }

    // Sort by Z-index
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
   * @param options - Selection, mask and projection options, defaults to all visible maps, applied mask and current projection
   * @returns The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsCenter(
    options?: Partial<SelectionOptions & ProjectionOptions>
  ): Point | undefined {
    const bbox = this.getMapsBbox(options)
    if (bbox) {
      return bboxToCenter(bbox)
    }
  }

  /**
   * Get the bounding box of the maps in this list
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * @param options - Selection, mask and projection options, defaults to all visible maps, applied mask and current projection
   * @returns The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsBbox(
    options?: Partial<SelectionOptions & ProjectionOptions>
  ): Bbox | undefined {
    // Note: we can't use the geoMaskBboxes since creating a bbox
    // gives a different result in a different projection

    const projectedGeoMaskPoints = this.#getProjectedGeoMaskPoints(options)

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
   * @param options - Selection, mask and projection options, defaults to all visible maps, applied mask and current projection
   * @returns The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsConvexHull(
    options?: Partial<SelectionOptions & ProjectionOptions>
  ): Ring | undefined {
    const projectedGeoMaskPoints = this.#getProjectedGeoMaskPoints(options)
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
    return this.getListOptions()
  }

  /**
   * Get the options of this list
   */
  getListOptions(): Partial<WarpedMapListOptions<W>> {
    return this.options
  }

  /**
   * Get the map-specific options of a map
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMapOptions(mapId: string): Partial<GetWarpedMapOptions<W>> | undefined {
    const warpedMaps = this.getWarpedMaps({ mapIds: [mapId] })
    const warpedMap = warpedMaps[0]
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
    const warpedMap = warpedMaps[0]
    return warpedMap?.options as GetWarpedMapOptions<W>
  }

  /**
   * Set the options
   *
   * Note: Map-specific options set here will be passed to newly added maps.
   *
   * @param listOptions - List Options
   */
  setOptions(listOptions?: Partial<WarpedMapListOptions<W>>): void {
    this.options = mergeOptions(this.options, listOptions)
    // Also update RTree sunce projectedGeoMask and projectedGeoFullMask changed
    if (listOptions && 'projection' in listOptions) {
      for (const warpedMap of this.getWarpedMaps()) {
        this.#addToOrUpdateRtree(warpedMap)
      }
    }
  }

  /**
   * Set the options of this list
   *
   * Note: Map-specific options set here will be passed to newly added maps.
   *
   * @param listOptions - List Options
   * @param animationOptions - Animation options
   */
  setListOptions(
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    this.#setMapsAndListOptionsInternal(
      undefined,
      listOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of the specified maps
   *
   * Useful when map-specific options are changed for multiple maps at once,
   * but only one animation should be fired.
   *
   * @param mapIds - Map IDs of the maps whose options to set
   * @param mapsOptions - Map-specific options to apply to each of those maps
   * @param animationOptions - Animation options
   */
  setMapsOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Set the map-specific options of all maps using a per-map callback
   *
   * Useful when map-specific options are changed for multiple maps at once
   * (with possibly different options for different maps), but only one animation should be fired.
   *
   * The callback receives each map's ID and returns the options to apply,
   * or `undefined` to leave that map unchanged.
   *
   * @param mapsOptionsCallbackFn - Callback returning the options to apply for a given map
   * @param animationOptions - Animation options
   */
  setMapsOptions(
    mapsOptionsCallbackFn: (
      mapId: string
    ) => Partial<WebGL2WarpedMapOptions> | undefined,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    thirdArgument?: Partial<AnimationOptions>
  ): void
  setMapsOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    thirdArgument?: Partial<AnimationOptions>
  ): void {
    if (Array.isArray(firstArgument)) {
      this.#setMapsAndListOptionsInternal(
        (mapId: string) =>
          firstArgument.includes(mapId) ? secondArgument : undefined,
        undefined,
        thirdArgument
      )
    } else {
      if (firstArgument === undefined) {
        throw new Error('mapsOptionsCallbackFn is undefined')
      }
      this.#setMapsAndListOptionsInternal(
        firstArgument,
        undefined,
        secondArgument as Partial<AnimationOptions> | undefined
      )
    }
  }

  /**
   * Set the map-specific options of the specified maps, and the list options
   *
   * Useful when map-specific options are changed for multiple maps at once,
   * together with the list options, but only one animation should be fired.
   *
   * @param mapIds - IDs of the maps whose options to set
   * @param mapsOptions - Map-specific options to apply to each of those maps
   * @param listOptions - List options to apply
   * @param animationOptions - Animation options
   */
  setMapsAndListOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Set the map-specific options of all maps using a per-map callback, and the list options
   *
   * Useful when map-specific options are changed for multiple maps at once (with possibly different options for different maps),
   * together with the list options, but only one animation should be fired.
   *
   * The callback receives each map's ID and returns the options to apply,
   * or `undefined` to leave that map unchanged.
   *
   * @param mapsOptionsCallbackFn - Callback returning the options to apply for a given map
   * @param listOptions - List options to apply
   * @param animationOptions - Animation options
   */
  setMapsAndListOptions(
    mapsOptionsCallbackFn: (
      mapId: string
    ) => Partial<WebGL2WarpedMapOptions> | undefined,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndListOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndListOptions(
    mapsOptionsCallbackFn: (
      mapId: string
    ) => Partial<WebGL2WarpedMapOptions> | undefined,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndListOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<WarpedMapListOptions<W>>,
    thirdArgument?:
      | Partial<WarpedMapListOptions<W>>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void
  setMapsAndListOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<WarpedMapListOptions<W>>,
    thirdArgument?:
      | Partial<WarpedMapListOptions<W>>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void {
    if (Array.isArray(firstArgument)) {
      this.#setMapsAndListOptionsInternal(
        (mapId: string) =>
          firstArgument.includes(mapId) ? secondArgument : undefined,
        thirdArgument,
        fourthArgument
      )
    } else {
      if (firstArgument === undefined) {
        throw new Error('mapsOptionsCallbackFn is undefined')
      }
      this.#setMapsAndListOptionsInternal(
        firstArgument,
        secondArgument,
        thirdArgument
      )
    }
  }

  /**
   * Reset the list options
   *
   * Undefined option keys reset all options
   *
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetListOptions(
    listOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    if (listOptionKeys === undefined) {
      listOptionKeys = Object.keys(WebGL2WarpedMap.getDefaultOptions())
    }
    this.setListOptions(
      optionKeysToUndefinedOptions(listOptionKeys) as Partial<
        WarpedMapListOptions<W>
      >,
      animationOptions
    )
  }

  /**
   * Reset the map-specific options of the specified maps
   *
   * Omitting `mapsOptionKeys` resets all options; passing an empty array resets none.
   *
   * @param mapIds - IDs of the maps whose options to reset
   * @param mapsOptionKeys - Keys of the options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapIds: string[],
    mapsOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Reset the map-specific options of all maps using a per-map callback
   *
   * The callback receives each map's ID and returns the keys to reset for that map.
   * Returning `undefined` from the callback resets all options for that map, returning an empty array resets none.
   *
   * @param mapsOptionKeysCallbackFn - Callback returning the option keys to reset for a given map
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapsOptionKeysCallbackFn: (
      mapId: string
    ) => Array<keyof WebGL2WarpedMapOptions> | undefined,
    animationOptions?: Partial<AnimationOptions>
  ): void
  resetMapsOptions(
    firstArgument?:
      | string[]
      | ((mapId: string) => Array<keyof WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Array<keyof WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    thirdArgument?: Partial<AnimationOptions>
  ): void
  resetMapsOptions(
    firstArgument?:
      | string[]
      | ((mapId: string) => Array<keyof WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Array<keyof WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    thirdArgument?: Partial<AnimationOptions>
  ): void {
    const defaultWebGL2WarpedMapOptions = WebGL2WarpedMap.getDefaultOptions()
    const defaultWebGL2WarpedMapOptionKeys = Object.keys(
      defaultWebGL2WarpedMapOptions
    ) as Array<keyof WebGL2WarpedMapOptions>
    if (Array.isArray(firstArgument)) {
      if (secondArgument === undefined) {
        secondArgument = defaultWebGL2WarpedMapOptionKeys
      }
      this.setMapsOptions(
        firstArgument,
        optionKeysToUndefinedOptions(
          secondArgument as Array<keyof WebGL2WarpedMapOptions>
        ) as Partial<WebGL2WarpedMapOptions>,
        thirdArgument
      )
    } else {
      if (firstArgument === undefined) {
        throw new Error('mapsOptionKeysCallbackFn is undefined')
      }
      const mapOptionKeysCallbackFn = firstArgument as (
        mapId: string
      ) => Array<keyof WebGL2WarpedMapOptions>
      this.setMapsOptions(
        (mapId) => {
          let mapOptionKeys = mapOptionKeysCallbackFn(mapId)
          if (mapOptionKeys === undefined) {
            mapOptionKeys = defaultWebGL2WarpedMapOptionKeys
          }
          return optionKeysToUndefinedOptions(mapOptionKeys)
        },
        secondArgument as Partial<AnimationOptions> | undefined
      )
    }
  }

  /**
   * Reset the map-specific options of the specified maps, and the list options
   *
   * Omitting `mapsOptionKeys` or `listOptionKeys` resets all options for that scope;
   * passing an empty array resets none.
   *
   * @param mapIds - IDs of the maps whose options to reset
   * @param mapsOptionKeys - Keys of the map-specific options to reset
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsAndListOptions(
    mapIds: string[],
    mapsOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    listOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Reset the map-specific options of all maps using a per-map callback, and the list options
   *
   * The callback receives each map's ID and returns the keys to reset for that map.
   * Returning `undefined` from the callback resets all options for that map, returning an empty array resets none.
   * Omitting `listOptionKeys` resets all list options.
   *
   * @param mapsOptionKeysCallbackFn - Callback returning the option keys to reset for a given map
   * @param listOptionKeys - Keys of the list options to reset
   * @param animationOptions - Animation options
   */
  resetMapsAndListOptions(
    mapsOptionKeysCallbackFn: (
      mapId: string
    ) => Array<keyof WebGL2WarpedMapOptions> | undefined,
    listOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  resetMapsAndListOptions(
    firstArgument?:
      | string[]
      | ((mapId: string) => Array<keyof WebGL2WarpedMapOptions> | undefined),
    secondArgument?: Array<keyof WebGL2WarpedMapOptions>,
    thirdArgument?:
      | Array<keyof WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void
  resetMapsAndListOptions(
    firstArgument?:
      | string[]
      | ((mapId: string) => Array<keyof WebGL2WarpedMapOptions> | undefined),
    secondArgument?: Array<keyof WebGL2WarpedMapOptions>,
    thirdArgument?:
      | Array<keyof WebGL2WarpedMapOptions>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void {
    const defaultWebGL2WarpedMapOptions = WebGL2WarpedMap.getDefaultOptions()
    const defaultWebGL2WarpedMapOptionKeys = Object.keys(
      defaultWebGL2WarpedMapOptions
    ) as Array<keyof WebGL2WarpedMapOptions>
    if (Array.isArray(firstArgument)) {
      if (secondArgument === undefined) {
        secondArgument = defaultWebGL2WarpedMapOptionKeys
      }
      if (thirdArgument === undefined) {
        thirdArgument = defaultWebGL2WarpedMapOptionKeys
      }
      this.setMapsAndListOptions(
        firstArgument,
        optionKeysToUndefinedOptions(
          secondArgument as Array<keyof WebGL2WarpedMapOptions>
        ) as Partial<WebGL2WarpedMapOptions>,
        optionKeysToUndefinedOptions(
          thirdArgument as Array<keyof WebGL2WarpedMapOptions>
        ) as Partial<WebGL2WarpedMapOptions>,
        fourthArgument as Partial<AnimationOptions>
      )
    } else {
      if (firstArgument === undefined) {
        throw new Error('mapsOptionKeysCallbackFn is undefined')
      }
      const mapOptionKeysCallbackFn = firstArgument as (
        mapId: string
      ) => Array<keyof WebGL2WarpedMapOptions>
      if (secondArgument === undefined) {
        secondArgument = defaultWebGL2WarpedMapOptionKeys
      }
      this.setMapsAndListOptions(
        (mapId) => {
          let mapOptionKeys = mapOptionKeysCallbackFn(mapId)
          if (mapOptionKeys === undefined) {
            mapOptionKeys = defaultWebGL2WarpedMapOptionKeys
          }
          return optionKeysToUndefinedOptions(mapOptionKeys)
        },
        optionKeysToUndefinedOptions(
          secondArgument as Array<keyof WebGL2WarpedMapOptions>
        ) as Partial<WebGL2WarpedMapOptions>,
        thirdArgument as Partial<AnimationOptions> | undefined
      )
    }
  }

  /**
   * Change the z-index of the specified maps to bring them to front
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
    this.#removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  /**
   * Change the z-index of the specified maps to send them to back
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
    this.#removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  /**
   * Change the z-index of the specified maps to bring them forward
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
    this.#removeZIndexHoles()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  /**
   * Change the zIndex of the specified maps to send them backward
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
    this.#removeZIndexHoles()
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
    this.geoMaskRTree?.clear()
    this.geoFullMaskRTree?.clear()
    this.projectedGeoMaskRTree?.clear()
    this.projectedGeoFullMaskRTree?.clear()
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CLEARED))
  }

  destroy() {
    for (const warpedMap of this.getWarpedMaps()) {
      this.#removeEventListenersFromWarpedMap(warpedMap)
      warpedMap.destroy()
    }

    this.clear()
  }

  #addGeoreferencedMapInternal(
    georeferencedMap: GeoreferencedMap,
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ): string {
    const mapId = this.#getOrComputeMapId(georeferencedMap)

    const warpedMap = this.options.warpedMapFactory(
      mapId,
      georeferencedMap,
      this.options,
      mapOptions
    )

    this.warpedMapsById.set(mapId, warpedMap)
    this.zIndices.set(mapId, this.warpedMapsById.size - 1)
    this.#addToOrUpdateRtree(warpedMap)
    this.#addEventListenersToWarpedMap(warpedMap)
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.WARPEDMAPADDED, { mapIds: [mapId] })
    )
    return mapId
  }

  #addGeoreferencedMapsInternal(
    georeferencedMaps: GeoreferencedMap[],
    mapOptions?: Partial<GetWarpedMapOptions<W>>
  ) {
    const results: (string | Error)[] = []
    for (const georeferencedMap of georeferencedMaps) {
      try {
        const mapId = this.#addGeoreferencedMapInternal(
          georeferencedMap,
          mapOptions
        )
        results.push(mapId)
      } catch (error) {
        results.push(ensureError(error))
      }
    }

    return results
  }

  #removeGeoreferencedMapInternal(georeferencedMap: GeoreferencedMap): string {
    const mapId = this.#getOrComputeMapId(georeferencedMap)
    return this.#removeGeoreferencedMapByIdInternal(mapId)
  }

  #removeGeoreferencedMapByIdInternal(mapId: string): string {
    const warpedMap = this.warpedMapsById.get(mapId)
    if (warpedMap) {
      this.warpedMapsById.delete(mapId)
      this.zIndices.delete(mapId)
      this.#removeFromRtree(warpedMap)
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPREMOVED, {
          mapIds: [mapId]
        })
      )
      this.#removeZIndexHoles()
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))

      warpedMap.destroy()
    } else {
      throw new Error(`No map found with ID ${mapId}`)
    }
    return mapId
  }

  #removeGeoreferencedMapsInternal(
    georeferencedMaps: GeoreferencedMap[]
  ): (string | Error)[] {
    const results: (string | Error)[] = []

    for (const georeferencedMap of georeferencedMaps) {
      try {
        const mapId = this.#removeGeoreferencedMapInternal(georeferencedMap)
        results.push(mapId)
      } catch (error) {
        results.push(ensureError(error))
      }
    }

    return results
  }

  #getOrComputeMapId(georeferencedMap: GeoreferencedMap): string {
    const mapId = georeferencedMap.id || generateChecksum(georeferencedMap)
    return mapId
  }

  #getProjectedGeoMaskPoints(
    options?: Partial<SelectionOptions & ProjectionOptions>
  ): Point[] {
    const warpedMaps = this.getWarpedMaps(options)

    const geoMaskPoints: Point[] = []
    for (const warpedMap of warpedMaps) {
      geoMaskPoints.push(...warpedMap.getGeoAppliedMask(options?.applyMask))
    }

    // If a projection is specified in options, project the geoMaskPoints using projection
    // otherwise (by default) use available geoMask, i.e. use lonLatProjection
    const projection = options?.projection
    return projection
      ? WarpedMapList.projectPointsIfNeeded(
          lonLatProjection,
          projection,
          geoMaskPoints
        )
      : geoMaskPoints
  }

  /**
   * Internal set map options
   */
  #setMapsAndListOptionsInternal(
    mapsOptionsCallbackFn?: (
      mapId: string
    ) => Partial<WarpedMapListOptions<W>> | undefined,
    listOptions?: Partial<WarpedMapListOptions<W>>,
    partialAnimationOptions?:
      | (Partial<AnimationOptions> & Partial<AnimationInternalOptions>)
      | undefined
  ): void {
    this.setOptions(listOptions)

    // If there are no maps yet, return
    if (this.warpedMapsById.size === 0) {
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

    // We loop over all warped maps and set the maps options (if there are)
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
      const mapOptions = mapsOptionsCallbackFn
        ? mapsOptionsCallbackFn(warpedMap.mapId)
        : undefined
      if (animationOptions.animate && animationOptions.stage == 'pre') {
        // If animating and in the 'pre' stage: set all options except those to be animated
        warpedMapChangedOptions = warpedMap.setMapAndListOptions(
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
        warpedMapChangedOptions = warpedMap.setMapAndListOptions(
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
        this.#addToOrUpdateRtree(warpedMap)
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
        this.#setMapsAndListOptionsInternal(
          mapsOptionsCallbackFn,
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

  #addToOrUpdateRtree(warpedMap: W): void {
    this.#removeFromRtree(warpedMap)
    if (this.geoMaskRTree) {
      this.geoMaskRTree.addItem(warpedMap.mapId, [warpedMap.geoMask])
    }
    if (this.geoFullMaskRTree) {
      this.geoFullMaskRTree.addItem(warpedMap.mapId, [warpedMap.geoFullMask])
    }
    if (this.projectedGeoMaskRTree) {
      this.projectedGeoMaskRTree.addItem(warpedMap.mapId, [
        warpedMap.projectedGeoMask
      ])
    }
    if (this.projectedGeoFullMaskRTree) {
      this.projectedGeoFullMaskRTree.addItem(warpedMap.mapId, [
        warpedMap.projectedGeoFullMask
      ])
    }
  }

  #getMapIdsFromBbox(bbox: Bbox, getBbox: (warpedMap: W) => Bbox): string[] {
    return Array.from(this.warpedMapsById.values())
      .filter((warpedMap) => doBboxesIntersect(bbox, getBbox(warpedMap)))
      .map((warpedMap) => warpedMap.mapId)
  }

  #getMapIdsFromPoint(
    point: Point,
    getBbox: (warpedMap: W) => Bbox,
    getMask: (warpedMap: W) => Ring
  ): string[] {
    return Array.from(this.warpedMapsById.values())
      .filter(
        (warpedMap) =>
          pointInBbox(point, getBbox(warpedMap)) &&
          inside(point, closePolygon([getMask(warpedMap)]))
      )
      .map((warpedMap) => warpedMap.mapId)
  }

  #removeFromRtree(warpedMap: W): void {
    if (this.geoMaskRTree) {
      this.geoMaskRTree.removeItem(warpedMap.mapId)
    }
    if (this.geoFullMaskRTree) {
      this.geoFullMaskRTree.removeItem(warpedMap.mapId)
    }
    if (this.projectedGeoMaskRTree) {
      this.projectedGeoMaskRTree.removeItem(warpedMap.mapId)
    }
    if (this.projectedGeoFullMaskRTree) {
      this.projectedGeoFullMaskRTree.removeItem(warpedMap.mapId)
    }
  }

  #removeZIndexHoles(): void {
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
  #imageLoaded(mapId: string) {
    this.dispatchEvent(
      new WarpedMapEvent(WarpedMapEventType.IMAGELOADED, {
        mapIds: [mapId]
      })
    )
  }

  #addEventListenersToWarpedMap(warpedMap: W) {
    const bound = this.#imageLoaded.bind(this, warpedMap.mapId)
    this.#boundImageLoadedByMapId.set(warpedMap.mapId, bound)

    warpedMap.addEventListener(WarpedMapEventType.IMAGELOADED, bound)
  }

  #removeEventListenersFromWarpedMap(warpedMap: W) {
    const bound = this.#boundImageLoadedByMapId.get(warpedMap.mapId)
    if (bound) {
      warpedMap.removeEventListener(WarpedMapEventType.IMAGELOADED, bound)
      this.#boundImageLoadedByMapId.delete(warpedMap.mapId)
    }
  }

  // Helper function to only project if different projection
  // TODO: Consider to move to @allmaps/project. But then would this replace the general usage of proj4() everywhere?
  static projectPointIfNeeded(
    projectionFrom: Projection,
    projectionTo: Projection,
    point: Point
  ): Point {
    return isEqualProjection(projectionFrom, projectionTo)
      ? point
      : proj4(projectionFrom?.definition, projectionTo?.definition, point)
  }

  static projectPointsIfNeeded(
    projectionFrom: Projection,
    projectionTo: Projection,
    points: Point[]
  ): Point[] {
    return isEqualProjection(projectionFrom, projectionTo)
      ? points
      : points.map((point) =>
          proj4(projectionFrom?.definition, projectionTo?.definition, point)
        )
  }

  static projectBboxIfNeeded(
    projectionFrom: Projection,
    projectionTo: Projection,
    bbox: Bbox
  ): Bbox {
    return computeBbox(
      this.projectPointsIfNeeded(projectionFrom, projectionTo, bboxToLine(bbox))
    )
  }
}
