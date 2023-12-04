/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet'
import {
  WarpedMap,
  WarpedMapList,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2Renderer
} from '@allmaps/render'
import {
  bboxToSize,
  sizesToScale,
  hexToFractionalRgb,
  isValidHttpUrl
} from '@allmaps/stdlib'

import type { Map, ZoomAnimEvent } from 'leaflet'
import type { Point, Bbox } from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'

type WarpedMapLayerOptions = {
  opacity: number
  interactive: boolean
  className: string
  pane: string
  zIndex: string
}

/**
 * WarpedMapLayer class.
 *
 * Renders georeferenced maps of a IIIF Georeference Annotation on a Leaflet map.
 * WarpedMapLayer extends Leaflet's [L.Layer](https://leafletjs.com/reference.html#layer).
 *
 * @class WarpedMapLayer
 */
export const WarpedMapLayer = L.Layer.extend({
  options: {
    opacity: 1,
    interactive: false,
    className: '',
    pane: 'tilePane',
    zIndex: '1'
  },

  /**
   * Creates a WarpedMapLayer
   * @param {unknown} [annotation] - Georeference Annotation or URL pointing to an Annotation
   * @param {WarpedMapLayerOptions} options
   */
  initialize(annotation: unknown, options: WarpedMapLayerOptions) {
    this._annotation = annotation
    L.setOptions(this, options)

    this._initGl()
  },

  /**
   * Contains all code code that creates DOM elements for the layer and adds them to map panes where they belong.
   * @async
   */
  async onAdd(map: Map) {
    const paneName = this.getPaneName()
    this._map.getPane(paneName).appendChild(this.container)

    map.on('zoomend viewreset move', this._update, this)
    map.on('zoomanim', this._animateZoom, this)
    map.on('unload', this._unload, this)

    // Note: Leaflet has a resize map state change event which we could also use, but wortking with a resizeObserver is better when dealing with device pixel ratios
    // map.on('resize', this._resized, this)
    this.resizeObserver = new ResizeObserver(this._resized.bind(this))
    this.resizeObserver.observe(this._map.getContainer(), {
      box: 'content-box'
    })

    if (this._annotation) {
      if (isValidHttpUrl(this._annotation)) {
        await this.addGeoreferenceAnnotationByUrl(this._annotation)
      } else {
        await this.addGeoreferenceAnnotation(this._annotation)
      }
    }

    this._update()
    return this
  },

  /**
   * Contains all cleanup code that removes the layer's elements from the DOM.
   */
  onRemove(map: Map) {
    this.container.remove()
    map.off('zoomend viewreset move', this._update, this)
    map.off('zoomanim', this._animateZoom, this)
  },

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @async
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results =
      this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this._update()

    return results
  },

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @async
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results =
      this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this._update()

    return results
  },

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @async
   * @param {string} annotationUrl - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.addGeoreferenceAnnotation(annotation)

    return results
  },

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @async
   * @param {string} annotationUrl - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.removeGeoreferenceAnnotation(annotation)

    return results
  },

  /**
   * Adds a Georeferenced map.
   * @param {any} georeferencedMap - Georeferenced map
   * @returns {Promise<(string | Error)>} - the map ID of the map that was added, or an error
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result = this.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this._update()

    return result
  },

  /**
   * Removes a Georeferenced map.
   * @param {any} georeferencedMap - Georeferenced map
   * @returns {Promise<(string | Error)>} - the map ID of the map that was removed, or an error
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result = this.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this._update()

    return result
  },

  /**
   * Gets the HTML container element of the layer
   * @return {HTMLElement} HTML Div Element
   */
  getContainer(): HTMLElement {
    return this.container
  },

  /**
   * Gets the HTML canvas element of the layer
   * @return {HTMLCanvasElement | null} HTML Canvas Element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas
  },

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   */
  getWarpedMapList(): WarpedMapList {
    return this.renderer.warpedMapList
  },

  /**
   * Returns a single map's warped map
   * @param {string} mapId - ID of the map
   * @returns {WarpedMap | undefined} the warped map
   */
  getWarpedMap(mapId: string): WarpedMap | undefined {
    return this.renderer.warpedMapList.getWarpedMap(mapId)
  },

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the map
   */
  showMap(mapId: string) {
    this.renderer.warpedMapList.showMaps([mapId])
    this._update()
  },

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.showMaps(mapIds)
    this._update()
  },

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the map
   */
  hideMap(mapId: string) {
    this.renderer.warpedMapList.hideMaps([mapId])
    this._update()
  },

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.hideMaps(mapIds)
    this._update()
  },

  /**
   * Returns the visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  },

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the map
   * @param {Point[]} resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Point[]) {
    this.renderer.warpedMapList.setMapResourceMask(mapId, resourceMask)
    this._update()
  },

  /**
   * Sets the transformation type of multiple maps
   * @param {Iterable<string>} mapIds - IDs of the maps
   * @param {TransformationType} transformation - new transformation type
   */
  setMapsTransformationType(
    mapIds: Iterable<string>,
    transformation: TransformationType
  ) {
    this.renderer.warpedMapList.setMapsTransformationType(
      mapIds,
      transformation
    )
    this._update()
  },

  /**
   * Return the Bbox of all visible maps (inside or outside of the Viewport), in lon lat coordinates.
   * @returns {Bbox | undefined} - bbox of all visible maps
   */
  getTotalBbox(): Bbox | undefined {
    return this.renderer.warpedMapList.getBbox()
  },

  /**
   * Return the Bbox of all visible maps (inside or outside of the Viewport), in projected coordinates.
   * @returns {Bbox | undefined} - bbox of all visible maps
   */
  getTotalProjectedBbox(): Bbox | undefined {
    return this.renderer.warpedMapList.getProjectedBbox()
  },

  /**
   * Returns the bounds of all visible maps (inside or outside of the Viewport), in lon lat coordinates.
   * @returns {L.LatLngBounds | undefined} - LatLngBounds of all visible maps
   */
  getTotalBounds(): L.LatLngBounds | undefined {
    const bbox = this.getTotalBbox()
    return L.latLngBounds(
      L.latLng(bbox[1], bbox[0]),
      L.latLng(bbox[3], bbox[2])
    )
  },

  /**
   * Returns the bounds of all visible maps (inside or outside of the Viewport), in projected coordinates.
   * @returns {L.LatLngBounds | undefined} - LatLngBounds of all visible maps
   */
  getTotalProjectedBounds(): L.LatLngBounds | undefined {
    const bbox = this.getTotalProjectedBbox()
    return L.latLngBounds(
      L.latLng(bbox[1], bbox[0]),
      L.latLng(bbox[3], bbox[2])
    )
  },

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this._update()
  },

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this._update()
  },

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this._update()
  },

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this._update()
  },

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the map
   * @returns {number | undefined} - z-index of the map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.renderer.warpedMapList.getMapZIndex(mapId)
  },

  /**
   * Gets the zIndex of the layer.
   */
  getZIndex() {
    return this.options.zIndex
  },

  /**
   * Changes the zIndex of the layer.
   * @param {number} value - zIndex
   */
  setZIndex(value: number) {
    this.options.zIndex = value
    this._updateZIndex()
    return this
  },

  /**
   * Sets the image info Cache of the warpedMapList, informing it's warped maps about possibly cached imageInfo.
   * @param {Cache} cache - the image info cache
   */
  setImageInfoCache(cache: Cache) {
    this.renderer.warpedMapList.setImageInfoCache(cache)
  },

  /**
   * Brings the layer in front of other overlays (in the same map pane).
   */
  bringToFront() {
    if (this._map) {
      L.DomUtil.toFront(this.container)
    }
    return this
  },

  /**
   * Brings the layer to the back of other overlays (in the same map pane).
   */
  bringToBack() {
    if (this._map) {
      L.DomUtil.toBack(this.container)
    }
    return this
  },

  /**
   * Gets the pane name the layer is attached to. Defaults to 'tilePane'
   * @returns {string} Pane name
   */
  getPaneName(): string {
    return this._map.getPane(this.options.pane) ? this.options.pane : 'tilePane'
  },

  /**
   * Gets the opacity of the layer
   * @returns {number} Layer opacity
   */
  getOpacity(): number {
    return this.options.opacity
  },

  /**
   * Sets the opacity of the layer
   * @param {number} opacity - Layer opacity
   */
  setOpacity(opacity: number) {
    this.options.opacity = opacity
    this._update()
    return this
  },

  /**
   * Sets the opacity of a single map
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this._update()
    return this
  },

  /**
   * Resets the opacity of a single map to 1
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this._update()
    return this
  },

  /**
   * Sets the saturation of a single map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setSaturation(saturation: number) {
    this.renderer.setSaturation(saturation)
    this._update()
    return this
  },

  /**
   * Resets the saturation of a single map to the original colors
   */
  resetSaturation() {
    this.renderer.resetSaturation()
    this._update()
    return this
  },

  /**
   * Sets the saturation of a single map
   * @param {string} mapId - ID of the map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    this.renderer.setMapSaturation(mapId, saturation)
    this._update()
    return this
  },

  /**
   * Resets the saturation of a single map to the original colors
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    this.renderer.resetMapSaturation(mapId)
    this._update()
    return this
  },

  /**
   * Removes a color from all maps
   * @param {Object} options - remove color options
   * @param {string} [options.hexColor] - hex color to remove
   * @param {number} [options.threshold] - threshold between 0 and 1
   * @param {number} [options.hardness] - hardness between 0 and 1
   */
  setRemoveColor(
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
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
  },

  /**
   * Resets the color removal for all maps
   */
  resetRemoveColor() {
    this.renderer.resetRemoveColorOptions()
    this._update()
    return this
  },

  /**
   * Removes a color from a single map
   * @param {string} mapId - ID of the map
   * @param {Object} options - remove color options
   * @param {string} [options.hexColor] - hex color to remove
   * @param {number} [options.threshold] - threshold between 0 and 1
   * @param {number} [options.hardness] - hardness between 0 and 1
   */
  setMapRemoveColor(
    mapId: string,
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
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
  },

  /**
   * Resets the color removal for a single map
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColor(mapId: string) {
    this.renderer.resetMapRemoveColorOptions(mapId)
    return this
  },

  /**
   * Sets the colorization for all maps
   * @param {string} hexColor - desired hex color
   */
  setColorize(hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setColorizeOptions({ color })
      this._update()
    }
    return this
  },

  /**
   * Resets the colorization for all maps
   */
  resetColorize() {
    this.renderer.resetColorizeOptions()
    this._update()
    return this
  },

  /**
   * Sets the colorization for a single map
   * @param {string} mapId - ID of the map
   * @param {string} hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapColorizeOptions(mapId, { color })
      this._update()
    }
    return this
  },

  /**
   * Resets the colorization of a single map
   * @param {string} mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorizeOptions(mapId)
    this._update()
    return this
  },

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

    const warpedMapList = new WarpedMapList(this.options.imageInfoCache)

    this.renderer = new WebGL2Renderer(this.gl, warpedMapList)

    this._addEventListeners()
  },

  _resized(entries: ResizeObserverEntry[]) {
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
  },

  // Note: borrowed from L.ImageOverlay
  // https://github.com/Leaflet/Leaflet/blob/3b62c7ec96242ee4040cf438a8101a48f8da316d/src/layer/ImageOverlay.js#L225
  _animateZoom(e: ZoomAnimEvent) {
    const scale = this._map.getZoomScale(e.zoom)
    const offset = this._map._latLngBoundsToNewLayerBounds(
      this._map.getBounds(),
      e.zoom,
      e.center
    ).min

    L.DomUtil.setTransform(this.canvas, offset, scale)
  },

  _updateZIndex() {
    if (
      this.container &&
      this.options.zIndex !== undefined &&
      this.options.zIndex !== null
    ) {
      this.container.style.zIndex = this.options.zIndex
    }
  },

  _update() {
    if (!this._map) {
      return
    }

    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, topLeft)

    // Get and Set opacity from Leaflet
    this.renderer.setOpacity(this.getOpacity())

    // Prepare Viewport input
    const geoCenterAsPoint = this._map.getCenter()
    const projectedGeoCenterAsPoint =
      this._map.options.crs.project(geoCenterAsPoint)
    const projectedGeoCenter = [
      projectedGeoCenterAsPoint.x,
      projectedGeoCenterAsPoint.y
    ] as [number, number]

    const viewportSizeAsPoint = this._map.getSize()
    const viewportSize = [viewportSizeAsPoint.x, viewportSizeAsPoint.y] as [
      number,
      number
    ]

    const geoBboxAsLatLngBounds = this._map.getBounds()
    const projectedNorthEastAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getNorthEast()
    )
    const projectedSouthWestAsPoint = this._map.options.crs.project(
      geoBboxAsLatLngBounds.getSouthWest()
    )
    const projectedGeoBbox = [
      projectedSouthWestAsPoint.x,
      projectedSouthWestAsPoint.y,
      projectedNorthEastAsPoint.x,
      projectedNorthEastAsPoint.y
    ] as [number, number, number, number]
    const projectedGeoSize = bboxToSize(projectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoSize,
      viewportSize
    )

    const viewport = new Viewport(
      projectedGeoCenter,
      viewportSize,
      0,
      projectedGeoPerViewportScale,
      window.devicePixelRatio
    )

    // Render
    this.renderer.render(viewport)

    return this.container
  },

  _addEventListeners() {
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
  },

  _removeEventListeners() {
    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this._passWarpedMapEvent.bind(this)
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
  },

  _passWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (this._map) {
        this._map.fire(event.type, event.data)
      }
    }
  },

  _unload() {
    this.renderer.dispose()

    const extension = this.gl.getExtension('WEBGL_lose_context')
    if (extension) {
      extension.loseContext()
    }
    const canvas = this.gl.canvas
    canvas.width = 1
    canvas.height = 1

    this.resizeObserver.disconnect()

    this._removeEventListeners()
  }
})
