import { Map, CustomLayerInterface } from 'maplibre-gl'
// import { MercatorCoordinate } from 'maplibre-gl'
import {
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2Renderer
} from '@allmaps/render'
import {
  bboxToSize,
  hexToFractionalRgb,
  lonLatToWebMecator,
  sizesToScale
} from '@allmaps/stdlib'
// import { OLWarpedMapEvent } from './OLWarpedMapEvent.js' // TODO

import { WarpedMap, WarpedMapList } from '@allmaps/render'

import type { TransformationType } from '@allmaps/transform'
import type { Bbox, Ring } from '@allmaps/types'

/**
 * WarpedMapLayer class.
 *
 * Together with a WarpedMapSource, this class renders georeferenced maps of a IIIF Georeference Annotation on an OpenLayers map.
 * WarpedMapLayer is a subclass of [Layer](https://openlayers.org/en/latest/apidoc/module-ol_layer_Layer-Layer.html).
 *
 * @class WarpedMapLayer
 */
export class WarpedMapLayer implements CustomLayerInterface {
  id = 'warped-map' as const // TODO: make this unique
  type = 'custom' as const
  renderingMode = '2d' as const

  map?: Map

  // todo
  gl?: WebGL2RenderingContext

  // TODO
  renderer!: WebGL2Renderer

  private imageInfoCache?: Cache

  /**
   * Creates a WarpedMapLayer instance
   * @param {Object} options
   * @param {WarpedMapSource} options.source - source that holds the maps
   */
  constructor(imageInfoCache?: Cache) {
    this.imageInfoCache = imageInfoCache
  }

  /**
   * Method called when the layer has been added to the Map.
   * @param {Map} map - The Map this custom layer was just added to.
   * @param {WebGL2RenderingContext} gl - The gl context for the map.
   */
  onAdd(map: Map, gl: WebGL2RenderingContext) {
    console.log('onAdd')
    this.map = map
    // TODO
    this.gl = gl

    const warpedMapList = new WarpedMapList(this.imageInfoCache)

    this.renderer = new WebGL2Renderer(gl, warpedMapList)

    this.addEventListeners()
  }

  /**
   * Method called when the layer has been removed from the Map.
   * @param {Map} _map - The Map this custom layer was just added to.
   * @param {WebGL2RenderingContext} _gl - The gl context for the map.
   */
  onRemove(_map: Map, _gl: WebGL2RenderingContext): void {
    this.removeEventListeners()
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results =
      this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.renderInternal()

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results =
      this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.renderInternal()

    return results
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
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
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
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
  }

  /**
   * Adds a Georeferenced map.
   * @param {unknown} georeferencedMap - Georeferenced map
   * @returns {Promise<(string | Error)>} - the map ID of the map that was added, or an error
   */
  async addGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.renderInternal()

