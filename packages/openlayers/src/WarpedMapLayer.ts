import Layer from 'ol/layer/Layer.js'
import {
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2Renderer
} from '@allmaps/render'
import { hexToFractionalRgb } from '@allmaps/stdlib'
import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import type { FrameState } from 'ol/Map.js'
import type { WarpedMapSource } from './WarpedMapSource.js'

/**
 * WarpedMapLayer class.
 *
 * Together with a WarpedMapSource, this class renders georeferenced maps of a IIIF Georeference Annotation on an OpenLayers map.
 * WarpedMapLayer is a subclass of [Layer](https://openlayers.org/en/latest/apidoc/module-ol_layer_Layer-Layer.html).
 *
 * @class WarpedMapLayer
 */
export class WarpedMapLayer extends Layer {
  source: WarpedMapSource | null = null

  container: HTMLElement

  canvas: HTMLCanvasElement | null = null
  gl: WebGL2RenderingContext

  canvasSize: [number, number] = [0, 0]

  renderer: WebGL2Renderer

  private resizeObserver: ResizeObserver

  /**
   * Creates a WarpedMapLayer instance
   * @param {Object} options
   * @param {WarpedMapSource} options.source - source that holds the maps
   */
  constructor(options: { source: WarpedMapSource }) {
    super(options)

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

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true })

    if (!gl) {
      throw new Error('WebGL 2 not available')
    }

    this.resizeObserver = new ResizeObserver(this.resized.bind(this))
    this.resizeObserver.observe(canvas, { box: 'content-box' })

    this.canvas = canvas
    this.gl = gl

    this.source = this.getSource() as WarpedMapSource
    // TODO: listen to change:source

    const warpedMapList = this.source.getWarpedMapList()

    this.renderer = new WebGL2Renderer(this.gl, warpedMapList)

    this.addEventListeners()
  }

  /**
   * Gets the HTML container element of the layer
   * @return {HTMLElement} HTML Div Element
   */
  getContainer(): HTMLElement {
    return this.container
  }

  /**
   * Gets the HTML canvas element of the layer
   * @return {HTMLCanvasElement | null} HTML Canvas Element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas
  }

  // No setOpacity() and getOpacity() here since default for OL Layer class

  /**
   * Sets the opacity of a single map
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this.changed()
  }

  /**
   * Resets the opacity of a single map to fully opaque
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this.changed()
  }

  /**
   * Sets the saturation of a single map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setSaturation(saturation: number) {
    this.renderer.setSaturation(saturation)
    this.changed()
  }

  /**
   * Resets the saturation of a single map to the original colors
   */
  resetSaturation() {
    this.renderer.resetSaturation()
    this.changed()
  }

  /**
   * Sets the saturation of a single map
   * @param {string} mapId - ID of the map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    this.renderer.setMapSaturation(mapId, saturation)
    this.changed()
  }

  /**
   * Resets the saturation of a single map to the original colors
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    this.renderer.resetMapSaturation(mapId)
    this.changed()
  }

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
    this.changed()
  }

  /**
   * Resets the color removal for all maps
   */
  resetRemoveColor() {
    this.renderer.resetRemoveColorOptions()
    this.changed()
  }

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
    this.changed()
  }

  /**
   * Resets the color for a single map
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColor(mapId: string) {
    this.renderer.resetMapRemoveColorOptions(mapId)
  }

  /**
   * Sets the colorization for all maps
   * @param {string} hexColor - desired hex color
   */
  setColorize(hexColor: string) {
    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setColorizeOptions({ color })
      this.changed()
    }
  }

  /**
   * Resets the colorization for all maps
   */
  resetColorize() {
    this.renderer.resetColorizeOptions()
    this.changed()
  }

  /**
   * Sets the colorization for a single mapID of the map
   * @param {string} mapId - ID of the map
   * @param {string} hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setMapColorizeOptions(mapId, { color })
      this.changed()
    }
  }

  /**
   * Resets the colorization of a single warped map
   * @param {string} mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorizeOptions(mapId)
    this.changed()
  }

  /**
   * Disposes all WebGL resources and cached tiles
   */
  dispose() {
    this.renderer.dispose()

    const extension = this.gl.getExtension('WEBGL_lose_context')
    if (extension) {
      extension.loseContext()
    }
    const canvas = this.gl.canvas
    canvas.width = 1
    canvas.height = 1

    this.resizeObserver.disconnect()

    this.removeEventListeners()

    super.disposeInternal()
  }

  /**
   * Render the layer.
   * @param {import("ol/Map.js").FrameState} frameState - OpenLayers frame state
   * @return {HTMLElement} The rendered element
   */
  render(frameState: FrameState): HTMLElement {
    if (this.canvas) {
      this.resizeCanvas(this.canvas, this.canvasSize)
    }

    this.renderer.setOpacity(Math.min(Math.max(this.getOpacity(), 0), 1))

    const viewport = new Viewport(
      frameState.viewState.center as [number, number],
      frameState.size as [number, number],
      frameState.viewState.rotation,
      frameState.viewState.resolution,
      window.devicePixelRatio
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

      this.canvasSize = [displayWidth, displayHeight]
    }
    this.changed()
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

  private addEventListeners() {
    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.changed.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.changed.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.addEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.changed.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.changed.bind(this)
    )
  }

  private removeEventListeners() {
    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.changed.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.FIRSTMAPTILELOADED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.tileCache.removeEventListener(
      WarpedMapEventType.ALLREQUESTEDTILESLOADED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.GEOREFERENCEANNOTATIONADDED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPREMOVED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.changed.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this.changed.bind(this)
    )
  }

  private passWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const olEvent = new OLWarpedMapEvent(event.type, event.data)
      this.dispatchEvent(olEvent)
    }
  }
}
