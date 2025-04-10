import { Layer, DomUtil, setOptions } from 'leaflet'

import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2'
import {
  WarpedMapList,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapLayerOptions
} from '@allmaps/render'
import {
  rectangleToSize,
  sizesToScale,
  hexToFractionalRgb,
  isValidHttpUrl
} from '@allmaps/stdlib'

import type { Map, ZoomAnimEvent } from 'leaflet'
import type { Point, Rectangle, ImageInformations } from '@allmaps/types'
import type { TransformationType, DistortionMeasure } from '@allmaps/transform'

export type LeafletWarpedMapLayerOptions = WarpedMapLayerOptions & {
  opacity: number
  interactive: boolean
  className: string
  pane: string
  zIndex?: number
  imageInformations?: ImageInformations
}

const NO_RENDERER_ERROR_MESSAGE =
  'Renderer not defined. Add the layer to a map before calling this function.'

const NO_CANVAS_ERROR_MESSAGE =
  'Canvas not defined. Add the layer to a map before calling this function.'

const DEFAULT_PANE = 'tilePane'
const DEFAULT_OPACITY = 1

function assertRenderer(
  renderer?: WebGL2Renderer
): asserts renderer is WebGL2Renderer {
  if (!renderer) {
    throw new Error(NO_RENDERER_ERROR_MESSAGE)
  }
}

function assertCanvas(
  canvas?: HTMLCanvasElement
): asserts canvas is HTMLCanvasElement {
  if (!canvas) {
    throw new Error(NO_CANVAS_ERROR_MESSAGE)
  }
}

/**
 * WarpedMapLayer class.
 *
 * Renders georeferenced maps of a Georeference Annotation on a Leaflet map.
 * WarpedMapLayer extends Leaflet's [L.Layer](https://leafletjs.com/reference.html#layer).
 */
export class WarpedMapLayer extends Layer {
  container: HTMLDivElement | undefined

  canvas: HTMLCanvasElement | undefined
  gl: WebGL2RenderingContext | null | undefined

  renderer: WebGL2Renderer | undefined

  _annotationOrAnnotationUrl: (unknown | string) | undefined

  resizeObserver: ResizeObserver | undefined

