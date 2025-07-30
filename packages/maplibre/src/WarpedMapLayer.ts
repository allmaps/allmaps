import { Map as MaplibreMap, CustomLayerInterface } from 'maplibre-gl'

import { WebGL2Renderer, WebGL2WarpedMap } from '@allmaps/render/webgl2'
import {
  Viewport,
  WarpedMapList,
  WarpedMapEvent,
  WarpedMapEventType
} from '@allmaps/render'
import { mergeOptions, rectangleToSize, sizesToScale } from '@allmaps/stdlib'
import { lonLatToWebMercator, Projection } from '@allmaps/project'

import type { LngLatBoundsLike } from 'maplibre-gl'

import type { TransformationType, DistortionMeasure } from '@allmaps/transform'
import type { MapLibreWarpedMapLayerOptions } from '@allmaps/render'
import type { Rectangle, Ring, Point } from '@allmaps/types'

import type {
  GetOptionsOptions,
  SpecificMapLibreWarpedMapLayerOptions,
  WebGL2WarpedMapOptions
} from 'packages/render/src/shared/types'

const DEFFAULT_MAPLIBRE_WARPED_MAP_LAYER_OPTIONS: SpecificMapLibreWarpedMapLayerOptions =
  {
    layerId: 'warped-map-layer',
    layerType: 'custom',
    layerRenderingMode: '2d'
  }

const NO_RENDERER_ERROR_MESSAGE =
  'Renderer not defined. Add the layer to a map before calling this function.'

function assertRenderer(
  renderer?: WebGL2Renderer
): asserts renderer is WebGL2Renderer {
  if (!renderer) {
    throw new Error(NO_RENDERER_ERROR_MESSAGE)
  }
}

/**
 * WarpedMapLayer class.
 *
 * This class renders maps from a IIIF Georeference Annotation on a MapLibre map.
 * WarpedMapLayer is implemented using MapLibre's [CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.CustomLayerInterface/).
 */
export class WarpedMapLayer implements CustomLayerInterface {
  id: string
  type: 'custom'
  renderingMode: '2d'

  map?: MaplibreMap
  renderer?: WebGL2Renderer
  options: MapLibreWarpedMapLayerOptions

  /**
   * Creates a WarpedMapLayer instance
   *
   * @param id - Unique ID for this layer
   * @param options - options
   */
  constructor(options?: Partial<MapLibreWarpedMapLayerOptions>) {
    this.options = mergeOptions(
      DEFFAULT_MAPLIBRE_WARPED_MAP_LAYER_OPTIONS,
      options
    )

    this.id = this.options.layerId
    this.type = this.options.layerType
    this.renderingMode = this.options.layerRenderingMode
  }

  /**
   * Method called when the layer has been added to the Map.
   * @param map - The Map this custom layer was just added to.
   * @param gl - The WebGL 2 context for the map.
   */
  onAdd(map: MaplibreMap, gl: WebGL2RenderingContext) {
    this.map = map

    this.renderer = new WebGL2Renderer(gl, this.options)
    this.addEventListeners()
  }

  /**
   * Method called when the layer has been removed from the Map.
   */
  onRemove(): void {
    if (!this.renderer) {
      return
    }

    this.removeEventListeners()
    this.renderer.destroy()
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param annotation - Georeference Annotation
   * @returns the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.triggerRepaint()

    return results
  }

  /**
   * Removes a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param annotation - Georeference Annotation
   * @returns the map IDs of the maps that were removed, or an error per map
   */
  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    assertRenderer(this.renderer)

    const results =
      await this.renderer.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.triggerRepaint()

