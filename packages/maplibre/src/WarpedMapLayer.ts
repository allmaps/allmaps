import { Map, CustomLayerInterface } from 'maplibre-gl'
import {
  Viewport,
  WebGL2Renderer,
  WarpedMap,
  WarpedMapList,
  WarpedMapEvent,
  WarpedMapEventType
} from '@allmaps/render'
import {
  distance,
  hexToFractionalRgb,
  lonLatToWebMecator,
  sizesToScale
} from '@allmaps/stdlib'

import type { TransformationType } from '@allmaps/transform'
import type { Bbox, Ring } from '@allmaps/types'

const ERROR_MSG_RENDER =
  'Renderer not defined. Add the layer to the map before running this function.'

/**
 * WarpedMapLayer class.
 *
 * This class renders georeferenced maps of a IIIF Georeference Annotation on a MapLibre map.
 * WarpedMapLayer is implemented using MapLibre's [CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.CustomLayerInterface/).
 *
 * @class WarpedMapLayer
 */
export class WarpedMapLayer implements CustomLayerInterface {
  id = 'warped-map-layer'
  type = 'custom' as const
  renderingMode = '2d' as const

  map?: Map

  renderer?: WebGL2Renderer

  private imageInfoCache?: Cache

  /**
   * Creates a WarpedMapLayer instance
   *
   * @constructor
   * @param {string} [id] - unique id for this layer
   * @param {Cache} imageInfoCache - image info cache
   */
  constructor(id?: string, imageInfoCache?: Cache) {
    if (id) {
      this.id = id
    }
    this.imageInfoCache = imageInfoCache
  }

  /**
   * Method called when the layer has been added to the Map.
   * @param {Map} map - The Map this custom layer was just added to.
   * @param {WebGL2RenderingContext} gl - The gl context for the map.
   */
  onAdd(map: Map, gl: WebGL2RenderingContext) {
    this.map = map

    const warpedMapList = new WarpedMapList(this.imageInfoCache)

    this.renderer = new WebGL2Renderer(gl, warpedMapList)

    this.addEventListeners()
  }

  /**
   * Method called when the layer has been removed from the Map.
   */
  onRemove(): void {
    if (!this.renderer) {
      return
    }
    this.renderer.dispose()

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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const results = await this.renderer.warpedMapList.addGeoreferenceAnnotation(
      annotation
    )
    this.map?.triggerRepaint()

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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const results =
      await this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.map?.triggerRepaint()

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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.map?.triggerRepaint()

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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.map?.triggerRepaint()

    return result
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   * @returns {WarpedMapList} the warped map list
   */
  getWarpedMapList(): WarpedMapList {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.warpedMapList
  }

  /**
   * Returns a single map's warped map
   * @param {string} mapId - ID of the map
   * @returns {WarpedMap | undefined} the warped map
   */
  getWarpedMap(mapId: string): WarpedMap | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the map
   */
  showMap(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.showMaps([mapId])
    this.map?.triggerRepaint()
  }

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.showMaps(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the map
   */
  hideMap(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.hideMaps([mapId])
    this.map?.triggerRepaint()
  }

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.hideMaps(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Returns the visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the map
   * @param {Ring} resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.setMapResourceMask(mapId, resourceMask)
    this.map?.triggerRepaint()
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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.setMapsTransformationType(
      mapIds,
      transformation
    )
    this.map?.triggerRepaint()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in lon lat coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalBbox(): Bbox | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.warpedMapList.getTotalBbox()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalProjectedBbox(): Bbox | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.warpedMapList.getTotalProjectedGeoMaskBbox()
  }

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.bringMapsToFront(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this.map?.triggerRepaint()
  }

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the warped map
   * @returns {number | undefined} - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  // not getZIndex() here since so such concept in MapLibre

  /**
   * Sets the image info Cache of the warpedMapList, informing it's warped maps about possibly cached imageInfo.
   * @param {Cache} cache - the image info cache
   */
  setImageInfoCache(cache: Cache) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.warpedMapList.setImageInfoCache(cache)
  }

  // No setOpacity() and getOpacity() here since default for OL Layer class

  /**
   * Gets the opacity of the layer
   * @return {number | undefined} opacity of the map
   */
  getOpacity(): number | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.getOpacity()
  }

  /**
   * Sets the opacity of the layer
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setOpacity(opacity: number) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.setOpacity(opacity)
    this.map?.triggerRepaint()
  }

  /**
   * Resets the opacity of the layer to fully opaque
   */
  resetOpacity() {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetOpacity()
    this.map?.triggerRepaint()
  }

  /**
   * Gets the opacity of a single map
   * @param {string} mapId - ID of the map
   * @return {number | undefined} opacity of the map
   */
  getMapOpacity(mapId: string): number | undefined {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    return this.renderer.getMapOpacity(mapId)
  }