  options: Partial<LeafletWarpedMapLayerOptions> = {
    opacity: DEFAULT_OPACITY,
    interactive: false,
    className: '',
    pane: DEFAULT_PANE,
    zIndex: 1
  }

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
    this.initialize(annotationOrAnnotationUrl, options)
  }

  initialize(
    annotationOrAnnotationUrl: unknown,
    options?: Partial<LeafletWarpedMapLayerOptions>
  ) {
    this._annotationOrAnnotationUrl = annotationOrAnnotationUrl
    setOptions(this, options)

    this._initGl()
  }

  /**
   * Contains all code code that creates DOM elements for the layer and adds them to map panes where they belong.
   */
  onAdd(map: Map) {
    if (!this._map || !this.container) {
      return this
    }

    const paneName = this.getPaneName()
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
  onRemove(map: Map) {
    if (this.container) {
      this.container.remove()
    }

    map.off('zoomend viewreset move', this._update, this)
    map.off('zoomanim', this._animateZoom, this)

    return this
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param annotation - Georeference Annotation
   * @returns - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this._update()

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param annotation - Georeference Annotation
   * @returns - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this._update()

    return results
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param annotationUrl - Georeference Annotation
   * @returns The map IDs of the maps that were added, or an error per map
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
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param annotationUrl - Georeference Annotation
   * @returns The map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.removeGeoreferenceAnnotation(annotation)

    return results
  }

  /**
   * Adds a Georeferenced map.
   * @param georeferencedMap - Georeferenced map
   * @returns The map ID of the map that was added, or an error
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this._update()

    return result
  }

  /**
   * Removes a Georeferenced map.
   * @param georeferencedMap - Georeferenced map
   * @returns The map ID of the map that was removed, or an error
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this._update()

    return result
  }

  /**
   * Gets the HTML container element of the layer
   * @returns HTML Div Element
   */
  getContainer(): HTMLDivElement | undefined {
    return this.container
  }

  /**
   * Gets the HTML canvas element of the layer
   * @returns HTML Canvas Element
   */
  getCanvas(): HTMLCanvasElement | undefined {
    return this.canvas
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   */
  getWarpedMapList(): WarpedMapList<WebGL2WarpedMap> {
    assertRenderer(this.renderer)

    return this.renderer.warpedMapList
  }

  /**
   * Returns a single map's warped map
   * @param mapId - ID of the map
   * @returns the warped map
   */
  getWarpedMap(mapId: string): WebGL2WarpedMap | undefined {
    assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Make a single map visible
   * @param mapId - ID of the map
   */
  showMap(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.showMaps([mapId])
    this._update()
  }

  /**
   * Make multiple maps visible
   * @param mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.showMaps(mapIds)
    this._update()
  }

  /**
   * Make a single map invisible
   * @param mapId - ID of the map
   */
  hideMap(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.hideMaps([mapId])

    this._update()
  }

  /**
   * Make multiple maps invisible
   * @param mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.hideMaps(mapIds)
    this._update()
  }

  /**
   * Returns the visibility of a single map
   * @returns - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    assertRenderer(this.renderer)

    const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param mapId - ID of the map
   * @param resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Point[]) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setMapResourceMask(resourceMask, mapId)
    this._update()
  }

  /**
   * Sets the transformation type of multiple maps
   * @param mapIds - IDs of the maps
   * @param transformation - new transformation type
   */
  setMapsTransformationType(
    mapIds: Iterable<string>,
    transformation: TransformationType
  ) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setMapsTransformationType(transformation, {
      mapIds
    })
    this._update()
  }

  /**
   * Sets the distortion measure of multiple maps
   * @param mapIds - IDs of the maps
   * @param distortionMeasure - new transformation type
   */
  setMapsDistortionMeasure(
    mapIds: Iterable<string>,
    distortionMeasure?: DistortionMeasure
  ) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setMapsDistortionMeasure(distortionMeasure, {
      mapIds
    })
    this._update()
  }

  /**
   * Returns the bounds of all visible maps (inside or outside of the Viewport), in latitude/longitude coordinates.
   * @returns - L.LatLngBounds in array form of all visible maps
   */
  getBounds(): number[][] | undefined {
    assertRenderer(this.renderer)

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
   * Bring maps to front
   * @param mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this._update()
  }

  /**
   * Send maps to back
   * @param mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this._update()
  }

  /**
   * Bring maps forward
   * @param mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this._update()
  }

  /**
   * Send maps backward
   * @param mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this._update()
  }

  /**
   * Brings the layer in front of other overlays (in the same map pane).
   */
  bringToFront() {
    if (this._map && this.container) {
      DomUtil.toFront(this.container)
    }
    return this
  }

  /**
   * Brings the layer to the back of other overlays (in the same map pane).
   */
  bringToBack() {
    if (this._map && this.container) {
      DomUtil.toBack(this.container)
    }
    return this
  }

  /**
   * Returns the z-index of a single map
   * @param mapId - ID of the map
   * @returns - z-index of the map
   */
  getMapZIndex(mapId: string): number | undefined {
    assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapZIndex(mapId)
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

  /**
   * Sets the object that caches image information
   *
   * @param imageInformations - Object that caches image information
   */
  setImageInformations(imageInformations: ImageInformations) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setImageInformations(imageInformations)
  }

  /**
   * Gets the pane name the layer is attached to. Defaults to 'tilePane'
   * @returns Pane name
   */
  getPaneName(): string {
    // this._map.getPane(this.options.pane) ? this.options.pane : DEFAULT_PANE
    return this.options.pane || DEFAULT_PANE
  }

  /**
   * Gets the opacity of the layer
   * @returns Layer opacity
   */
  getOpacity(): number {
    return this.options.opacity || DEFAULT_OPACITY
  }

  /**
   * Sets the opacity of the layer
   * @param opacity - Layer opacity
   */
  setOpacity(opacity: number) {
    this.options.opacity = opacity
    this._update()
    return this
  }

  /**
   * Resets the opacity of the layer to fully opaque
   */
  resetOpacity() {
    this.options.opacity = 1
    this._update()
    return this
  }

  /**
   * Sets the options
   *
   * @param options - Options
   */
  setOptions(options?: Partial<LeafletWarpedMapLayerOptions>) {
    assertRenderer(this.renderer)

    this.renderer.setOptions(options)
  }

  /**
   * Gets the opacity of a single map
   * @param mapId - ID of the map
   * @returns opacity of the map
   */
  getMapOpacity(mapId: string): number | undefined {
    assertRenderer(this.renderer)

    return this.renderer.getMapOpacity(mapId)
  }

  /**
   * Sets the opacity of a single map
   * @param mapId - ID of the map
   * @param opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    assertRenderer(this.renderer)

    this.renderer.setMapOpacity(mapId, opacity)
    this._update()
    return this
  }

  /**
   * Resets the opacity of a single map to 1
   * @param mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.resetMapOpacity(mapId)
    this._update()
    return this
  }

  /**
   * Sets the saturation of a single map
   * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setSaturation(saturation: number) {
    assertRenderer(this.renderer)

    this.renderer.setSaturation(saturation)
    this._update()
    return this
  }

  /**
   * Resets the saturation of a single map to the original colors
   */
  resetSaturation() {
    assertRenderer(this.renderer)

    this.renderer.resetSaturation()
    this._update()
    return this
  }

  /**
   * Sets the saturation of a single map
   * @param mapId - ID of the map
   * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    assertRenderer(this.renderer)

    this.renderer.setMapSaturation(mapId, saturation)
    this._update()
    return this
  }

  /**
   * Resets the saturation of a single map to the original colors
   * @param mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.resetMapSaturation(mapId)
    this._update()
    return this
  }

  /**
   * Removes a color from all maps
   * @param options - remove color options
   * @param options.hexColor - hex color to remove
   * @param options.threshold - threshold between 0 and 1
   * @param options.hardness - hardness between 0 and 1
   */
  setRemoveColor(
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    assertRenderer(this.renderer)

    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setRemoveColorOptions({
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
    return this
  }

  /**
   * Resets the color removal for all maps
   */
  resetRemoveColor() {
    assertRenderer(this.renderer)

    this.renderer.resetRemoveColorOptions()
    this._update()
    return this
  }

  /**
   * Removes a color from a single map
   * @param mapId - ID of the map
   * @param options - remove color options
   * @param options.hexColor - hex color to remove
   * @param options.threshold - threshold between 0 and 1
   * @param options.hardness - hardness between 0 and 1
   */
  setMapRemoveColor(
    mapId: string,
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    assertRenderer(this.renderer)

    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setMapRemoveColorOptions(mapId, {
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
    return this
  }

  /**
   * Resets the color removal for a single map
   * @param mapId - ID of the map
   */
  resetMapRemoveColor(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.resetMapRemoveColorOptions(mapId)
    return this
  }

  /**
   * Sets the colorization for all maps
   * @param hexColor - desired hex color
   */
  setColorize(hexColor: string) {
    assertRenderer(this.renderer)

    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setColorizeOptions({ color })
      this._update()
    }
    return this
  }

  /**
   * Resets the colorization for all maps
   */
  resetColorize() {
    assertRenderer(this.renderer)

    this.renderer.resetColorizeOptions()
    this._update()

    return this
  }

  /**
   * Sets the colorization for a single map
   * @param mapId - ID of the map
   * @param hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    assertRenderer(this.renderer)

    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setMapColorizeOptions(mapId, { color })
      this._update()
    }
    return this
  }

  /**
   * Resets the colorization of a single map
   * @param mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    assertRenderer(this.renderer)

    this.renderer.resetMapColorizeOptions(mapId)
    this._update()
    return this
  }

  /**
   * Removes all warped maps from the layer
   */
  clear() {
    assertRenderer(this.renderer)

    this.renderer.clear()
    this._update()
    return this
  }

  _initGl() {
    this.container = DomUtil.create('div')

    this.container.classList.add('leaflet-layer')
    this.container.classList.add('allmaps-warped-map-layer')
    if (this.options.zIndex) {
      this._updateZIndex()
    }

    this.canvas = DomUtil.create('canvas', undefined, this.container)

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

    this._addEventListeners()
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

      // if (entry.devicePixelContentBoxSize) {
      //   // NOTE: Only this path gives the correct answer
      //   // The other paths are imperfect fallbacks
      //   // for browsers that don't provide anyway to do this
      //   width = entry.devicePixelContentBoxSize[0].inlineSize
      //   height = entry.devicePixelContentBoxSize[0].blockSize
      //   dpr = 1 // it's already in width and height
      // } else if (entry.contentBoxSize) {
      //   if (entry.contentBoxSize[0]) {
      //     width = entry.contentBoxSize[0].inlineSize
      //     height = entry.contentBoxSize[0].blockSize
      //   }
      // }

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
  _animateZoom(e: ZoomAnimEvent) {
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

    DomUtil.setTransform(this.canvas, offset, scale)
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
    DomUtil.setPosition(this.canvas, topLeft)

    // Get and Set opacity from Leaflet
    this.renderer.setOpacity(this.getOpacity())

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

  _contextLost(event: Event) {
    event.preventDefault()
    this.renderer?.contextLost()
  }

  _contextRestored(event: Event) {
    event.preventDefault()
    this.renderer?.contextRestored()
  }

  _addEventListeners() {
    assertRenderer(this.renderer)
    assertCanvas(this.canvas)

    this.canvas.addEventListener(
      'webglcontextlost',
      this._contextLost.bind(this)
    )
    this.canvas.addEventListener(
      'webglcontextrestored',
      this._contextRestored.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this._update.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this._update.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this._update.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this._update.bind(this)
    )
  }

  _removeEventListeners() {
    assertRenderer(this.renderer)
    assertCanvas(this.canvas)

    this.canvas.addEventListener(
      'webglcontextlost',
      this._contextLost.bind(this)
    )
    this.canvas.addEventListener(
      'webglcontextrestored',
      this._contextRestored.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this._update.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this._update.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this._passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this._update.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this._update.bind(this)
    )
  }

  _passWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (this._map) {
        this._map.fire(event.type, event.data)
      }
    }
  }

  _unload() {
    assertRenderer(this.renderer)

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

    this._removeEventListeners()
  }
}
