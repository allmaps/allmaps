import Source from 'ol/source/Source.js'

import { WarpedMap, WarpedMapList } from '@allmaps/render'

import type { TransformationType } from '@allmaps/transform'
import type { Bbox, Ring } from '@allmaps/types'

/**
 * WarpedMapSource class. Together with a [WarpedMapLayer](#warpedmaplayer), this class
 * renders a warped map on an OpenLayers map.
 * @class WarpedMapSource
 * @extends import("ol/source/Source.js")
 */
export class WarpedMapSource extends Source {
  warpedMapList: WarpedMapList

  constructor(imageInfoCache?: Cache) {
    super({
      interpolate: true,
      projection: undefined,
      state: 'ready',
      wrapX: true
    })

    this.warpedMapList = new WarpedMapList(imageInfoCache)
  }

  /**
   * Adds a [Georeference Annotation](https://iiif.io/api/extension/georef/).
   * @param {any} annotation - Georeference Annotation
   * @returns {Promise<(string | Error)[]>} - the map IDs of the maps that were added, or an error per map
   */
  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.warpedMapList.addGeoreferenceAnnotation(annotation)
    this.changed()

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
    const results = this.warpedMapList.removeGeoreferenceAnnotation(annotation)
    this.changed()

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
    const result = this.warpedMapList.addGeoreferencedMap(georeferencedMap)
    this.changed()

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
    const result = this.warpedMapList.removeGeoreferencedMap(georeferencedMap)
    this.changed()

    return result
  }

  /**
   * Returns the WarpedMapList object that contains a list of the warped maps of all loaded maps
   * @returns {WarpedMapList} the warped map list
   */
  getWarpedMapList(): WarpedMapList {
    return this.warpedMapList
  }

  /**
   * Returns a single map's warped map
   * @param {string} mapId - ID of the map
   * @returns {WarpedMap | undefined} the warped map
   */
  getWarpedMap(mapId: string): WarpedMap | undefined {
    return this.warpedMapList.getWarpedMap(mapId)
  }

  /**
   * Make a single map visible
   * @param {string} mapId - ID of the map
   */
  showMap(mapId: string) {
    this.warpedMapList.showMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps visible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  showMaps(mapIds: Iterable<string>) {
    this.warpedMapList.showMaps(mapIds)
    this.changed()
  }

  /**
   * Make a single map invisible
   * @param {string} mapId - ID of the map
   */
  hideMap(mapId: string) {
    this.warpedMapList.hideMaps([mapId])
    this.changed()
  }

  /**
   * Make multiple maps invisible
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  hideMaps(mapIds: Iterable<string>) {
    this.warpedMapList.hideMaps(mapIds)
    this.changed()
  }

  /**
   * Returns the visibility of a single map
   * @returns {boolean | undefined} - whether the map is visible
   */
  isMapVisible(mapId: string): boolean | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    return warpedMap?.visible
  }

  /**
   * Sets the resource mask of a single map
   * @param {string} mapId - ID of the map
   * @param {Ring} resourceMask - new resource mask
   */
  setMapResourceMask(mapId: string, resourceMask: Ring) {
    this.warpedMapList.setMapResourceMask(mapId, resourceMask)
    this.changed()
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
    this.warpedMapList.setMapsTransformationType(mapIds, transformation)
    this.changed()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in lon lat coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalBbox(): Bbox | undefined {
    return this.warpedMapList.getTotalBbox()
  }

  /**
   * Return the Bbox of all visible maps in the layer (inside or outside of the Viewport), in projected coordinates.
   * @returns {Bbox | undefined} - bbox of all warped maps
   */
  getTotalProjectedBbox(): Bbox | undefined {
    return this.warpedMapList.getTotalProjectedGeoMaskBbox()
  }

  /**
   * Bring maps to front
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsToFront(mapIds: Iterable<string>) {
    this.warpedMapList.bringMapsToFront(mapIds)
    this.changed()
  }

  /**
   * Send maps to back
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsToBack(mapIds: string[]) {
    this.warpedMapList.sendMapsToBack(mapIds)
    this.changed()
  }

  /**
   * Bring maps forward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  bringMapsForward(mapIds: Iterable<string>) {
    this.warpedMapList.bringMapsForward(mapIds)
    this.changed()
  }

  /**
   * Send maps backward
   * @param {Iterable<string>} mapIds - IDs of the maps
   */
  sendMapsBackward(mapIds: Iterable<string>) {
    this.warpedMapList.sendMapsBackward(mapIds)
    this.changed()
  }

  /**
   * Returns the z-index of a single map
   * @param {string} mapId - ID of the warped map
   * @returns {number | undefined} - z-index of the warped map
   */
  getMapZIndex(mapId: string): number | undefined {
    return this.warpedMapList.getMapZIndex(mapId)
  }

  // not getZIndex() here since default for OL Layer

  /**
   * Sets the image info Cache of the warpedMapList, informing it's warped maps about possibly cached imageInfo.
   * @param {Cache} cache - the image info cache
   */
  setImageInfoCache(cache: Cache) {
    this.warpedMapList.setImageInfoCache(cache)
  }

  /**
   * Clears the source, removes all maps
   */
  clear() {
    this.warpedMapList.clear()
    this.changed()
  }
}