    return result
  }

  /**
   * Removes a Georeferenced map.
   * @param {unknown} georeferencedMap - Georeferenced map
   * @returns {Promise<(string | Error)>} - the map ID of the map that was remvoed, or an error
   */
  async removeGeoreferencedMap(
    georeferencedMap: unknown
  ): Promise<string | Error> {
    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.renderInternal()

    return result
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   * @returns {WarpedMapList} the warped map list
   */
  getWarpedMapList(): WarpedMapList {
    return this.renderer.warpedMapList
  }

  /**
   * Returns a single map's warped map
   * @param {string} mapId - ID of the map
   * @returns {WarpedMap | undefined} the warped map
   */
  getWarpedMap(mapId: string): WarpedMap | undefined {
    return this.renderer.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the map
   */
  showMap(mapId: string) {
    this.renderer.warpedMapList.showMaps([mapId])
    this.renderInternal()
  }

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.showMaps(mapIds)
    this.renderInternal()
  }

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the map
   */
  hideMap(mapId: string) {
    this.renderer.warpedMapList.hideMaps([mapId])
    this.renderInternal()
  }

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.hideMaps(mapIds)
    this.renderInternal()
  }

  /**
   * Returns the visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the map
   * @param {Ring} resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring) {
    this.renderer.warpedMapList.setMapResourceMask(mapId, resourceMask)
    this.renderInternal()
  }

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
    this.renderInternal()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in lon lat coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalBbox(): Bbox | undefined {
    return this.renderer.warpedMapList.getTotalBbox()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalProjectedBbox(): Bbox | undefined {
    return this.renderer.warpedMapList.getTotalProjectedGeoMaskBbox()
  }

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this.renderInternal()
  }

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this.renderInternal()
  }

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this.renderInternal()
  }

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this.renderInternal()
  }

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the warped map
   * @returns {number | undefined} - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  // not getZIndex() here since default for OL Layer

  /**
   * Sets the image info Cache of the warpedMapList, informing it's warped maps about possibly cached imageInfo.
   * @param {Cache} cache - the image info cache
   */
  setImageInfoCache(cache: Cache) {
    this.renderer.warpedMapList.setImageInfoCache(cache)
  }

  /**
   * Clears the source, removes all maps
   */
  clear() {
    this.renderer.warpedMapList.clear()
    this.renderInternal()
  }

  // /**
  //  * Gets the HTML container element of the layer
  //  * @return {HTMLElement} HTML Div Element
  //  */
  // getContainer(): HTMLElement {
  //   return this.container
  // }

  // /**
  //  * Gets the HTML canvas element of the layer
  //  * @return {HTMLCanvasElement | null} HTML Canvas Element
  //  */
  // getCanvas(): HTMLCanvasElement | null {
  //   return this.canvas
  // }

  // No setOpacity() and getOpacity() here since default for OL Layer class

  /**
   * Sets the opacity of a single map
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this.renderInternal()
  }

  /**
   * Resets the opacity of a single map to fully opaque
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this.renderInternal()
  }

  /**
   * Sets the saturation of a single map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setSaturation(saturation: number) {
    this.renderer.setSaturation(saturation)
    this.renderInternal()
  }

  /**
   * Resets the saturation of a single map to the original colors
   */
  resetSaturation() {
    this.renderer.resetSaturation()
    this.renderInternal()
  }

  /**
   * Sets the saturation of a single map
   * @param {string} mapId - ID of the map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    this.renderer.setMapSaturation(mapId, saturation)
    this.renderInternal()
  }

  /**
   * Resets the saturation of a single map to the original colors
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    this.renderer.resetMapSaturation(mapId)
    this.renderInternal()
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
    this.renderInternal()
  }

  /**
   * Resets the color removal for all maps
   */
  resetRemoveColor() {
    this.renderer.resetRemoveColorOptions()
    this.renderInternal()
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
    this.renderInternal()
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
      this.renderInternal()
    }
  }

  /**
   * Resets the colorization for all maps
   */
  resetColorize() {
    this.renderer.resetColorizeOptions()
    this.renderInternal()
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
      this.renderInternal()
    }
  }

  /**
   * Resets the colorization of a single warped map
   * @param {string} mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorizeOptions(mapId)
    this.renderInternal()
  }

  /**
   * Disposes all WebGL resources and cached tiles
   */
  dispose() {
    this.renderer.dispose()
  }

  /**
   * Render the layer.
   */
  renderInternal(): void {
    this.render()
  }

  /**
   * Render the layer.
   */
  render(): void {
    console.log('render')

    if (!this.map) {
      return
    }

    // TODO
    // this.renderer.setOpacity(Math.min(Math.max(this.getOpacity(), 0), 1))

    const projectedGeoCenterAsLngLat = this.map.getCenter()
    const projectedGeoCenter = lonLatToWebMecator([
      projectedGeoCenterAsLngLat.lng,
      projectedGeoCenterAsLngLat.lat
    ])

    // Gettig the viewportSize should also be possible through getting the bounds
    // And using project() to go to pixel coordintas
    const canvas = this.map.getCanvas()
    const viewportSize = [
      canvas.width / window.devicePixelRatio,
      canvas.height / window.devicePixelRatio
    ] as [number, number]

    // TODO: check radian/degrees and sign
    const rotation = -(this.map.getBearing() / 180) * Math.PI

    // TODO: project using map projection instead of supposing Mercator
    // Possible first step could be to use Mapbox's Mercator compuation
    // (but this delivers results in Mercator coordinates that are rescaled to fit in a [0, 0] to [1, 1] rectangle):
    // const projectedNorthEastAsMercatorCoordinate =
    //   MercatorCoordinate.fromLngLat(projectedNorthEastAsLngLat)
    // const projectedSouthWestAsMercatorCoordinate =
    //   MercatorCoordinate.fromLngLat(projectedSouthWestAsLngLat)
    // const projectedNorthEastAsPoint = [
    //   projectedNorthEastAsMercatorCoordinate.x,
    //   projectedNorthEastAsMercatorCoordinate.y
    // ]
    // const projectedSouthWestAsPoint = [
    //   projectedSouthWestAsMercatorCoordinate.x,
    //   projectedSouthWestAsMercatorCoordinate.y
    // ]
    // TODO: improve scale computation when rotation is non-zero
    const geoBboxAsLngLatBounds = this.map.getBounds()
    const projectedNorthEastAsLngLat = geoBboxAsLngLatBounds.getNorthEast()
    const projectedSouthWestAsLngLat = geoBboxAsLngLatBounds.getSouthWest()

    const projectedNorthEastAsPoint = lonLatToWebMecator([
      projectedNorthEastAsLngLat.lng,
      projectedNorthEastAsLngLat.lat
    ])
    const projectedSouthWestAsPoint = lonLatToWebMecator([
      projectedSouthWestAsLngLat.lng,
      projectedSouthWestAsLngLat.lat
    ])
    const projectedGeoBbox = [
      projectedSouthWestAsPoint[0],
      projectedSouthWestAsPoint[1],
      projectedNorthEastAsPoint[0],
      projectedNorthEastAsPoint[1]
    ] as [number, number, number, number]
    const projectedGeoSize = bboxToSize(projectedGeoBbox)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoSize,
      viewportSize
    )

    const viewport = new Viewport(
      projectedGeoCenter,
      viewportSize,
      rotation,
      projectedGeoPerViewportScale,
      window.devicePixelRatio
    )

    // TODO
    // console.log(
    //   viewport,
    //   projectedGeoCenter,
    //   viewportSize,
    //   rotation,
    //   projectedGeoPerViewportScale,
    //   window.devicePixelRatio
    // )

    this.renderer.render(viewport)
  }

  private addEventListeners() {
    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.renderInternal.bind(this)
    )
    // TODO: renderInternal

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.renderInternal.bind(this)
    )
    // TODO: renderInternal

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
      this.renderInternal.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.renderInternal.bind(this)
    )
  }

  private removeEventListeners() {
    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.renderInternal.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.renderInternal.bind(this)
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
      this.renderInternal.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this.renderInternal.bind(this)
    )
  }

  private passWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      console.log('event', event)
      // TODO
      // const olEvent = new OLWarpedMapEvent(event.type, event.data)
      // this.dispatchEvent(olEvent)
    }
  }
}
