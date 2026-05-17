import { Map as MaplibreMap, CustomLayerInterface } from 'maplibre-gl'

import { WebGL2Renderer } from '@allmaps/render/webgl2'
import { Viewport, WarpedMapEvent } from '@allmaps/render'
import {
  angularMean,
  bboxToLine,
  computeBbox,
  computeRotatedBboxProperties,
  degreesToRadians,
  mergeOptions,
  radiansToDegrees,
  rectangleToSize,
  sizesToScale,
  bboxToRectangle,
  scaleBbox,
  bboxToSize
} from '@allmaps/stdlib'
import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import { BaseWarpedMapLayer } from '@allmaps/warpedmaplayer'
import { computeWarpedMapBearing } from '@allmaps/bearing'

import type {
  CameraForBoundsOptions,
  CenterZoomBearing,
  LngLatBoundsLike
} from 'maplibre-gl'

import type { Rectangle, Point, Fit, Size } from '@allmaps/types'

import type { WebGL2RenderOptions } from '@allmaps/render/webgl2'

export type SpecificMapLibreWarpedMapLayerOptions = {
  layerId: string

  // TODO: These options are not configurable, so
  // we should consider removing them from the options.
  layerType: 'custom'
  layerRenderingMode: '2d'
}

export type CenterZoomBearingOptions = {
  applyMask: boolean
  bearingSelection: 'first' | 'angularMean'
  fit: Fit
}

export type MapLibreWarpedMapLayerOptions =
  SpecificMapLibreWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

const DEFFAULT_SPECIFIC_MAPLIBRE_WARPED_MAP_LAYER_OPTIONS: SpecificMapLibreWarpedMapLayerOptions =
  {
    layerId: 'warped-map-layer',
    layerType: 'custom',
    layerRenderingMode: '2d'
  }
const DEFAULT_BEARING_OPTIONS: CenterZoomBearingOptions = {
  applyMask: true,
  bearingSelection: 'first',
  fit: 'contain'
}

/**
 * WarpedMapLayer class.
 *
 * This class renders maps from a IIIF Georeference Annotation on a MapLibre map.
 * WarpedMapLayer is implemented using MapLibre's [CustomLayerInterface](https://maplibre.org/maplibre-gl-js/docs/API/interfaces/maplibregl.CustomLayerInterface/).
 */
