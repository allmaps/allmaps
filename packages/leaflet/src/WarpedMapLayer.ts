/* eslint-disable @typescript-eslint/no-explicit-any */
import * as L from 'leaflet'
import { throttle } from 'lodash-es'

import {
  TileCache,
  World,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  composeTransform,
  WebGL2Renderer,
  RTree,
  toLonLat
} from '@allmaps/render'
import { hexToFractionalRgb, isValidHttpUrl } from '@allmaps/stdlib'

import type { Map, ZoomAnimEvent } from 'leaflet'

import type { Size, BBox, Transform, NeededTile } from '@allmaps/render'
import type { TransformationType } from '@allmaps/transform'
import type { Position } from '@allmaps/types'

// TODO: make class or integrate in Viewport
type FrameState = {
  size: [number, number] // [width, height]
  rotation: number // rotation in radians
  resolution: number
  center: [number, number] // position
  extent: [number, number, number, number] // [minx, miny, maxx, maxy]
  coordinateToPixelTransform: Transform
}

type WarpedMapLayerOptions = {
  opacity: number
  interactive: boolean
  className: string
  pane: string
  zIndex: string
}

/**
 * WarpedMapLayer class. Renders a warped map on a Leaflet map. WarpedMapLayer extends Leaflet's [L.Layer](https://leafletjs.com/reference.html#layer).
 * @class WarpedMapLayer
 */
