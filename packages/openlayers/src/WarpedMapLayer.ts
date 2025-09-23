import Layer from 'ol/layer/Layer.js'
import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import { WebGL2Renderer } from '@allmaps/render/webgl2'
import { Viewport, WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'
import { BaseWarpedMapLayer } from '@allmaps/warpedmaplayer'
import { mergeOptions, mergePartialOptions } from '@allmaps/stdlib'

import type { FrameState } from 'ol/Map.js'
import type { Extent } from 'ol/extent'

import type {
  BaseRenderOptions,
  ProjectionOptions,
  AnimationOptions,
  WarpedMapList
} from '@allmaps/render'
import type {
  WebGL2RenderOptions,
  WebGL2WarpedMap,
  WebGL2WarpedMapOptions
} from '@allmaps/render/webgl2'
import type { Bbox, Gcp, Point, Ring } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'

export type SpecificOpenLayersWarpedMapLayerOptions = object

type SpecificWarpedMapLayerOptions = SpecificOpenLayersWarpedMapLayerOptions

export type OpenLayersWarpedMapLayerOptions =
  SpecificOpenLayersWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

const DEFAULT_SPECIFIC_OPENLAYERS_WARPED_MAP_LAYER_OPTIONS: SpecificOpenLayersWarpedMapLayerOptions =
  {}

/**
 * WarpedMapLayer class.
 *
 * This class renders georeferenced maps from a Georeference Annotation on an OpenLayers map.
 * WarpedMapLayer is a subclass of [Layer](https://openlayers.org/en/latest/apidoc/module-ol_layer_Layer-Layer.html).
 */
export class WarpedMapLayer
  extends Layer
  implements BaseWarpedMapLayer<SpecificOpenLayersWarpedMapLayerOptions>
{
  defaultSpecificWarpedMapLayerOptions: SpecificOpenLayersWarpedMapLayerOptions
  options: SpecificOpenLayersWarpedMapLayerOptions &
    Partial<WebGL2RenderOptions>

  container: HTMLDivElement
  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext | null | undefined

  renderer: WebGL2Renderer

  canvasSize: [number, number] = [0, 0]

  private resizeObserver: ResizeObserver

  /**
   * Creates a WarpedMapLayer instance
   * @param options - the WebGL2 renderer options
   */
  constructor(options?: Partial<OpenLayersWarpedMapLayerOptions>) {
    super({})

    this.defaultSpecificWarpedMapLayerOptions =
      DEFAULT_SPECIFIC_OPENLAYERS_WARPED_MAP_LAYER_OPTIONS
    this.options = mergeOptions(
      this.defaultSpecificWarpedMapLayerOptions,
      options
    )

    const container = document.createElement('div')
    this.container = container

    container.style.position = 'absolute'
    container.style.width = '100%'
    container.style.height = '100%'
    container.classList.add('ol-layer')
    container.classList.add('allmaps-warped-map-layer')
    const canvas = document.createElement('canvas')

    canvas.style.position = 'absolute'
    canvas.style.left = '0'

    canvas.style.width = '100%'
    canvas.style.height = '100%'

    container.appendChild(canvas)

    const gl = canvas.getContext('webgl2', {
      premultipliedAlpha: true
    })

    if (!gl) {
      throw new Error('WebGL 2 not available')
    }

    this.resizeObserver = new ResizeObserver(this.resized.bind(this))
    this.resizeObserver.observe(canvas, { box: 'content-box' })

    this.canvas = canvas
    this.gl = gl

    this.renderer = new WebGL2Renderer(this.gl, options)

    this.addEventListeners()

    this.canvas.addEventListener(
      'webglcontextlost',
      this.contextLost.bind(this)
    )

    this.canvas.addEventListener(
      'webglcontextrestored',
      this.contextRestored.bind(this)
    )
  }

  /**
   * Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.
   * @returns - Bounding box of all warped maps
   */
  getLonLatExtent(): Extent | undefined {
    return this.renderer.warpedMapList.getMapsBbox({
      projection: { definition: 'EPSG:4326' }
    })
  }

  /**
   * Disposes all WebGL resources and cached tiles
   */
  dispose() {
    this.renderer.destroy()

    const extension = this.gl?.getExtension('WEBGL_lose_context')

    if (extension) {
      extension.loseContext()
    }
    const canvas = this.gl?.canvas
    if (canvas) {
      canvas.width = 1
      canvas.height = 1
    }

    this.resizeObserver.disconnect()

    this.removeEventListeners()

    this.canvas?.removeEventListener(
      'webglcontextlost',
      this.contextLost.bind(this)
    )

    this.canvas?.removeEventListener(
      'webglcontextrestored',
      this.contextRestored.bind(this)
    )

    // super.disposeInternal()
  }

  /**
   * Render the layer.
   * @param frameState - OpenLayers frame state
   * @returns The rendered element
   */
  render(frameState: FrameState): HTMLElement {
    if (this.canvas) {
      this.resizeCanvas(this.canvas, this.canvasSize)
    }

    const viewport = new Viewport(
      frameState.size as [number, number],
      frameState.viewState.center as [number, number],
      frameState.viewState.resolution,
      {
        rotation: frameState.viewState.rotation,
        devicePixelRatio: window.devicePixelRatio,
        projection: { definition: frameState.viewState.projection.getCode() }
        // TODO: add a way for viewport and renderer to understand other codes then the two default ones
      }
    )

    this.renderer.render(viewport)

    return this.container
  }

  private resized(entries: ResizeObserverEntry[]) {
    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // TODO: read + understand https://web.dev/device-pixel-content-box/
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      const dpr = window.devicePixelRatio

      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)

      this.canvasSize = [displayWidth, displayHeight]
    }
    this.nativeUpdate()
  }

  private resizeCanvas(
    canvas: HTMLCanvasElement,
    [width, height]: [number, number]
  ) {
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      canvas.width = width
      canvas.height = height
    }

    return needResize
  }

  ///////////////////////////////
  // Implemented methods below //
  ///////////////////////////////

  // Functions defined as abstract in base class

  nativeUpdate(): void {
    this.changed()
  }

  nativePassWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const olEvent = new OLWarpedMapEvent(event.type, event.data)
      this.dispatchEvent(olEvent)
    }
  }

  // Normal functions
  //
  // These are copied manually from @allmaps/warpedmaplayermap
  // since classes can only extend one class

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
   * Removes a Georeferenced Map by its ID
   *
   * @param mapId - Map ID of the georeferenced map to remove
   * @returns Map ID of the map that was removed, or an error
   */
  async removeGeoreferencedMapById(
    mapId: string
  ): Promise<string | Error | undefined> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result = this.renderer.warpedMapList.removeGeoreferencedMapById(mapId)
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
   * Get the WarpedMap instance for a map
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
   * Get the z-index of a map
   *
   * @param mapId - Map ID for which to get the z-index
   * @returns The z-index of a map
   */
  getMapZIndex(mapId: string): number | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  /**
   * Get the layer opacity
   *
   * Returns a number between 0 and 1 (the default)
   */
  getOpacity(): number {
    return this.getLayerOptions().opacity ?? this.getDefaultOptions().opacity
  }

  /**
   * Get the default options the layer
   */
  getDefaultOptions(): SpecificWarpedMapLayerOptions &
    BaseRenderOptions &
    WebGL2WarpedMapOptions {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return mergeOptions(
      this.defaultSpecificWarpedMapLayerOptions,
      this.renderer.getDefaultOptions()
    )
  }

  /**
   * Get the default options of a map
   *
   * These come from the default option settings for WebGL2WarpedMaps and the map's georeferenced map proporties
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapDefaultOptions(mapId: string): WebGL2WarpedMapOptions | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getMapDefaultOptions(mapId)
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
   * Get the map-specific options of a map
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapMapOptions(mapId: string): Partial<WebGL2WarpedMapOptions> | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getMapMapOptions(mapId)
  }

  /**
   * Get the options of a map
   *
   * These options are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): WebGL2WarpedMapOptions | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.getMapOptions(mapId)
  }

  /**
   * Set the layer opacity
   *
   * @param opacity - Layer opacity to set
   */
  setOpacity(opacity: number) {
    this.setLayerOptions({ opacity })
  }

  /**
   * Set the layer options
   *
   * @param layerOptions - Layer options to set
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
   * ```
   */
  setLayerOptions(
    layerOptions:
      | Partial<SpecificWarpedMapLayerOptions>
      | Partial<WebGL2RenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.options = mergeOptions(this.options, layerOptions)
    this.renderer.setOptions(layerOptions, animationOptions)
  }

  /**
   * Set the GCPs of a map
   *
   * This only sets the map-specific `gcps` option of the map
   * (or more specifically of the warped map used for rendering),
   * overwriting the original GCPs inferred from the Georeference Annotation.
   *
   * The original GCPs can be reset by resetting the map-specific GCPs option,
   * and stay accessible in the warped map's `map` property.
   *
   * @param mapId - Map ID for which to set the options
   * @param gcps - GCPs to set
   * @param animationOptions - Animation options
   */
  setMapGcps(
    mapId: string,
    gcps: Gcp[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapOptions(mapId, { gcps }, undefined, animationOptions)
  }

  /**
   * Set the resource mask of a map
   *
   * This only sets the map-specific `resourceMask` option of the map
   * (or more specifically of the warped map used for rendering),
   * overwriting the original resource mask inferred from the Georeference Annotation.
   *
   * The original resource mask can be reset by resetting the map-specific resource mask option,
   * and stays accessible in the warped map's `map` property.
   *
   * @param mapId - Map ID for which to set the options
   * @param resourceMask - Resource mask to set
   * @param animationOptions - Animation options
   */
  setMapResourceMask(
    mapId: string,
    resourceMask: Ring,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapOptions(
      mapId,
      { resourceMask },
      undefined,
      animationOptions
    )
  }

  /**
   * Set the transformation type of a map
   *
   * This only sets the map-specific `transformationType` option of the map
   * (or more specifically of the warped map used for rendering),
   * overwriting the original transformation type inferred from the Georeference Annotation.
   *
   * The original transformation type can be reset by resetting the map-specific transformation type option,
   * and stays accessible in the warped map's `map` property.
   *
   * @param mapId - Map ID for which to set the options
   * @param transformationType - Transformation type to set
   * @param animationOptions - Animation options
   */
  setMapTransformationType(
    mapId: string,
    transformationType: TransformationType,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapOptions(
      mapId,
      { transformationType },
      undefined,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of a map (and the layer options)
   *
   * In general setting a map-specific option
   * also sets the corresponding option of the map,
   * since these are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * A special case is setting a map-specific option to `undefined`:
   * then the corresponding option is derived from the default, georeferenced map or layer option.
   * This is equivalent to using the reset function for map-specific option.
   *
   * @param mapId - Map ID for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param layerOptions - Layer options to set
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapOptions(myMapId, { transformationType: 'thinPlateSpline' })
   * ```
   */
  setMapOptions(
    mapId: string,
    mapOptions: Partial<WebGL2WarpedMapOptions>,
    layerOptions?:
      | Partial<SpecificWarpedMapLayerOptions>
      | Partial<WebGL2RenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapsOptions(
      [mapId],
      mapOptions,
      layerOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of maps (and the layer options)
   *
   * In general setting a map-specific option
   * also sets the corresponding option of the map,
   * since these are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * A special case is setting a map-specific option to `undefined`:
   * then the corresponding option is derived from the default, georeferenced map or layer option.
   * This is equivalent to using the reset function for map-specific option.
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param layerOptions - Layer options to set
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapsOptions([myMapId], { transformationType: 'thinPlateSpline' })
   * ```
   */
  setMapsOptions(
    mapIds: string[],
    mapOptions: Partial<WebGL2WarpedMapOptions>,
    layerOptions?:
      | Partial<SpecificWarpedMapLayerOptions>
      | Partial<WebGL2RenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    if (layerOptions) {
      this.options = mergeOptions(this.options, layerOptions)
    }
    this.renderer.setMapsOptions(
      mapIds,
      mapOptions,
      layerOptions,
      animationOptions
    )
  }

  /**
   * Set the map-specific options of maps by map ID (and the layer options)
   *
   * In general setting a map-specific option
   * also sets the corresponding option of the map,
   * since these are the result of merging the default, georeferenced map,
   * layer and map-specific options of that map.
   *
   * A special case is setting a map-specific option to `undefined`:
   * then the corresponding option is derived from the default, georeferenced map or layer option.
   * This is equivalent to using the reset function for map-specific option.
   *
   * @param mapOptionsByMapId - Map-specific options to set by map ID
   * @param layerOptions - Layer options to set
   * @param animationOptions - Animation options
   */
  setMapsOptionsByMapId(
    mapOptionsByMapId: Map<string, Partial<WebGL2WarpedMapOptions>>,
    layerOptions?:
      | Partial<SpecificWarpedMapLayerOptions>
      | Partial<WebGL2RenderOptions>,
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    if (layerOptions) {
      this.options = mergeOptions(this.options, layerOptions)
    }
    this.renderer.setMapsOptionsByMapId(
      mapOptionsByMapId,
      layerOptions,
      animationOptions
    )
  }

  /**
   * Reset the layer options
   *
   * An empty array resets all options, undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param layerOptionKeys - Keys of the options to reset
   * @param animationOptions - Animation options
   */
  resetLayerOptions(
    layerOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetOptions(layerOptionKeys, animationOptions)
  }

  /**
   * Reset the map-specific options of maps (and the layer options)
   *
   * An empty array resets all options, undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptions(
    mapIds: string[],
    mapOptionKeys?: string[],
    layerOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsOptions(
      mapIds,
      mapOptionKeys,
      layerOptionKeys,
      animationOptions
    )
  }

  /**
   * Reset the map-specific options of maps by map ID (and the layer options)
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapOptionkeysByMapId - Keys of map-specific options to reset by map ID
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param animationOptions - Animation options
   */
  resetMapsOptionsByMapId(
    mapOptionkeysByMapId: Map<string, string[]>,
    layerOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsOptionsByMapId(
      mapOptionkeysByMapId,
      layerOptionKeys,
      animationOptions
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

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONREMOVED,
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

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEDELETED,
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
      WarpedMapEventType.CLEARED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.nativeUpdate.bind(this)
    )
  }

  removeEventListeners() {
    if (!this.renderer) {
      return
    }

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONREMOVED,
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

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEDELETED,
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
      WarpedMapEventType.CLEARED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.PREPARECHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.IMMEDIATECHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.ANIMATEDCHANGE,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.nativeUpdate.bind(this)
    )
  }
}
