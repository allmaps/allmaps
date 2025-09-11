import * as L from 'leaflet'

import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2'
import {
  WarpedMapList,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2RenderOptions,
  ProjectionOptions,
  WebGL2WarpedMapOptions,
  SetOptionsOptions
} from '@allmaps/render'
import {
  rectangleToSize,
  sizesToScale,
  isValidHttpUrl,
  mergeOptions,
  mergePartialOptions
} from '@allmaps/stdlib'
import { BaseWarpedMapLayer } from '@allmaps/warpedmaplayer'

import type { Point, Rectangle, Ring, Bbox } from '@allmaps/types'

export type SpecificLeafletWarpedMapLayerOptions = {
  interactive: boolean
  className: string
  pane: string
  zIndex?: number
}

export type LeafletWarpedMapLayerOptions =
  SpecificLeafletWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

type SpecificWarpedMapLayerOptions = LeafletWarpedMapLayerOptions

const DEFAULT_SPECIFIC_LEAFLET_WARPED_MAP_LAYER_OPTIONS = {
  interactive: false,
  className: '',
  pane: 'tilePane',
  zIndex: 1
}

/**
 * WarpedMapLayer class.
 *
 * Renders georeferenced maps of a Georeference Annotation on a Leaflet map.
 * WarpedMapLayer extends Leaflet's [L.Layer](https://leafletjs.com/reference.html#layer).
 */