  /**
   * Sets the opacity of a single map
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
   */
  setMapOpacity(mapId: string, opacity: number) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.setMapOpacity(mapId, opacity)
    this.map?.triggerRepaint()
  }

  /**
   * Resets the opacity of a single map to fully opaque
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetMapOpacity(mapId)
    this.map?.triggerRepaint()
  }

  /**
   * Sets the saturation of a single map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setSaturation(saturation: number) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.setSaturation(saturation)
    this.map?.triggerRepaint()
  }

  /**
   * Resets the saturation of a single map to the original colors
   */
  resetSaturation() {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetSaturation()
    this.map?.triggerRepaint()
  }

  /**
   * Sets the saturation of a single map
   * @param {string} mapId - ID of the map
   * @param {number} saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
   */
  setMapSaturation(mapId: string, saturation: number) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.setMapSaturation(mapId, saturation)
    this.map?.triggerRepaint()
  }

  /**
   * Resets the saturation of a single map to the original colors
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetMapSaturation(mapId)
    this.map?.triggerRepaint()
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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setRemoveColorOptions({
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this.map?.triggerRepaint()
  }

  /**
   * Resets the color removal for all maps
   */
  resetRemoveColor() {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetRemoveColorOptions()
    this.map?.triggerRepaint()
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
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const color = options.hexColor
      ? hexToFractionalRgb(options.hexColor)
      : undefined

    this.renderer.setMapRemoveColorOptions(mapId, {
      color,
      threshold: options.threshold,
      hardness: options.hardness
    })
    this.map?.triggerRepaint()
  }

  /**
   * Resets the color for a single map
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColor(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetMapRemoveColorOptions(mapId)
  }

  /**
   * Sets the colorization for all maps
   * @param {string} hexColor - desired hex color
   */
  setColorize(hexColor: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setColorizeOptions({ color })
      this.map?.triggerRepaint()
    }
  }

  /**
   * Resets the colorization for all maps
   */
  resetColorize() {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetColorizeOptions()
    this.map?.triggerRepaint()
  }

  /**
   * Sets the colorization for a single mapID of the map
   * @param {string} mapId - ID of the map
   * @param {string} hexColor - desired hex color
   */
  setMapColorize(mapId: string, hexColor: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    const color = hexToFractionalRgb(hexColor)
    if (color) {
      this.renderer.setMapColorizeOptions(mapId, { color })
      this.map?.triggerRepaint()
    }
  }

  /**
   * Resets the colorization of a single map
   * @param {string} mapId - ID of the map
   */
  resetMapColorize(mapId: string) {
    if (!this.renderer) {
      throw new Error(ERROR_MSG_RENDER)
    }
    this.renderer.resetMapColorizeOptions(mapId)
    this.map?.triggerRepaint()
  }

  /**
   * Prepare rendering the layer.
   */
  preparerender(): void {
    // Empty function to make TS happy
  }

  /**
   * Render the layer.
   */
  render(): void {
    if (!this.map) {
      return
    }
    if (!this.renderer) {
      return
    }

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

    const rotation = -(this.map.getBearing() / 180) * Math.PI

    const geoLowerLeftAsLngLat = this.map.unproject([0, viewportSize[1]])
    const geoLowerRightAsLngLat = this.map.unproject([
      viewportSize[0],
      viewportSize[1]
    ])
    const geoUpperRightAsLngLat = this.map.unproject([viewportSize[0], 0])
    const geoUpperLeftAsLngLat = this.map.unproject([0, 0])
    // TODO: project using map projection instead of supposing Mercator
    // Possible first step could be to use MapLibre's Mercator compuation. Example:
    // const projectedGeoLowerLeftAsMercatorCoordinate = MercatorCoordinate.fromLngLat(geoLowerLeftAsLngLat)
    // const projectedGeoLowerLeftAsPoint = [projectedGeoLowerLeftAsMercatorCoordinate.x, projectedGeoLowerLeftAsMercatorCoordinate.y]
    // But this delivers results in Mercator coordinates that are rescaled to fit in a [0, 0] to [1, 1] rectangle.
    const projectedGeoLowerLeftAsPoint = lonLatToWebMecator([
      geoLowerLeftAsLngLat.lng,
      geoLowerLeftAsLngLat.lat
    ])
    const projectedGeoLowerRightAsPoint = lonLatToWebMecator([
      geoLowerRightAsLngLat.lng,
      geoLowerRightAsLngLat.lat
    ])
    const projectedGeoUpperRightAsPoint = lonLatToWebMecator([
      geoUpperRightAsLngLat.lng,
      geoUpperRightAsLngLat.lat
    ])
    const projectedGeoUpperLeftAsPoint = lonLatToWebMecator([
      geoUpperLeftAsLngLat.lng,
      geoUpperLeftAsLngLat.lat
    ])
    const upperXSize = distance(
      projectedGeoUpperLeftAsPoint,
      projectedGeoUpperRightAsPoint
    )
    const lowerXSize = distance(
      projectedGeoLowerLeftAsPoint,
      projectedGeoLowerRightAsPoint
    )
    const rightYSize = distance(
      projectedGeoLowerRightAsPoint,
      projectedGeoUpperRightAsPoint
    )
    const leftYsize = distance(
      projectedGeoLowerLeftAsPoint,
      projectedGeoUpperLeftAsPoint
    )
    const projectedGeoSize = [
      (upperXSize + lowerXSize) / 2,
      (rightYSize + leftYsize) / 2
    ] as [number, number]
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

    this.renderer.render(viewport)
  }

  private addEventListeners() {
    if (!this.renderer) {
      return
    }

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.render.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.render.bind(this)
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
      this.render.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.render.bind(this)
    )
  }

  private removeEventListeners() {
    if (!this.renderer) {
      return
    }

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.render.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.render.bind(this)
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
      this.render.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this.render.bind(this)
    )
  }

  private passWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (this.map) {
        this.map.fire(event.type, event.data)
      }
    }
  }
}