export class WarpedMapLayer
  extends BaseWarpedMapLayer<SpecificMapLibreWarpedMapLayerOptions>
  implements CustomLayerInterface
{
  id: string
  type: 'custom'
  renderingMode: '2d'

  map?: MaplibreMap

  /**
   * Creates a WarpedMapLayer instance
   *
   * @param id - Unique ID for this layer
   * @param options - options
   */
  constructor(options?: Partial<MapLibreWarpedMapLayerOptions>) {
    super(DEFFAULT_SPECIFIC_MAPLIBRE_WARPED_MAP_LAYER_OPTIONS, options)

    this.id = this.options.layerId
    this.type = this.options.layerType
    this.renderingMode = this.options.layerRenderingMode
  }

  /**
   * Method called when the layer has been added to the Map.
   *
   * @param map - The Map this custom layer was just added to.
   * @param gl - The WebGL 2 context for the map.
   */
  onAdd(map: MaplibreMap, gl: WebGL2RenderingContext) {
    this.map = map

    this.renderer = new WebGL2Renderer(gl, this.options)

    this.addEventListeners()

    this.map.on('webglcontextlost', this.contextLost.bind(this))
    this.map.on('webglcontextrestored', this.contextRestored.bind(this))
  }

  /**
   * Method called when the layer has been removed from the Map.
   */
  onRemove(): void {
    if (!this.renderer) {
      return
    }

    this.removeEventListeners()

    this.map?.off('webglcontextlost', this.contextLost.bind(this))
    this.map?.off('webglcontextrestored', this.contextRestored.bind(this))

    this.renderer.destroy()
  }

  /**
   * Get the bounding box of all maps as a MapLibre LngLatBoundsLike object
   *
   * This is the default MapLibre getBounds() function
   *
   * The result is returned in lon-lat `EPSG:4326`.
   *
   * @returns bounding box of all maps
   */
  getBounds(): LngLatBoundsLike | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const bbox = this.getBbox()
    if (bbox) {
      return bboxToLine(bbox)
    }
  }

  /**
   * Get the bounding box of all selected maps as a MapLibre LngLatBoundsLike object
   *
   * This is the default MapLibre getBounds() function
   *
   * The result is returned in lon-lat `EPSG:4326`.
   *
   * @param mapIds - Map IDs
   * @returns bounding box of all selected maps
   */
  getMapsBounds(mapIds: string[]): LngLatBoundsLike | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

    const bbox = this.getMapsBbox(mapIds)
    if (bbox) {
      return bboxToLine(bbox)
    }
  }

  /**
   * Get the center, zoom and bearing needed to make the Maplibre Map's viewport fit all maps in the layer.
   *
   * This can be used as input for
   * - Map.jumpTo() for immediate change
   * - Map.easeTo() for smooth panning
   * - Map.flyTo() for a flying animation which zooms out and in
   *
   * @returns center, zoom and bearing
   */
  getCenterZoomBearing(
    options?: Partial<CenterZoomBearingOptions & CameraForBoundsOptions>
  ): CenterZoomBearing {
    return this.getMapsCenterZoomBearing(this.getMapIds(), options)
  }

  /**
   * Get the center, zoom and bearing needed to make the Maplibre Map's viewport fit all selected maps.
   *
   * This can be used as input for
   * - Map.jumpTo() for immediate change
   * - Map.easeTo() for smooth panning
   * - Map.flyTo() for a flying animation which zooms out and back in
   *
   * @returns center, zoom and bearing
   */
  getMapsCenterZoomBearing(
    mapIds: string[],
    options?: Partial<CenterZoomBearingOptions & CameraForBoundsOptions>
  ): CenterZoomBearing {
    // When MapLibre is asked to fit to a bbox while the map is rotated,
    // it will compute a CenterZoomBearing, that fits the entire bbox
    // (which appears rotated when the map is rotated) in the viewport.
    //
    // This function computes the CenterZoomBearing needed to display maps
    // while the map is rotated towards their bearing.
    //
    // First a bearing is computed using @allmaps/bearing from the first map or as an average of all maps
    //
    // Then the projectedGeoMasks are rotated in the opposite direction
    // to find their center and ask MapLibre which zoom it would need to center on those.

    BaseWarpedMapLayer.assertRenderer(this.renderer)

    options = mergeOptions(DEFAULT_BEARING_OPTIONS, options)

    // Get warped maps
    const warpedMaps = this.getWarpedMaps(mapIds)
    if (!(warpedMaps.length > 0)) {
      throw new Error('No warped maps')
    }

    // Compute bearing
    let bearing
    if (options.bearingSelection == 'first') {
      bearing = computeWarpedMapBearing(warpedMaps[0])
    } else if (options.bearingSelection == 'angularMean') {
      bearing = radiansToDegrees(
        angularMean(
          ...warpedMaps.map((warpedMap) =>
            degreesToRadians(computeWarpedMapBearing(warpedMap))
          )
        )
      )
    } else {
      throw new Error('Unknown bearing selection method')
    }

    // Rotate projectedGeoMasks in the opposite direction and get center and bbox
    //
    // Note: bearing is in clockwise direction and rotation functions
    // go in counter-clockwise direction so no minus sign needed.
    const projectedGeoMasks = options.applyMask
      ? warpedMaps.map((warpedMap) => warpedMap.projectedGeoAppliedMask)
      : warpedMaps.map((warpedMap) => warpedMap.projectedGeoMask)
    const rotatedBboxProperties = computeRotatedBboxProperties(
      projectedGeoMasks,
      degreesToRadians(bearing)
    )
    let projectedGeoBbox = rotatedBboxProperties.bbox
    const projectedGeoCenter = rotatedBboxProperties.center

    const map = this.map
    if (!map) {
      throw new Error('Map not defined')
    }

    // Scale bbox based on fit with viewport bbox
    if (options.fit) {
      const canvas = map.getCanvas()
      const viewportSize = [
        canvas.width / window.devicePixelRatio,
        canvas.height / window.devicePixelRatio
      ] as Size

      const adjustmentScale =
        sizesToScale(bboxToSize(projectedGeoBbox), viewportSize, options.fit) /
        sizesToScale(bboxToSize(projectedGeoBbox), viewportSize, 'contain')
      projectedGeoBbox = scaleBbox(projectedGeoBbox, adjustmentScale)
    }

    // Project to lonlat
    const projectedGeoRectangle = bboxToRectangle(projectedGeoBbox)
    const geoRectangle = projectedGeoRectangle.map((point) =>
      webMercatorToLonLat(point)
    ) as Rectangle
    const geoBbox = computeBbox(geoRectangle)
    const geoCenter = webMercatorToLonLat(projectedGeoCenter)

    // Get zoom via camera for bbox bounds
    const camera = map.cameraForBounds(bboxToLine(geoBbox), options)

    if (!camera) {
      throw new Error('Unable to compute camera')
    }

    return { center: geoCenter, zoom: camera.zoom, bearing }
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
    ] as Size

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

  // Functions defined as abstract in base class

  /**
   * Trigger the native update function of the map
   */
  nativeUpdate(): void {
    this.map?.triggerRepaint()
  }

  /**
   * Pass events
   */
  nativePassWarpedMapEvent(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (this.map) {
        this.map.fire(event.type, {
          ...event.data,
          error: event.error,
          layerId: this.id
        })
      }
    }
  }
}