export class WarpedMapLayer
  extends L.Layer
  implements BaseWarpedMapLayer<SpecificLeafletWarpedMapLayerOptions>
{
  defaultSpecificWarpedMapLayerOptions: SpecificLeafletWarpedMapLayerOptions
  options: SpecificLeafletWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

  container?: HTMLDivElement
  canvas?: HTMLCanvasElement
  gl: WebGL2RenderingContext | null | undefined

  renderer?: WebGL2Renderer

  _annotationOrAnnotationUrl: (unknown | string) | undefined

  resizeObserver: ResizeObserver | undefined

  /**
   * Creates a WarpedMapLayer
   * @param annotationOrAnnotationUrl - Georeference Annotation or URL of a Georeference Annotation
   * @param options - Options for the layer
   */
  constructor(
    annotationOrAnnotationUrl: unknown,
    options?: Partial<LeafletWarpedMapLayerOptions>
  ) {
    super()
    this.defaultSpecificWarpedMapLayerOptions =
      DEFAULT_SPECIFIC_LEAFLET_WARPED_MAP_LAYER_OPTIONS
    this.options = mergeOptions(
      this.defaultSpecificWarpedMapLayerOptions,
      options
    )

    this.initialize(annotationOrAnnotationUrl, options)
  }

  initialize(
    annotationOrAnnotationUrl: unknown,
    options?: Partial<LeafletWarpedMapLayerOptions>
  ) {
    this._annotationOrAnnotationUrl = annotationOrAnnotationUrl
    L.setOptions(this, options)

    this._initGl()
  }

  /**
   * Contains all code code that creates DOM elements for the layer and adds them to map panes where they belong.
   */
  onAdd(map: L.Map) {
    if (!this._map || !this.container) {
      return this
    }

    const paneName = this.options.pane
    const pane = this._map.getPane(paneName)
    pane?.appendChild(this.container)

    map.on('zoomend viewreset move', this._update, this)
    map.on('zoomanim', this._animateZoom, this)
    map.on('unload', this._unload, this)

    // Note: Leaflet has a resize map state change event which we could also use, but wortking with a resizeObserver is better when dealing with device pixel ratios
    // map.on('resize', this._resized, this)
    this.resizeObserver = new ResizeObserver(this._resized.bind(this))
    this.resizeObserver.observe(this._map.getContainer(), {
      box: 'content-box'
    })

    if (this._annotationOrAnnotationUrl) {
      if (
        typeof this._annotationOrAnnotationUrl === 'string' &&
        isValidHttpUrl(this._annotationOrAnnotationUrl)
      ) {
        this.addGeoreferenceAnnotationByUrl(
          this._annotationOrAnnotationUrl
        ).then(() => this._update())
      } else {
        this.addGeoreferenceAnnotation(this._annotationOrAnnotationUrl).then(
          () => this._update()
        )
      }
    }

    return this
  }

  /**
   * Contains all cleanup code that removes the layer's elements from the DOM.
   */
  onRemove(map: L.Map) {
    if (this.container) {
      this.container.remove()
    }

    map.off('zoomend viewreset move', this._update, this)
    map.off('zoomanim', this._animateZoom, this)

    return this
  }

  /**
   * Returns the bounds of all visible maps (inside or outside of the Viewport), in latitude/longitude coordinates.
   * @returns - L.LatLngBounds in array form of all visible maps
   */
  getBounds(): number[][] | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const bbox = this.renderer.warpedMapList.getMapsBbox({
      projection: { definition: 'EPSG:4326' }
    })
    if (bbox) {
      return [
        [bbox[1], bbox[0]],
        [bbox[3], bbox[2]]
      ]
    }
  }

  /**
   * Brings the layer in front of other overlays (in the same map pane).
   */
  bringToFront() {
    if (this._map && this.container) {
      L.DomUtil.toFront(this.container)
    }
    return this
  }

  /**
   * Brings the layer to the back of other overlays (in the same map pane).
   */
  bringToBack() {
    if (this._map && this.container) {
      L.DomUtil.toBack(this.container)
    }
    return this
  }

  /**
   * Gets the z-index of the layer.
   */
  getZIndex() {
    return this.options.zIndex
  }

  /**
   * Changes the z-index of the layer.
   * @param value - z-index
   */
  setZIndex(value: number) {
    this.options.zIndex = value
    this._updateZIndex()
    return this
  }

  _initGl() {
    this.container = L.DomUtil.create('div')

    this.container.classList.add('leaflet-layer')
    this.container.classList.add('allmaps-warped-map-layer')
    if (this.options.zIndex) {
      this._updateZIndex()
    }

    this.canvas = L.DomUtil.create('canvas', undefined, this.container)

    this.canvas.classList.add('leaflet-zoom-animated') // Treat canvas element like L.ImageOverlay
    this.canvas.classList.add('leaflet-image-layer') // Treat canvas element like L.ImageOverlay
    if (this.options.interactive) {
      this.canvas.classList.add('leaflet-interactive')
    }
    if (this.options.className) {
      this.canvas.classList.add(this.options.className)
    }

    this.gl = this.canvas.getContext('webgl2', {
      premultipliedAlpha: true
    })

    if (!this.gl) {
      throw new Error('WebGL 2 not available')
    }

    this.renderer = new WebGL2Renderer(this.gl)

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

  _resized(entries: ResizeObserverEntry[]) {
    if (!this.canvas) {
      return
    }

    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // TODO: read + understand https://web.dev/device-pixel-content-box/
    for (const entry of entries) {
      const width = entry.contentRect.width
      const height = entry.contentRect.height
      const dpr = window.devicePixelRatio

      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)

      this.canvas.width = displayWidth
      this.canvas.height = displayHeight

      this.canvas.style.width = width + 'px'
      this.canvas.style.height = height + 'px'
    }
    this._update()
  }

  // Note: borrowed from L.ImageOverlay
  // https://github.com/Leaflet/Leaflet/blob/3b62c7ec96242ee4040cf438a8101a48f8da316d/src/layer/ImageOverlay.js#L225
  _animateZoom(e: L.ZoomAnimEvent) {
    if (!this.canvas) {
      return
    }

    const scale = this._map.getZoomScale(e.zoom)

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore
    const offset = this._map._latLngBoundsToNewLayerBounds(
      this._map.getBounds(),
      e.zoom,
      e.center
    ).min

    L.DomUtil.setTransform(this.canvas, offset, scale)
  }

  _updateZIndex() {
    if (this.container && this.options.zIndex !== undefined) {
      this.container.style.zIndex = String(this.options.zIndex)
    }
  }

  _update() {
    if (
      !this._map ||
      !this.renderer ||
      !this.canvas ||
      !this._map.options.crs
    ) {
      return
    }

    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, topLeft)

    // Prepare Viewport input
    const viewportSizeAsPoint = this._map.getSize()
    const viewportSize = [viewportSizeAsPoint.x, viewportSizeAsPoint.y] as [
      number,
      number
    ]

    const geoCenterAsPoint = this._map.getCenter()
    const projectedGeoCenterAsPoint =
      this._map.options.crs.project(geoCenterAsPoint)
    const projectedGeoCenter = [
      projectedGeoCenterAsPoint.x,
      projectedGeoCenterAsPoint.y
    ] as [number, number]

    const geoBboxAsLatLngBounds = this._map.getBounds()
    const projectedNorthEastAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getNorthEast()
    )
    const projectedNorthWestAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getNorthWest()
    )
    const projectedSouthWestAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getSouthWest()
    )
    const projectedSouthEastAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getSouthEast()
    )
    const projectedGeoRectangle = [
      [projectedNorthEastAsPoint.x, projectedNorthEastAsPoint.y],
      [projectedNorthWestAsPoint.x, projectedNorthWestAsPoint.y],
      [projectedSouthWestAsPoint.x, projectedSouthWestAsPoint.y],
      [projectedSouthEastAsPoint.x, projectedSouthEastAsPoint.y]
    ] as Rectangle
    const projectedGeoSize = rectangleToSize(projectedGeoRectangle)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoSize,
      viewportSize
    )

    const devicePixelRatio = window.devicePixelRatio

    const viewport = new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale,
      { devicePixelRatio }
    )

    this.renderer.render(viewport)

    return this.container
  }

  _unload() {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    if (!this.gl) {
      return
    }

    this.renderer.destroy()

    const extension = this.gl.getExtension('WEBGL_lose_context')
    if (extension) {
      extension.loseContext()
    }
    const canvas = this.gl.canvas
    canvas.width = 1
    canvas.height = 1

    this.resizeObserver?.disconnect()

    this.canvas?.addEventListener(
      'webglcontextlost',
      this.contextLost.bind(this)
    )
    this.canvas?.addEventListener(
      'webglcontextrestored',
      this.contextRestored.bind(this)
    )
  }

  ///////////////////////////////
  // Implemented methods below //
  ///////////////////////////////

  // Functions defined as abstract in base class

  nativeUpdate(): void {
    this._update()
  }

  nativePassWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (this._map) {
        this._map.fire(event.type, event.data)
      }
    }
  }

  // Normal functions
  //
  // These are copied from @allmaps/warpedmaplayermap
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
   * Get the default options of a map
   *
   * These come from the default option settings and it's georeferenced map proporties
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapDefaultOptions(): WebGL2WarpedMapOptions
  getMapDefaultOptions(mapId: string): WebGL2WarpedMapOptions | undefined
  getMapDefaultOptions(mapId?: string): WebGL2WarpedMapOptions | undefined {
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
   * Set the layer options
   *
   * @param layerOptions - Layer options to set
   * @param setOptionsOptions - Options when setting the options
   * @example
   * ```js
   * warpedMapLayer.setLayerOptions({ transformationType: 'thinPlateSpline' })
   * ```
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
   * Set the map-specific options of maps (and the layer options)
   *
   * @param mapIds - Map IDs for which to set the options
   * @param mapOptions - Map-specific options to set
   * @param layerOptions - Layer options to set
   * @param setOptionsOptions - Options when setting the options
   * @example
   * ```js
   * warpedMapLayer.setMapOptions([myMapId], { transformationType: 'thinPlateSpline' })
   * ```
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
   * Set the map-specific options of maps by map ID (and the layer options)
   *
   * @param mapOptionsByMapId - Map-specific options to set by map ID
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
   * Reset the layer options
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
   * Reset the map-specific options of maps (and the layer options)
   *
   * An empty array resets all options, undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapIds - Map IDs for which to reset the options
   * @param mapOptionKeys - Keys of the map-specific options to reset
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
   * Reset the map-specific options of maps by map ID (and the layer options)
   *
   * An empty array or map resets all options (for all maps), undefined resets no options.
   * Doesn't reset render options or specific warped map layer options
   *
   * @param mapOptionkeysByMapId - Keys of map-specific options to reset by map ID
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
