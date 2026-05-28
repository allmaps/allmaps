import proj4 from 'proj4'

import Layer from 'ol/layer/Layer.js'
import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import { WebGL2Renderer } from '@allmaps/render/webgl2'
import { Viewport, WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'
import { BaseWarpedMapLayer } from '@allmaps/warpedmaplayer'
import { mergeOptions, mergePartialOptions } from '@allmaps/stdlib'
import { projectionDefinitionToAntialiasedDefinition } from '@allmaps/project'

import type { FrameState } from 'ol/Map.js'
import type { Extent } from 'ol/extent'

import type {
  BaseRenderOptions,
  MaskOptions,
  ProjectionOptions,
  AnimationOptions,
  WarpedMapList,
  Sprite
} from '@allmaps/render'
import type {
  WebGL2RenderOptions,
  WebGL2WarpedMap,
  WebGL2WarpedMapOptions
} from '@allmaps/render/webgl2'
import type { Bbox, Gcp, Point, Ring, Size } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'
import type { Projection } from '@allmaps/project'

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
  gl?: WebGL2RenderingContext

  renderer: WebGL2Renderer

  canvasSize: [number, number] = [0, 0]

  registeredProjections: Map<string, Projection>

  #resizeObserver: ResizeObserver

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

    this.registeredProjections = new Map()

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

    this.#resizeObserver = new ResizeObserver(this.resized.bind(this))
    this.#resizeObserver.observe(canvas, { box: 'content-box' })

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
   * Keep a list of registered projections.
   *
   * Can optionally be used to complement OpenLayer's `register(proj4)` function.
   *
   * To use viewport projections in OpenLayers, add projections to proj4 and register proj4
   * (Example: https://openlayers.org/en/latest/examples/scaleline-indiana-east.html).
   * WarpedMapLayer reads the view's projections code, gets its definition from proj4.defs
   * (thanks to the register() function) and constructs a new Projection type (defined in @allmap/project).
   *
   * Using this function on top of OpenLayer's `register()`,
   * WarpedMapLayer will look up the code in the registered projections first for a matching `id`
   * and, if found, use this projection. This ways relavant projection information (id, name, ...)
   * can be passed and used to all Allmaps packages.
   *
   * Newly registered projection overwrite older ones with the same id.
   */
  registerProjections(projections: Projection[]): void {
    for (const projection of projections) {
      if (projection.id) {
        this.registeredProjections.set(projection.id, projection)
      }
    }
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

    this.#resizeObserver.disconnect()

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

    const rotation = frameState.viewState.rotation
    const devicePixelRatio = window.devicePixelRatio

    const projectionCode = frameState.viewState.projection.getCode()
    const projectionDefinitionFromProj4 = proj4.defs(projectionCode).projStr
    let projection: Projection
    if (this.registeredProjections.has(projectionCode)) {
      projection = this.registeredProjections.get(projectionCode)!
    } else if (projectionDefinitionFromProj4) {
      projection = {
        definition: projectionDefinitionToAntialiasedDefinition(
          projectionDefinitionFromProj4
        )
      }
    } else {
      throw new Error(`Unknown projection code: ${projectionCode}`)
    }

    const viewportSize = frameState.size as [number, number]
    const viewportCenter = frameState.viewState.center as [number, number]
    const projectedGeoPerViewportScale = frameState.viewState.resolution

    const viewport = new Viewport(
      viewportSize,
      viewportCenter,
      projectedGeoPerViewportScale,
      {
        rotation,
        devicePixelRatio,
        projection
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
  // These function are copied automatically from @allmaps/warpedmaplayer's WarpedMapLayer.ts

  // START_AUTOMATED_COPY

  /**
   * Adds a Georeference Annotation
   *
   * @param annotation - Georeference Annotation
   * @param mapOptions - Map options
   * @returns Map IDs of the maps that were added, or an error per map
   */
  addGeoreferenceAnnotation(
    annotation: unknown,
    mapOptions?: Partial<WebGL2WarpedMapOptions>
  ): (string | Error)[] {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const results = this.renderer.addGeoreferenceAnnotation(
      annotation,
      mapOptions
    )
    this.nativeUpdate()

    return results
  }

  /**
   * Removes a Georeference Annotation
   *
   * @param annotation - Georeference Annotation
   * @returns Map IDs of the maps that were removed, or an error per map
   */
  removeGeoreferenceAnnotation(annotation: unknown): (string | Error)[] {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const results =
      this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.nativeUpdate()

    return results
  }

  /**
   * Adds a Georeference Annotation by URL
   *
   * @param annotationUrl - URL of a Georeference Annotation
   * @param mapOptions - Map options
   * @returns Map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotationByUrl(
    annotationUrl: string,
    mapOptions?: Partial<WebGL2WarpedMapOptions>
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )

    return this.addGeoreferenceAnnotation(annotation, mapOptions)
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
   * @param mapOptions - Map options
   * @returns Map ID of the map that was added
   */
  addGeoreferencedMap(
    georeferencedMap: unknown,
    mapOptions?: Partial<WebGL2WarpedMapOptions>
  ): string {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result = this.renderer.addGeoreferencedMap(
      georeferencedMap,
      mapOptions
    )
    this.nativeUpdate()

    return result
  }

  /**
   * Removes a Georeferenced Map
   *
   * @param georeferencedMap - Georeferenced Map
   * @returns Map ID of the map that was removed
   */
  removeGeoreferencedMap(georeferencedMap: unknown): string {
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
   * @returns Map ID of the map that was removed
   */
  removeGeoreferencedMapById(mapId: string): string {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result = this.renderer.warpedMapList.removeGeoreferencedMapById(mapId)
    this.nativeUpdate()

    return result
  }

  /**
   * Adds image information to the WarpedMapList's image information cache
   *
   * @param imageInfos - Image informations
   * @returns Image IDs of the image informations that were added
   */
  addImageInfos(imageInfos: unknown[]): string[] {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const result = this.renderer.warpedMapList.addImageInfos(imageInfos)
    this.nativeUpdate()

    return result
  }

  /**
   * Adds sprites to the Renderer's sprite tile cache
   *
   * This adds tiles from sprites to warped maps in WarpedMapList. Load maps before running this function.
   * This uses the image info of related maps. When using addImageInfos(), call it before calling this function.
   *
   * @param sprites - Sprites
   * @param imageUrl - Image url
   * @param imageSize - Image size
   */
  async addSprites(
    sprites: Sprite[],
    imageUrl: string,
    imageSize: Size
  ): Promise<void> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    await this.renderer.addSprites(sprites, imageUrl, imageSize)
    this.nativeUpdate()

    return
  }

  /**
   * Get the WarpedMapList object that contains a list of the warped maps of all loaded maps
   */
  getWarpedMapList(): WarpedMapList<WebGL2WarpedMap> {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList
  }

  /**
   * Get mapIds for all maps in the layer
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @returns The mapIds of all maps
   */
  getMapIds(): string[] {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapIds()
  }

  /**
   * Get the WarpedMap instances for all maps, or all selected maps
   *
   * If no argument is passed, the WarpedMap instance of all maps in the layer is passed
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @returns The WarpedMap instance of all (selected) map
   */
  getWarpedMaps(mapIds?: string[]): Array<WebGL2WarpedMap> {
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
   * Get the center of the bounding box of all maps in the layer
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The center of the bbox of all maps, in the chosen projection, or undefined if there were no maps.
   */
  getCenter(
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Point | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsCenter(options)
  }

  /**
   * Get the center of the bounding box of all selected maps
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The center of the bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsCenter(
    mapIds: string[],
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Point | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsCenter(
      mergePartialOptions({ mapIds }, options)
    )
  }

  /**
   * Get the bounding box of all maps in the layer
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The bbox of all maps, in the chosen projection, or undefined if there were no maps.
   */
  getBbox(
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Bbox | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsBbox(options)
  }

  /**
   * Get the bounding box of all selected maps
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The bbox of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsBbox(
    mapIds: string[],
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Bbox | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsBbox(
      mergePartialOptions({ mapIds }, options)
    )
  }

  /**
   * Get the convex hull of all maps in the layer
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The convex hull of all maps, in the chosen projection, or undefined if there were no maps.
   */
  getConvexHull(
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Ring | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsConvexHull(options)
  }

  /**
   * Get the convex hull of all selected maps maps
   *
   * The result is returned in lon-lat `EPSG:4326` by default.
   *
   * Note: more selection options are available on this function of WarpedMapList
   *
   * @param mapIds - Map IDs
   * @param options - Mask and projection options, defaults to applied mask and current projection
   * @returns The convex hull of all selected maps, in the chosen projection, or undefined if there were no maps matching the selection.
   */
  getMapsConvexHull(
    mapIds: string[],
    options?: Partial<ProjectionOptions & MaskOptions>
  ): Ring | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapsConvexHull(
      mergePartialOptions({ mapIds }, options)
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
    BaseRenderOptions<WebGL2WarpedMap> &
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
   * Set the options
   *
   * @param options - Options to set
   */
  setOptions(
    options?:
      | Partial<SpecificWarpedMapLayerOptions>
      | Partial<WebGL2RenderOptions>
  ): void {
    this.options = mergeOptions(this.options, options)
  }

  /**
   * Set the layer options
   *
   * Doesn't set render options or specific warped map layer options. Use setOptions() instead.
   *
   * @param layerOptions - Layer options to set
   * @param animationOptions - Animation options
   * ```js
   * warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
   * ```
   */
  setLayerOptions(
    layerOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    animationOptions?: Partial<AnimationOptions>
  ): void {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.setListOptions(layerOptions, animationOptions)
  }

  /**
   * Set the transformation type of the layer
   *
   * @param transformationType - Transformation type to set
   * @param animationOptions - Animation options
   */
  setLayerTransformationType(
    transformationType?: TransformationType,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setLayerOptions(
      { transformationType: transformationType },
      animationOptions
    )
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
    return this.setMapOptions(mapId, { gcps }, animationOptions)
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
    return this.setMapOptions(mapId, { resourceMask }, animationOptions)
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
    transformationType?: TransformationType,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapOptions(
      mapId,
      { transformationType: transformationType },
      animationOptions
    )
  }

  /**
   * Set the transformation type of maps
   *
   * This only sets the map-specific `transformationType` option of the map
   * (or more specifically of the warped map used for rendering),
   * overwriting the original transformation type inferred from the Georeference Annotation.
   *
   * The original transformation type can be reset by resetting the map-specific transformation type option,
   * and stays accessible in the warped map's `map` property.
   *
   * @param mapIds - Map IDs for which to set the options
   * @param transformationType - Transformation type to set
   * @param animationOptions - Animation options
   */
  setMapsTransformationType(
    mapIds: string[],
    transformationType?: TransformationType,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapsOptions(
      mapIds,
      { transformationType: transformationType },
      animationOptions
    )
  }

  /**
   * Set the map-specific options of a map
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
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapOptions(myMapId, { transformationType: 'thinPlateSpline' })
   * ```
   */
  setMapOptions(
    mapId: string,
    mapOptions: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ) {
    return this.setMapsOptions([mapId], mapOptions, animationOptions)
  }

  /**
   * Set the map-specific options of the specified maps
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
   * Useful when map-specific options are changed for multiple maps at once,
   * but only one animation should be fired.
   *
   * @param mapIds - Map IDs of the maps whose options to set
   * @param mapsOptions - Map-specific options to apply to each of those maps
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapsOptions([myMapId], { transformationType: 'thinPlateSpline' })
   * ```
   */
  setMapsOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Set the map-specific options of all maps using a per-map callback
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
   * Useful when map-specific options are changed for multiple maps at once
   * (with possibly different options for different maps), but only one animation should be fired.
   *
   * The callback receives each map's ID and returns the options to apply,
   * or `undefined` to leave that map unchanged.
   *
   * @param mapsOptionsCallbackFn - Callback returning the options to apply for a given map
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapsOptions((mapId) => mapId == myMapId ? { transformationType: 'thinPlateSpline' } : undefined)
   * ```
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
  ): void {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.setMapsOptions(firstArgument, secondArgument, thirdArgument)
  }

  /**
   * Set the map-specific options of the specified maps, and the layer options
   *
   * Useful when map-specific options are changed for multiple maps at once,
   * together with the layer options, but only one animation should be fired.
   *
   * Doesn't set render options or specific warped map layer options. Use setOptions() instead.
   *
   * @param mapIds - IDs of the maps whose options to set
   * @param mapsOptions - Map-specific options to apply to each of those maps
   * @param layerOptions - Layer options to apply
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapsAndLayerOptions([myMapId], { transformationType: 'thinPlateSpline' }, { visible: true })
   * ```
   */
  setMapsAndLayerOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    layerOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Set the map-specific options of all maps using a per-map callback, and the layer options
   *
   * Useful when map-specific options are changed for multiple maps at once (with possibly different options for different maps),
   * together with the layer options, but only one animation should be fired.
   *
   * The callback receives each map's ID and returns the options to apply,
   * or `undefined` to leave that map unchanged.
   *
   * Doesn't set render options or specific warped map layer options. Use setOptions() instead.
   *
   * @param mapsOptionsCallbackFn - Callback returning the options to apply for a given map
   * @param layerOptions - Layer options to apply
   * @param animationOptions - Animation options
   * @example
   * ```js
   * warpedMapLayer.setMapsOptions((mapId) => mapId == myMapId ? { transformationType: 'thinPlateSpline' } : undefined, {visible: true})
   * ```
   */
  setMapsAndLayerOptions(
    mapsOptionsCallbackFn: (
      mapId: string
    ) => Partial<WebGL2WarpedMapOptions> | undefined,
    layerOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndLayerOptions(
    mapIds: string[],
    mapsOptions?: Partial<WebGL2WarpedMapOptions>,
    layerOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndLayerOptions(
    mapsOptionsCallbackFn: (
      mapId: string
    ) => Partial<WebGL2WarpedMapOptions> | undefined,
    layerOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  setMapsAndLayerOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    thirdArgument?:
      | Partial<WarpedMapListOptions<WebGL2WarpedMap>>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void
  setMapsAndLayerOptions(
    firstArgument:
      | string[]
      | ((mapId: string) => Partial<WebGL2WarpedMapOptions> | undefined),
    secondArgument?:
      | Partial<WebGL2WarpedMapOptions>
      | Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    thirdArgument?:
      | Partial<WarpedMapListOptions<WebGL2WarpedMap>>
      | Partial<AnimationOptions>,
    fourthArgument?: Partial<AnimationOptions>
  ): void {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.setMapsAndListOptions(
      firstArgument,
      secondArgument,
      thirdArgument,
      fourthArgument
    )
  }

  /**
   * Reset the layer options
   *
   * Undefined option keys reset all options
   *
   * Doesn't reset render options or specific warped map layer options. Use setOptions() instead.
   *
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param animationOptions - Animation options
   */
  resetLayerOptions(
    layerOptionKeys?: string[],
    animationOptions?: Partial<AnimationOptions>
  ) {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetListOptions(layerOptionKeys, animationOptions)
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
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsOptions(firstArgument, secondArgument, thirdArgument)
  }

  /**
   * Reset the map-specific options of the specified maps, and the layer options
   *
   * Omitting `mapsOptionKeys` or `layerOptionKeys` resets all options for that scope;
   * passing an empty array resets none.
   *
   * @param mapIds - IDs of the maps whose options to reset
   * @param mapsOptionKeys - Keys of the map-specific options to reset
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param animationOptions - Animation options
   */
  resetMapsAndListOptions(
    mapIds: string[],
    mapsOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    layerOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): void
  /**
   * Reset the map-specific options of all maps using a per-map callback, and the layer options
   *
   * The callback receives each map's ID and returns the keys to reset for that map.
   * Returning `undefined` from the callback resets all options for that map, returning an empty array resets none.
   * Omitting `layerOptionKeys` resets all layer options.
   *
   * Doesn't reset render options or specific warped map layer options. Use setOptions() instead.
   *
   * @param mapsOptionKeysCallbackFn - Callback returning the option keys to reset for a given map
   * @param layerOptionKeys - Keys of the layer options to reset
   * @param animationOptions - Animation options
   */
  resetMapsAndListOptions(
    mapsOptionKeysCallbackFn: (
      mapId: string
    ) => Array<keyof WebGL2WarpedMapOptions> | undefined,
    layerOptionKeys?: Array<keyof WebGL2WarpedMapOptions>,
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
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    this.renderer.resetMapsAndListOptions(
      firstArgument,
      secondArgument,
      thirdArgument,
      fourthArgument
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
      WarpedMapEventType.IMAGEINFOSADDED,
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
      WarpedMapEventType.IMAGELOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.ERROR,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.spritesTileCache.addEventListener(
      WarpedMapEventType.MAPTILESLOADEDFROMSPRITES,
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
      WarpedMapEventType.IMAGEINFOSADDED,
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
      WarpedMapEventType.IMAGELOADED,
      this.nativeUpdate.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.ERROR,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.nativePassWarpedMapEvent.bind(this)
    )

    this.renderer.spritesTileCache.removeEventListener(
      WarpedMapEventType.MAPTILESLOADEDFROMSPRITES,
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

  // END_AUTOMATED_COPY
}
