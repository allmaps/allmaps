import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2'
import { WarpedMapList, WarpedMapEventType } from '@allmaps/render'
import { mergeOptions, mergePartialOptions } from '@allmaps/stdlib'

import type { SetOptionsOptions, ProjectionOptions } from '@allmaps/render'
import type { Point, Bbox, Ring } from '@allmaps/types'

import type {
  WebGL2RenderOptions,
  WebGL2WarpedMapOptions
} from '@allmaps/render'

const NO_RENDERER_ERROR_MESSAGE =
  'Renderer not defined. Add the layer to a map before calling this function.'

const NO_CANVAS_ERROR_MESSAGE =
  'Canvas not defined. Add the layer to a map before calling this function.'

/**
 * Base WarpedMapLayer class.
 */
export abstract class BaseWarpedMapLayer<
  SpecificWarpedMapLayerOptions extends Record<string, any>
> {
  defaultSpecificWarpedMapLayerOptions: SpecificWarpedMapLayerOptions
  options: SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

  container?: HTMLDivElement
  canvas?: HTMLCanvasElement
  gl: WebGL2RenderingContext | null | undefined

  renderer?: WebGL2Renderer

  /**
   * Creates a WarpedMapLayer instance
   *
   * @param options - options
   */
  constructor(
    defaultSpecificWarpedMapLayerOptions: SpecificWarpedMapLayerOptions,
    options?: Partial<
      SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
    >
  ) {
    this.defaultSpecificWarpedMapLayerOptions =
      defaultSpecificWarpedMapLayerOptions
    this.options = mergeOptions(
      this.defaultSpecificWarpedMapLayerOptions,
      options
    )
  }

  // Abstract functions

  abstract nativeUpdate(): void

  abstract nativePassWarpedMapEvent(event: Event): void

  // Normal functions

  /**
   * Adds a Georeference Annotation
   *
   * @param annotation - Georeference Annotation
   * @returns Map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.nativeUpdate()

    return results
  }

  /**
   * Removes a Georeference Annotation
   *
   * @param annotation - Georeference Annotation
   * @returns Map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.nativeUpdate()

    return results
  }

  /**
   * Adds a Georeference Annotation by URL
   *
   * @param annotationUrl - URL of a Georeference Annotation
   * @returns Map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )

    return this.addGeoreferenceAnnotation(annotation)
  }

  /**
   * Removes a Georeference Annotation by URL
   *
   * @param annotationUrl - URL of a Georeference Annotation
   * @returns Map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    return this.removeGeoreferenceAnnotation(annotation)
  }

  /**
   * Adds a Georeferenced Map
   *
   * @param georeferencedMap - Georeferenced Map
   * @returns Map ID of the map that was added, or an error
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.nativeUpdate()

    return result
  }

  /**
   * Removes a Georeferenced Map
   *
   * @param georeferencedMap - Georeferenced Map
   * @returns Map ID of the map that was removed, or an error
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.nativeUpdate()

    return result
  }

  /**
   * Get the WarpedMapList object that contains a list of the warped maps of all loaded maps
   */
  getWarpedMapList(): WarpedMapList<WebGL2WarpedMap> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList
  }

  /**
   * Get mapIds for selected maps
   *
   * Note: more selection options are available on this function of WarpedMapList
   */
  getMapIds(): string[] {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapIds()
  }

  /**
   * Get the WarpedMap instances for selected maps
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   */
  getWarpedMaps(mapIds: string[]): Iterable<WebGL2WarpedMap> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getWarpedMaps({ mapIds })
  }

  /**
   * Get the WarpedMap instance for a specific map
   *
   * @param mapId - Map ID of the requested WarpedMap instance
   */
  getWarpedMap(mapId: string): WebGL2WarpedMap | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Get the center of the bounding box of the maps
   *
   * By default the result is returned in the list's projection, which is `EPSG:3857` by default
   * Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param projection - Projection in which to return the result
   * @returns The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsCenter(
    mapIds: string[],
    projectionOptions?: ProjectionOptions
  ): Point | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsCenter(
      mergePartialOptions({ mapIds }, projectionOptions)
    )
  }

  /**
   * Get the bounding box of the maps
   *
   * By default the result is returned in the list's projection, which is `EPSG:3857` by default
   * Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param projection - Projection in which to return the result
   * @returns The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsBbox(
    mapIds: string[],
    projectionOptions?: ProjectionOptions
  ): Bbox | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsBbox(
      mergePartialOptions({ mapIds }, projectionOptions)
    )
  }

  /**
   * Get the convex hull of the maps
   *
   * By default the result is returned in the list's projection, which is `EPSG:3857` by default
   * Use {definition: 'EPSG:4326'} to request the result in lon-lat `EPSG:4326`
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param projection - Projection in which to return the result
   * @returns The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsConvexHull(
    mapIds: string[],
    projectionOptions?: ProjectionOptions
  ): Ring | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsConvexHull(
      mergePartialOptions({ mapIds }, projectionOptions)
    )
  }

  /**
   * Get the z-index of a specific map ID
   *
   * @param mapId - Map ID for which to get the z-index
   * @returns The z-index of a specific map ID
   */
  getMapZIndex(mapId: string): number | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  /**
   * Get the default layer options
   */
  getDefaultLayerOptions(): SpecificWarpedMapLayerOptions &
    WebGL2RenderOptions {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return mergeOptions(
      this.renderer.getDefaultOptions(),
      this.defaultSpecificWarpedMapLayerOptions
    )
  }

  /**
   * Get the default map options of a specific map ID
   */
  getDefaultMapOptions(): Partial<WebGL2WarpedMapOptions> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getDefaultMapOptions()
  }

  /**
   * Get the default map merged options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getDefaultMapMergedOptions(): WebGL2WarpedMapOptions
  getDefaultMapMergedOptions(mapId: string): WebGL2WarpedMapOptions | undefined
  getDefaultMapMergedOptions(
    mapId?: string
  ): WebGL2WarpedMapOptions | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getDefaultMapMergedOptions(mapId)
  }

  /**
   * Get the layer options
   */
  getLayerOptions(): Partial<
    SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
  > {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return mergePartialOptions(
      this.options,
      this.renderer.getOptions()
    ) as Partial<SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>>
  }

  /**
   * Get the map options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): Partial<WebGL2WarpedMapOptions> | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getMapOptions(mapId)
  }

  /**
   * Get the map merged options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMergedOptions(mapId: string): WebGL2WarpedMapOptions | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getMapMergedOptions(mapId)
  }

  /**
   * Sets the layer options
   *
   * @param layerOptions - Layer options to set
   * @param setOptionsOptions - Options when setting the options
   */
  setLayerOptions(
    layerOptions: Partial<
      SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
    >,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.options = mergeOptions(this.options, layerOptions)
    this.renderer.setOptions(layerOptions, setOptionsOptions)
  }

  /**
   * Sets the map options of specific map IDs
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Options to set
   * @param layerOptions - Layer options to set
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions: Partial<WebGL2WarpedMapOptions>,
    layerOptions?: Partial<
      SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
    >,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    if (layerOptions) {
      this.options = mergeOptions(this.options, layerOptions)
    }
    this.renderer.setMapsOptions(
      mapIds,
      mapOptions,
      layerOptions,
      setOptionsOptions
    )
  }

  /**
   * Sets the map options of specific maps by map ID
   *
   * @param mapOptionsByMapId - Map options to set by map ID
   * @param layerOptions - Layer options to set
   * @param setOptionsOptions - Options when setting the options
   */
  setMapsOptionsByMapId(
    mapOptionsByMapId: Map<string, Partial<WebGL2WarpedMapOptions>>,
    layerOptions?: Partial<
      SpecificWarpedMapLayerOptions & Partial<WebGL2RenderOptions>
    >,
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    if (layerOptions) {
      this.options = mergeOptions(this.options, layerOptions)
    }
    this.renderer.setMapsOptionsByMapId(
      mapOptionsByMapId,
      layerOptions,
      setOptionsOptions
    )
  }

  /**
   * Resets the layer options
   *
   * An empty array resets all options, undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param layerOptionKeys - Keys of the options to reset
   * @param setOptionsOptions - Options when setting the options
   */
  resetLayerOptions(
    layerOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetOptions(layerOptionKeys, setOptionsOptions)
  }

  /**
   * Resets the map options of specific map IDs
   *
   * An empty array resets all options, undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map options to reset
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param setOptionsOptions - Options when setting the options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    layerOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsOptions(
      mapIds,
      mapOptionKeys,
      layerOptionKeys,
      setOptionsOptions
    )
  }

  /**
   * Resets the map options of specific maps by map ID
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapOptionkeysByMapId - Keys of map options to reset by map ID
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param setOptionsOptions - Options when setting the options
   */
  resetMapsOptionsByMapId(
    mapOptionkeysByMapId: Map<string, string[]>,
    layerOptionKeys?: string[],
    setOptionsOptions?: Partial<SetOptionsOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsOptionsByMapId(
      mapOptionkeysByMapId,
      layerOptionKeys,
      setOptionsOptions
    )
  }

  /**
   * Bring maps to front
   * @param mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this.nativeUpdate()
  }

  /**
   * Send maps to back
   * @param mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this.nativeUpdate()
  }

  /**
   * Bring maps forward
   * @param mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this.nativeUpdate()
  }

  /**
   * Send maps backward
   * @param mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this.nativeUpdate()
  }

  /**
   * Removes all warped maps from the layer
   */
  clear() {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.clear()
    this.nativeUpdate()
  }

  contextLost(event: Event) {
    event.preventDefault()
    this.renderer?.contextLost()
  }

  contextRestored(event: Event) {
    event.preventDefault()
    this.renderer?.contextRestored()
  }

  addEventListeners() {
    if (!this.renderer) {
      return
    }

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.nativeUpdate.bind(this)
    )
  }

  removeEventListeners() {
    if (!this.renderer) {
      return
    }

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this.nativeUpdate.bind(this)
    )
  }

  static assertRenderer(
    renderer?: WebGL2Renderer
  ): asserts renderer is WebGL2Renderer {
    if (!renderer) {
      throw new Error(NO_RENDERER_ERROR_MESSAGE)
    }
  }

  static assertCanvas(
    canvas?: HTMLCanvasElement
  ): asserts canvas is HTMLCanvasElement {
    if (!canvas) {
      throw new Error(NO_CANVAS_ERROR_MESSAGE)
    }
  }
}
