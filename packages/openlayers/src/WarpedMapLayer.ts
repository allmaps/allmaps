import Layer from 'ol/layer/Layer.js'

import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2'
import {
  Viewport,
  WarpedMapList,
  WarpedMapEvent,
  WarpedMapEventType
} from '@allmaps/render'
import { hexToFractionalRgb } from '@allmaps/stdlib'
import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import type { FrameState } from 'ol/Map.js'
import type { Extent } from 'ol/extent'

import type { DistortionMeasure, TransformationType } from '@allmaps/transform'
import type { WarpedMapLayerOptions } from '@allmaps/render'
import type { Ring, ImageInformations, Gcp } from '@allmaps/types'

export type OpenLayersWarpedMapLayerOptions = WarpedMapLayerOptions

/**
 * WarpedMapLayer class.
 *
 * This class renders georeferenced maps from a Georeference Annotation on an OpenLayers map.
 * WarpedMapLayer is a subclass of [Layer](https://openlayers.org/en/latest/apidoc/module-ol_layer_Layer-Layer.html).
 */
export class WarpedMapLayer extends Layer {
  container: HTMLElement

  canvas: HTMLCanvasElement
  gl: WebGL2RenderingContext

  canvasSize: [number, number] = [0, 0]

  renderer: WebGL2Renderer

  private resizeObserver: ResizeObserver

  /**
   * Creates a WarpedMapLayer instance
   * @param options - the WebGL2 renderer options
   */
  constructor(options?: Partial<OpenLayersWarpedMapLayerOptions>) {
    super({})

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
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param annotation - Georeference Annotation
   * @returns - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results =
      await this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.changed()

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
    const results =
      await this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.changed()

    return results
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param annotationUrl - Georeference Annotation
   * @returns - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotationByUrl(
    annotationUrl: string
  ): Promise<(string | Error)[]> {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )
    const results = this.addGeoreferenceAnnotation(annotation)

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param annotationUrl - Georeference Annotation
   * @returns - the map IDs of the maps that were removed, or an error per map
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
   * @returns - the map ID of the map that was added, or an error
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.changed()

    return result
  }

  /**
   * Removes a Georeferenced map.
   * @param georeferencedMap - Georeferenced map
   * @returns - the map ID of the map that was remvoed, or an error
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.changed()

    return result
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   * @returns the warped map list
   */
  getWarpedMapList(): WarpedMapList<WebGL2WarpedMap> {
    return this.renderer.warpedMapList
  }