    return results
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/) by URL.
   * @param annotationUrl - Georeference Annotation
   * @returns the map IDs of the maps that were added, or an error per map
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
    assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.triggerRepaint()

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
    assertRenderer(this.renderer)

    const result =
      this.renderer.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.triggerRepaint()

    return result
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   * @returns the warped map list
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

  // /**
  //  * Make a single map visible
  //  * @param mapId - ID of the map
  //  */
  // showMap(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.warpedMapList.showMaps([mapId])
  //   this.triggerRepaint()
  // }

  // /**
  //  * Make multiple maps visible
  //  * @param mapIds - IDs of the maps
  //  */
  // showMaps(mapIds: Iterable<string>) {
  //   assertRenderer(this.renderer)

  //   this.renderer.warpedMapList.showMaps(mapIds)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Make a single map invisible
  //  * @param mapId - ID of the map
  //  */
  // hideMap(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.warpedMapList.hideMaps([mapId])
  //   this.triggerRepaint()
  // }

  // /**
  //  * Make multiple maps invisible
  //  * @param mapIds - IDs of the maps
  //  */
  // hideMaps(mapIds: Iterable<string>) {
  //   assertRenderer(this.renderer)

  //   this.renderer.warpedMapList.hideMaps(mapIds)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Returns the visibility of a single map
  //  * @returns - whether the map is visible
  //  */
  // isMapVisible(mapId: string): boolean | undefined {
  //   assertRenderer(this.renderer)

  //   const warpedMap = this.renderer.warpedMapList.getWarpedMap(mapId)
  //   return warpedMap?.visible
  // }

  /**
   * Sets the resource mask of a single map
   * @param mapId - ID of the map
   * @param resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setMapResourceMask(resourceMask, mapId)
    this.triggerRepaint()
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
    this.triggerRepaint()
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
    this.triggerRepaint()
  }

  /**
   * Sets the internal projection of multiple maps
   * @param mapIds - IDs of the maps
   * @param internalProjection - new internal projection
   */
  setMapsInternalProjection(
    mapIds: Iterable<string>,
    internalProjection: Projection
  ) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.setMapsInternalProjection(internalProjection, {
      mapIds
    })
    this.triggerRepaint()
  }

  /**
   * Return the bounding box of all visible maps in the layer (inside or outside of the Viewport), in longitude/latitude coordinates.
   * @returns - bounding box of all warped maps
   */
  getBounds(): LngLatBoundsLike | undefined {
    assertRenderer(this.renderer)

    const bbox = this.renderer.warpedMapList.getMapsBbox({
      projection: { definition: 'EPSG:4326' }
    })
    if (bbox) {
      return [
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
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
    this.triggerRepaint()
  }

  /**
   * Send maps to back
   * @param mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsToBack(mapIds)
    this.triggerRepaint()
  }

  /**
   * Bring maps forward
   * @param mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.bringMapsForward(mapIds)
    this.triggerRepaint()
  }

  /**
   * Send maps backward
   * @param mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    assertRenderer(this.renderer)

    this.renderer.warpedMapList.sendMapsBackward(mapIds)
    this.triggerRepaint()
  }

  /**
   * Returns the z-index of a single map
   * @param mapId - ID of the warped map
   * @returns - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    assertRenderer(this.renderer)

    return this.renderer.warpedMapList.getMapZIndex(mapId)
  }

  // not getZIndex() here since so such concept in MapLibre

  /**
   * Get the default layer and map options
   */
  getDefaultLayerOptions(
    getOptionsOptions?: GetOptionsOptions
  ): Partial<MapLibreWarpedMapLayerOptions> & WebGL2WarpedMapOptions {
    assertRenderer(this.renderer)

    return this.renderer.getDefaultOptions(getOptionsOptions)
  }

  /**
   * Get the default map options
   *
   * @param mapId - Map ID for which the options apply
   */
  getDefaultMapOptions(): WebGL2WarpedMapOptions
  getDefaultMapOptions(mapId: string): WebGL2WarpedMapOptions | undefined
  getDefaultMapOptions(mapId?: string): WebGL2WarpedMapOptions | undefined {
    assertRenderer(this.renderer)

    if (mapId) {
      return this.renderer.getDefaultMapOptions(mapId)
    } else {
      return this.renderer.getDefaultMapOptions()
    }
  }

  /**
   * Get the layer options
   */
  getLayerOptions(): Partial<MapLibreWarpedMapLayerOptions> {
    assertRenderer(this.renderer)

    return this.renderer.getOptions()
  }

  /**
   * Get the map options of a specific map ID
   *
   * @param mapId - Map ID for which the options apply
   */
  getMapOptions(mapId: string): WebGL2WarpedMapOptions | undefined {
    assertRenderer(this.renderer)

    return this.renderer.getMapOptions(mapId)
  }

  /**
   * Sets the layer options
   *
   * @param options - Options
   */
  setLayerOptions(
    options: Partial<MapLibreWarpedMapLayerOptions>,
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.setOptions(options, renderAndListOptions)
  }

  /**
   * Sets the map options of specific map IDs
   *
   * @param mapIds - Map IDs for which the options apply
   * @param options - Options
   */
  setMapsOptions(
    mapIds: string[],
    options: Partial<MapLibreWarpedMapLayerOptions>,
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.setMapsOptions(mapIds, options, renderAndListOptions)
  }

  /**
   * Sets the map options of specific maps by map ID
   *
   * @param optionsByMapId - Options by map ID
   */
  setMapsOptionsByMapId(
    optionsByMapId: Map<string, Partial<MapLibreWarpedMapLayerOptions>>,
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.setMapsOptionsByMapId(optionsByMapId, renderAndListOptions)
  }

  /**
   * Resets the layer options
   *
   * @param optionKeys - Keys of the options to reset
   */
  resetLayerOptions(
    optionKeys?: string[],
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.resetLayerOptions(optionKeys, renderAndListOptions)
  }

  /**
   * Resets the map options of specific map IDs
   *
   * @param mapIds - Map IDs for which the options apply
   * @param optionKeys - Keys of the options to reset
   */
  resetMapsOptions(
    mapIds: string[],
    optionKeys?: string[],
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.resetMapsOptions(mapIds, optionKeys, renderAndListOptions)
  }

  /**
   * Resets the map options of specific maps by map ID
   *
   * @param optionkeysByMapId - Keys of options by map ID
   */
  resetMapsOptionsByMapId(
    optionkeysByMapId: Map<string, string[]>,
    renderAndListOptions?: Partial<MapLibreWarpedMapLayerOptions>
  ) {
    assertRenderer(this.renderer)

    this.renderer.resetMapsOptionsByMapId(
      optionkeysByMapId,
      renderAndListOptions
    )
  }

  // /**
  //  * Sets the object that caches image information
  //  * @param imageInformations - Object that caches image information
  //  */
  // setImageInformations(imageInformations: ImageInfoByMapId) {
  //   assertRenderer(this.renderer)

  //   this.renderer.warpedMapList.setImageInformations(imageInformations)
  // }

  // // No setOpacity() and getOpacity() here since these are
  // // already present on the OpenLayers Layer class

  // /**
  //  * Gets the opacity of the layer
  //  * @returns opacity of the map
  //  */
  // getOpacity(): number | undefined {
  //   assertRenderer(this.renderer)

  //   return this.renderer.getOpacity()
  // }

  // /**
  //  * Sets the opacity of the layer
  //  * @param opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
  //  */
  // setOpacity(opacity: number) {
  //   assertRenderer(this.renderer)

  //   this.renderer.setOpacity(opacity)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the opacity of the layer to fully opaque
  //  */
  // resetOpacity() {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetOpacity()
  //   this.triggerRepaint()
  // }

  // /**
  //  * Gets the opacity of a single map
  //  * @param mapId - ID of the map
  //  * @returns opacity of the map
  //  */
  // getMapOpacity(mapId: string): number | undefined {
  //   assertRenderer(this.renderer)

  //   return this.renderer.getMapOpacity(mapId)
  // }

  // /**
  //  * Sets the opacity of a single map
  //  * @param mapId - ID of the map
  //  * @param opacity - opacity between 0 and 1, where 0 is fully transparent and 1 is fully opaque
  //  */
  // setMapOpacity(mapId: string, opacity: number) {
  //   assertRenderer(this.renderer)

  //   this.renderer.setMapOpacity(mapId, opacity)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the opacity of a single map to fully opaque
  //  * @param mapId - ID of the map
  //  */
  // resetMapOpacity(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetMapOpacity(mapId)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Sets the saturation of a single map
  //  * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
  //  */
  // setSaturation(saturation: number) {
  //   assertRenderer(this.renderer)

  //   this.renderer.setSaturation(saturation)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the saturation of a single map to the original colors
  //  */
  // resetSaturation() {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetSaturation()
  //   this.triggerRepaint()
  // }

  // /**
  //  * Sets the saturation of a single map
  //  * @param mapId - ID of the map
  //  * @param saturation - saturation between 0 and 1, where 0 is grayscale and 1 are the original colors
  //  */
  // setMapSaturation(mapId: string, saturation: number) {
  //   assertRenderer(this.renderer)

  //   this.renderer.setMapSaturation(mapId, saturation)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the saturation of a single map to the original colors
  //  * @param mapId - ID of the map
  //  */
  // resetMapSaturation(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetMapSaturation(mapId)
  //   this.triggerRepaint()
  // }

  // /**
  //  * Removes a color from all maps
  //  * @param options - remove color options
  //  * @param options.hexColor - hex color to remove
  //  * @param options.threshold - threshold between 0 and 1
  //  * @param options.hardness - hardness between 0 and 1
  //  */
  // setRemoveColor(
  //   options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  // ) {
  //   assertRenderer(this.renderer)

  //   const color = options.hexColor
  //     ? hexToFractionalRgb(options.hexColor)
  //     : undefined

  //   this.renderer.setRemoveColorOptions({
  //     color,
  //     threshold: options.threshold,
  //     hardness: options.hardness
  //   })
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the color removal for all maps
  //  */
  // resetRemoveColor() {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetRemoveColorOptions()
  //   this.triggerRepaint()
  // }

  // /**
  //  * Removes a color from a single map
  //  * @param mapId - ID of the map
  //  * @param options - remove color options
  //  * @param options.hexColor - hex color to remove
  //  * @param options.threshold - threshold between 0 and 1
  //  * @param options.hardness - hardness between 0 and 1
  //  */
  // setMapRemoveColor(
  //   mapId: string,
  //   options: Partial<{ hexColor: string; threshold: number; hardness: number }>
  // ) {
  //   assertRenderer(this.renderer)

  //   const color = options.hexColor
  //     ? hexToFractionalRgb(options.hexColor)
  //     : undefined

  //   this.renderer.setMapRemoveColorOptions(mapId, {
  //     color,
  //     threshold: options.threshold,
  //     hardness: options.hardness
  //   })
  //   this.triggerRepaint()
  // }

  // /**
  //  * Resets the color for a single map
  //  * @param mapId - ID of the map
  //  */
  // resetMapRemoveColor(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetMapRemoveColorOptions(mapId)
  // }

  // /**
  //  * Sets the colorization for all maps
  //  * @param hexColor - desired hex color
  //  */
  // setColorize(hexColor: string) {
  //   assertRenderer(this.renderer)

  //   const color = hexToFractionalRgb(hexColor)
  //   if (color) {
  //     this.renderer.setColorizeOptions({ color })
  //     this.triggerRepaint()
  //   }
  // }

  // /**
  //  * Resets the colorization for all maps
  //  */
  // resetColorize() {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetColorizeOptions()
  //   this.triggerRepaint()
  // }

  // /**
  //  * Sets the colorization for a single mapID of the map
  //  * @param mapId - ID of the map
  //  * @param hexColor - desired hex color
  //  */
  // setMapColorize(mapId: string, hexColor: string) {
  //   assertRenderer(this.renderer)

  //   const color = hexToFractionalRgb(hexColor)
  //   if (color) {
  //     this.renderer.setMapColorizeOptions(mapId, { color })
  //     this.triggerRepaint()
  //   }
  // }

  // /**
  //  * Resets the colorization of a single map
  //  * @param mapId - ID of the map
  //  */
  // resetMapColorize(mapId: string) {
  //   assertRenderer(this.renderer)

  //   this.renderer.resetMapColorizeOptions(mapId)
  //   this.triggerRepaint()
  // }

  /**
   * Removes all warped maps from the layer
   */
  clear() {
    assertRenderer(this.renderer)

    this.renderer.clear()
    this.triggerRepaint()
  }

  /**
   * Trigger repaint.
   */
  triggerRepaint(): void {
    this.map?.triggerRepaint()
  }

  /**
   * Prepare rendering the layer.
   */
  preparerender(): void {
    // Empty function to make TypeScript happy
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

    // Getting the viewportSize should also be possible through getting the bounds
    // And using project() to go to resource coordintas
    const canvas = this.map.getCanvas()
    const viewportSize = [
      canvas.width / window.devicePixelRatio,
      canvas.height / window.devicePixelRatio
    ] as [number, number]

    const geoCenterAsLngLat = this.map.getCenter()
    const projectedGeoCenter = lonLatToWebMercator([
      geoCenterAsLngLat.lng,
      geoCenterAsLngLat.lat
    ]) as Point

    const geoLowerLeftAsLngLat = this.map.unproject([0, viewportSize[1]])
    const geoLowerRightAsLngLat = this.map.unproject([
      viewportSize[0],
      viewportSize[1]
    ])
    const geoUpperRightAsLngLat = this.map.unproject([viewportSize[0], 0])
    const geoUpperLeftAsLngLat = this.map.unproject([0, 0])
    // TODO: project using map projection instead of supposing Mercator
    // Possible first step could be to use MapLibre's Mercator computation. Example:
    // const projectedGeoLowerLeftAsMercatorCoordinate = MercatorCoordinate.fromLngLat(geoLowerLeftAsLngLat)
    // const projectedGeoLowerLeftAsPoint = [projectedGeoLowerLeftAsMercatorCoordinate.x, projectedGeoLowerLeftAsMercatorCoordinate.y]
    // But this delivers results in Mercator coordinates that are rescaled to fit in a [0, 0] to [1, 1] rectangle.
    const projectedGeoLowerLeftAsPoint = lonLatToWebMercator([
      geoLowerLeftAsLngLat.lng,
      geoLowerLeftAsLngLat.lat
    ])
    const projectedGeoLowerRightAsPoint = lonLatToWebMercator([
      geoLowerRightAsLngLat.lng,
      geoLowerRightAsLngLat.lat
    ])
    const projectedGeoUpperRightAsPoint = lonLatToWebMercator([
      geoUpperRightAsLngLat.lng,
      geoUpperRightAsLngLat.lat
    ])
    const projectedGeoUpperLeftAsPoint = lonLatToWebMercator([
      geoUpperLeftAsLngLat.lng,
      geoUpperLeftAsLngLat.lat
    ])
    const projectedGeoRectangle = [
      projectedGeoLowerLeftAsPoint,
      projectedGeoLowerRightAsPoint,
      projectedGeoUpperRightAsPoint,
      projectedGeoUpperLeftAsPoint
    ] as Rectangle
    const projectedGeoSize = rectangleToSize(projectedGeoRectangle)
    const projectedGeoPerViewportScale = sizesToScale(
      projectedGeoSize,
      viewportSize
    )

    const rotation = -(this.map.getBearing() / 180) * Math.PI

    const devicePixelRatio = window.devicePixelRatio

    const viewport = new Viewport(
      viewportSize,
      projectedGeoCenter,
      projectedGeoPerViewportScale,
      { rotation, devicePixelRatio }
    )

    this.renderer.render(viewport)
  }

  private contextLost() {
    this.renderer?.contextLost()
  }

  private contextRestored() {
    this.renderer?.contextRestored()
  }

  private addEventListeners() {
    if (!this.renderer || !this.map) {
      return
    }

    this.map.on('webglcontextlost', this.contextLost.bind(this))
    this.map.on('webglcontextrestored', this.contextRestored.bind(this))

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.triggerRepaint.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.triggerRepaint.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.addEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
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
      this.triggerRepaint.bind(this)
    )

    this.renderer.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.triggerRepaint.bind(this)
    )
  }

  private removeEventListeners() {
    if (!this.renderer || !this.map) {
      return
    }

    this.map.off('webglcontextlost', this.contextLost.bind(this))
    this.map.off('webglcontextrestored', this.contextRestored.bind(this))

    this.renderer.removeEventListener(
      WarpedMapEventType.CHANGED,
      this.triggerRepaint.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.triggerRepaint.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPENTERED,
      this.passWarpedMapEvent.bind(this)
    )

    this.renderer.removeEventListener(
      WarpedMapEventType.WARPEDMAPLEFT,
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
      this.triggerRepaint.bind(this)
    )

    this.renderer.warpedMapList.removeEventListener(
      WarpedMapEventType.CLEARED,
      this.triggerRepaint.bind(this)
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