export const WarpedMapLayer = L.Layer.extend({
  options: {
    THROTTLE_WAIT_MS: 100,
    THROTTLE_OPTIONS: {
      leading: true,
      trailing: true
    },
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
   * Contains all code code that creates DOM elements for the layer, adds them to map panes where they should belong and puts listeners on relevant map events
   * @async
   */
  async onAdd(map: Map) {
    const paneName = this.getPaneName()
    this._map.getPane(paneName).appendChild(this.container)

    map.on('zoomend viewreset move', this._update, this)
    map.on('zoomanim', this._animateZoom, this)
    map.on('unload', this._unload, this)

    // Note: Leaflet has a resize map state change event which we could also use, but wortking with a resizeObserver is better when dealing with device pixel ratios
    // map.on('resize', this._resize, this)
    this.resizeObserver = new ResizeObserver(this._resize.bind(this))
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
   * Contains all cleanup code that removes the layer's elements from the DOM and removes listeners previously added in onAdd.
   */
  onRemove(map: Map) {
    this.container.remove()
    map.off('zoomend viewreset move', this._update, this)
    map.off('zoomanim', this._animateZoom, this)
  },

  /**
   * Gets the HTML container element of the layer
   * @return {HTMLDivElement} HTML Div Element
   */
  getContainer(): HTMLDivElement {
    return this.container
  },

  /**
   * Gets the HTML canvas element of the layer
   * @return {HTMLCanvasElement} HTML Canvas Element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas
  },

  /**
   * Returns the World object that contains a list of all maps
   */
  getWorld(): World {
    return this.world
  },

  /**
   * Returns a single map
   * @param {string} mapId - ID of the warped map
   */
  getMap(mapId: string) {
    return this.world.getMap(mapId)
  },

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the warped map
   */
  showMap(mapId: string) {
    this.world.showMaps([mapId])
    this._update()
  },

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.world.showMaps(mapIds)
    this._update()
  },

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the warped map
   */
  hideMap(mapId: string) {
    this.world.hideMaps([mapId])
    this._update()
  },

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.world.hideMaps(mapIds)
    this._update()
  },

  /**
   * Returns visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.world.getMap(mapId)
    return warpedMap?.visible
  },

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the warped map
   * @param {Position[]} resourceMask - new resource mask
   */
  setResourceMask(mapId: string, resourceMask: Position[]) {
    this.world.setResourceMask(mapId, resourceMask)
    this._update()
  },

  /**
   * Sets the transformation type of multiple maps
   * @param {Iterable<string>} mapIds - IDs of the warped maps
   * @param {TransformationType} transformation - new transformation type
   */
  setMapsTransformation(
    mapIds: Iterable<string>,
    transformation: TransformationType
  ) {
    this.world.setMapsTransformation(mapIds, transformation)
    this._update()
  },

  /**
   * Return the extent of all maps in the layer
   * @returns {BBox | undefined} - extent of all warped maps
   */
  getExtent(): BBox | undefined {
    return this.world.getBBox()
  },

  /**
   * Returns the bounds of all maps in the layer. Run after loading a map, e.g. by listening for the 'warpedmapadded' event.
   * @returns {L.LatLngBounds | undefined} Bounds
   */
  getBounds(): L.LatLngBounds | undefined {
    const bbox = this.world.getBBox()
    if (!bbox) {
      return undefined
    } else {
      // Switch from WarpedMap's lng-lat webmercator to Leaflet's lat-lng wgs84
      // TODO: remove this call for toLonLat when WarpedMap will store unprojected geoMask
      const [bbox0, bbox1] = toLonLat([bbox[0], bbox[1]])
      const [bbox2, bbox3] = toLonLat([bbox[2], bbox[3]])
      return L.latLngBounds(L.latLng(bbox1, bbox0), L.latLng(bbox3, bbox2))
    }
  },

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the warped maps to bring to front
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.world.bringMapsToFront(mapIds)
    this._update()
  },

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the warped maps to send to back
   */
  sendMapsToBack(mapIds: string[]) {
    this.world.sendMapsToBack(mapIds)
    this._update()
  },

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the warped maps to bring forward
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.world.bringMapsForward(mapIds)
    this._update()
  },

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the warped maps to send backward
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.world.sendMapsBackward(mapIds)
    this._update()
  },

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the warped map
   * @returns {number | undefined} - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.world.getMapZIndex(mapId)
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

  setImageInfoCache(cache: Cache) {
    this.world.setImageInfoCache(cache)
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
   * @param {string} mapId - ID of the warped map
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this._update()
    return this
  },

  /**
   * Resets the opacity of a single map to 1
   * @param {string} mapId - ID of the warped map
   */
  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this._update()
    return this
  },

  /**
   * Removes a background color from all maps in the layer
   * @param {Object} options - remove background options
   * @param {string} [options.hexColor] - hex color of the background color to remove
   * @param {number} [options.threshold] - threshold between 0 and 1
   * @param {number} [options.hardness] - hardness between 0 and 1
   */
  setRemoveBackground(
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setRemoveBackground({
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
    return this
  },

  /**
   * Resets the background color for all maps in the layer
   */
  resetRemoveBackground() {
    this.renderer.resetRemoveBackground()
    this._update()
    return this
  },

  /**
   * Removes a background color from a single map in the layer
   * @param {string} mapId - ID of the warped map
   * @param {Object} options - remove background options
   * @param {string} [options.hexColor] - hex color of the background color to remove
   * @param {number} [options.threshold] - threshold between 0 and 1
   * @param {number} [options.hardness] - hardness between 0 and 1
   */
  setMapRemoveBackground(
    mapId: string,
    options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  ) {
    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setMapRemoveBackground(mapId, {
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this._update()
    return this
  },

  /**
   * Resets the background color for a single map in the layer
   * @param {string} mapId - ID of the warped map
   */
  resetMapRemoveBackground(mapId: string) {
    this.renderer.resetMapRemoveBackground(mapId)
    return this
  },

  /**
   * Sets the colorization for all maps in the layer
   * @param {string} hexColor - desired hex color
   */
  setColorize(hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setColorize({ color })
      this._update()
    }
    return this
  },

  /**
   * Resets the colorization for all maps in the layer
   */
  resetColorize() {
    this.renderer.resetColorize()
    this._update()
    return this
  },

  /**
   * Sets the colorization for a single map in the layer
   * @param {string} mapId - ID of the warped map
   * @param {string} hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapColorize(mapId, { color })
      this._update()
    }
    return this
  },

  /**
   * Resets the colorization of a single map
   * @param {string} mapId - ID of the warped map
   */
  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorize(mapId)
    this._update()
    return this
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
    const results = this.world.addGeoreferenceAnnotation(annotation)
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
    const results = this.world.removeGeoreferenceAnnotation(annotation)
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

    this.tileCache = new TileCache()
    this.renderer = new WebGL2Renderer(this.gl, this.tileCache)

    this.rtree = new RTree()
    this.world = new World(this.rtree, this.options.imageInfoCache)

    this.viewport = new Viewport(this.world)

    this.tileCache.addEventListener(
      WarpedMapEventType.TILELOADED,
      this._update.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.ALLTILESLOADED,
      this._update.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this._rendererChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this._warpedMapAdded.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this._visibilityChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this._transformationChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.RESOURCEMASKUPDATED,
      this._resourceMaskUpdated.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.CLEARED,
      this._worldCleared.bind(this)
    )

    this.throttledUpdateViewportAndGetTilesNeeded = throttle(
      this.viewport.updateViewportAndGetTilesNeeded.bind(this.viewport),
      this.options.THROTTLE_WAIT_MS,
      this.options.THROTTLE_OPTIONS
    )

    this.throttledUpdateVertexBuffers = throttle(
      this.renderer.updateVertexBuffers.bind(this.renderer),
      this.options.THROTTLE_WAIT_MS,
      this.options.THROTTLE_OPTIONS
    )

    this.throttledSetTiles = throttle(
      this.tileCache.setTiles.bind(this.tileCache),
      this.options.THROTTLE_WAIT_MS,
      this.options.THROTTLE_OPTIONS
    )
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

    // TODO: remove event listeners
    //  - this.viewport
    //  - this.tileCache
    //  - this.world

    this.tileCache.clear()
  },

  _rendererChanged() {
    this._update()
  },

  _warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const warpedMap = this.world.getMap(mapId)

      if (warpedMap) {
        this.renderer.addWarpedMap(warpedMap)
      }

      if (this._map) {
        this._map.fire(WarpedMapEventType.WARPEDMAPADDED, { mapId })
      }
    }

    this._update()
  },

  _visibilityChanged() {
    this._update()
  },

  _transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const mapId of mapIds) {
        const warpedMap = this.world.getMap(mapId)

        if (warpedMap) {
          this.renderer.updateTriangulation(warpedMap, false)
        }
      }

      this.renderer.startTransformationTransition()
    }
  },

  _resourceMaskUpdated(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const warpedMap = this.world.getMap(mapId)

      if (warpedMap) {
        this.renderer.updateTriangulation(warpedMap)
      }
    }
  },

  _worldCleared() {
    this.renderer.clear()
    this.tileCache.clear()
  },

  _resize(entries: ResizeObserverEntry[]) {
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

  _makeProjectionTransform(frameState: FrameState): Transform {
    const size = frameState.size
    const rotation = frameState.rotation
    const resolution = frameState.resolution
    const center = frameState.center

    return composeTransform(
      0,
      0,
      2 / (resolution * size[0]),
      2 / (resolution * size[1]),
      -rotation,
      -center[0],
      -center[1]
    )
  },

  _computeFrameState(): FrameState {
    const size = [this._map.getSize().x, this._map.getSize().y] as [
      number,
      number
    ]
    const rotation = 0
    const boundsLatLng = this._map.getBounds()
    const northEast = this._map.options.crs.project(boundsLatLng.getNorthEast())
    const southWest = this._map.options.crs.project(boundsLatLng.getSouthWest())
    const extent = [southWest.x, southWest.y, northEast.x, northEast.y] as [
      number,
      number,
      number,
      number
    ]
    const xResolution = (extent[2] - extent[0]) / size[0]
    const yResolution = (extent[3] - extent[1]) / size[1]
    const resolution = Math.max(xResolution, yResolution)
    const center = [
      (extent[0] + extent[2]) / 2,
      (extent[1] + extent[3]) / 2
    ] as [number, number]
    const coordinateToPixelTransform = composeTransform(
      size[0] / 2,
      size[1] / 2,
      1 / resolution,
      -1 / resolution,
      -rotation,
      -center[0],
      -center[1]
    )

    return {
      size: size, // size in pixels: [width, height]
      rotation: rotation, // rotation in radians: number
      resolution: resolution, // projection units per pixel: number
      center: center, // center position in projected coordinates: [x, y]
      extent: extent, // extent in projected coordinates: [minx, miny, maxx, maxy]
      coordinateToPixelTransform: coordinateToPixelTransform // Transform discribing this transformation, see ol/renderer/Map.js line 58
    }
  },

  _prepareFrameInternal() {
    this.throttledUpdateVertexBuffers(this.viewport)
  },

  _renderInternal(frameState: FrameState, last = false): HTMLElement {
    const projectionTransform = this._makeProjectionTransform(frameState)
    this.viewport.setProjectionTransform(projectionTransform)

    this._prepareFrameInternal(frameState)

    if (frameState.extent) {
      const extent = frameState.extent as BBox

      this.renderer.setOpacity(this.getOpacity())

      const viewportSize = [
        frameState.size[0] * window.devicePixelRatio,
        frameState.size[1] * window.devicePixelRatio
      ] as Size

      let tilesNeeded: NeededTile[] | undefined
      if (last) {
        tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded(
          viewportSize,
          extent,
          frameState.coordinateToPixelTransform as Transform
        )
      } else {
        tilesNeeded = this.throttledUpdateViewportAndGetTilesNeeded(
          viewportSize,
          extent,
          frameState.coordinateToPixelTransform as Transform
        )
      }

      if (tilesNeeded && tilesNeeded.length) {
        this.throttledSetTiles(tilesNeeded)
      }

      // TODO: reset maps not in viewport, make sure these only
      // get drawn when they are visible AND when they have their buffers
      // updated.
      this.renderer.render(this.viewport)
    }

    return this.container
  },

  _render(frameState: FrameState): HTMLElement {
    if (this.throttledRenderTimeoutId) {
      clearTimeout(this.throttledRenderTimeoutId)
    }

    this.throttledRenderTimeoutId = setTimeout(() => {
      this._renderInternal(frameState, true)
    }, this.options.THROTTLE_WAIT_MS)

    return this._renderInternal(frameState)
  },

  _update() {
    if (!this._map) {
      return
    }

    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, topLeft)

    const frameState = this._computeFrameState()

    this._render(frameState)
  }
})