  /**
   * Returns a single map's warped map
   * @param mapId - ID of the map
   * @returns the warped map
   */
  getWarpedMap(mapId: string): WebGL2WarpedMap | undefined {
    return this.renderer.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Make a single map visible
   * @param mapId - ID of the map
   */
  showMap(mapId: string) {
    this.renderer.warpedMapList.showMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps visible
   * @param mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.showMaps(mapIds)
    this.changed()
  }

  /**
   * Make a single map invisible
   * @param mapId - ID of the map
   */
  hideMap(mapId: string) {
    this.renderer.warpedMapList.hideMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps invisible
   * @param mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.hideMaps(mapIds)
    this.changed()
  }

  /**
   * Returns the visibility of a single map
   * @returns - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param mapId - ID of the map
   * @param resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring) {
    this.renderer.warpedMapList.setMapResourceMask(mapId, resourceMask)
    this.changed()
  }

  /**
   * Sets the GCOs of a single map
   * @param mapId - ID of the map
   * @param gcos - new GCPs
   */
  setMapGcps(mapId: string, gcps: Gcp[]) {
    this.renderer.warpedMapList.setMapGcps(mapId, gcps)
    this.changed()
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
    this.renderer.warpedMapList.setMapsTransformationType(
      mapIds,
      transformation
    )
    this.changed()
  }

  /**
   * Sets the transformation type of a single map
   * @param mapId - ID of the map
   * @param transformation - new transformation type
   */
  setMapTransformationType(mapId: string, transformation: TransformationType) {
    this.renderer.warpedMapList.setMapTransformationType(mapId, transformation)
    this.changed()
  }

  /**
   * Sets the distortion measure of multiple maps
   * @param mapIds - IDs of the maps
   * @param distortionMeasure - new distortion measure
   */
  setMapsDistortionMeasure(
    mapIds: Iterable<string>,
    distortionMeasure?: DistortionMeasure
  ) {
    this.renderer.warpedMapList.setMapsDistortionMeasure(
      mapIds,
      distortionMeasure
    )
    this.changed()
  }

  removeGeoreferencedMapById(mapId: string) {
    this.renderer.warpedMapList.removeGeoreferencedMapById(mapId)
    this.changed()
  }

  /**
   * Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.
   * @returns - Bounding box of all warped maps
   */
  getLonLatExtent(): Extent | undefined {
    return this.renderer.warpedMapList.getBbox()
  }

  /**
   * Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.
   * @returns - bounding box of all warped maps
   */
  getExtent(): Extent | undefined {
    return this.renderer.warpedMapList.getBbox({
      projection: 'EPSG:3857'
    })
  }

  /**
   * Bring maps to front
   * @param mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this.changed()
  }

  /**
   * Send maps to back
   * @param mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this.changed()
  }

  /**
   * Bring maps forward
   * @param mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this.changed()
  }

  /**
   * Send maps backward
   * @param mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this.changed()
  }

  /**
   * Returns the z-index of a single map
   * @param mapId - ID of the warped map
   * @returns - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  /**
   * Sets the object that caches image information
   * @param imageInformations - Object that caches image information
   */
  setImageInformations(imageInformations: ImageInformations) {
    this.renderer.warpedMapList.setImageInformations(imageInformations)
  }

  /**
   * Gets the HTML container element of the layer
   * @returns HTML element
   */
  getContainer(): HTMLElement {
    return this.container
  }

  /**
   * Gets the HTML canvas element of the layer
   * @returns HTML Canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas
  }

  // No setOpacity() and getOpacity() here since default for OL Layer class

  /**
   * Gets the opacity of a single map
   * @param mapId - ID of the map
   * @returns Opacity of the map
   */
  getMapOpacity(mapId: string): number | undefined {
    return this.renderer.getMapOpacity(mapId)
  }

  /**
   * Sets the opacity of a single map
   * @param mapId - ID of the map
   * @param opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this.changed()
  }

  /**
   * Resets the opacity of a single map to fully opaque
   * @param mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this.changed()
  }

  /**
   * Sets the saturation of a single map
   * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
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
   * @param mapId - ID of the map
   * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    this.renderer.setMapSaturation(mapId, saturation)
    this.changed()
  }

  /**
   * Resets the saturation of a single map to the original colors
   * @param mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    this.renderer.resetMapSaturation(mapId)
    this.changed()
  }

  /**
   * Removes a color from all maps
   * @param transformOptions - remove color options
   * @param transformOptions.hexColor - hex color to remove
   * @param transformOptions.threshold - threshold between 0 and 1
   * @param transformOptions.hardness - hardness between 0 and 1
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
   * @param mapId - ID of the map
   * @param transformOptions - remove color options
   * @param transformOptions.hexColor] - hex color to remove
   * @param transformOptions.threshold] - threshold between 0 and 1
   * @param transformOptions.hardness] - hardness between 0 and 1
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
   * @param mapId - ID of the map
   */
  resetMapRemoveColor(mapId: string) {
    this.renderer.resetMapRemoveColorOptions(mapId)
  }

  /**
   * Sets the colorization for all maps
   * @param hexColor - desired hex color
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
   * @param mapId - ID of the map
   * @param hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setMapColorizeOptions(mapId, { color })
      this.changed()
    }
  }

  /**
   * Resets the colorization of a single map
   * @param mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorizeOptions(mapId)
    this.changed()
  }

  /**
   * Sets the grid for all maps
   * @param enabled - whether to show the grid
   */
  setGrid(enabled: boolean) {
    this.renderer.setGridOptions({ enabled })
    this.changed()
  }

  /**
   * Resets the grid for all maps
   */
  resetGrid() {
    this.renderer.resetGridOptions()
    this.changed()
  }

  /**
   * Sets the grid for a single mapID of the map
   * @param mapId - ID of the map
   * @param enabled - whether to show the grid
   */
  setMapGrid(mapId: string, enabled: boolean) {
    this.renderer.setMapGridOptions(mapId, { enabled })
    this.changed()
  }

  /**
   * Resets the grid of a single map
   * @param mapId - ID of the map
   */
  resetMapGrid(mapId: string) {
    this.renderer.resetMapGridOptions(mapId)
    this.changed()
  }

  /**
   * Disposes all WebGL resources and cached tiles
   */
  dispose() {
    this.renderer.destroy()

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
   * Clears: removes all maps
   */
  clear() {
    this.renderer.warpedMapList.clear()
    this.changed()
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

    this.renderer.setOpacity(Math.min(Math.max(this.getOpacity(), 0), 1))

    const viewport = new Viewport(
      frameState.size as [number, number],
      frameState.viewState.center as [number, number],
      frameState.viewState.resolution,
      {
        rotation: frameState.viewState.rotation,
        devicePixelRatio: window.devicePixelRatio
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

  private contextLost(event: Event) {
    event.preventDefault()
    this.renderer.contextLost()
  }

  private contextRestored(event: Event) {
    event.preventDefault()
    this.renderer.contextRestored()
  }

  private addEventListeners() {
    this.canvas.addEventListener(
      'webglcontextlost',
      this.contextLost.bind(this)
    )

    this.canvas.addEventListener(
      'webglcontextrestored',
      this.contextRestored.bind(this)
    )

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
    this.canvas.removeEventListener(
      'webglcontextlost',
      this.contextLost.bind(this)
    )

    this.canvas.removeEventListener(
      'webglcontextrestored',
      this.contextRestored.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.changed.bind(this)
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
