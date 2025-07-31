import { Map as MaplibreMap, CustomLayerInterface } from 'maplibre-gl'

import { WebGL2Renderer } from '@allmaps/render/webgl2'
import { Viewport, WarpedMapEvent } from '@allmaps/render'
import { rectangleToSize, sizesToScale } from '@allmaps/stdlib'
import { lonLatToWebMercator } from '@allmaps/project'
import { BaseWarpedMapLayer } from '@allmaps/warpedmaplayer'

import type { LngLatBoundsLike } from 'maplibre-gl'

import type { Rectangle, Point } from '@allmaps/types'

import type { WebGL2RenderOptions } from '@allmaps/render'

export type SpecificMapLibreWarpedMapLayerOptions = {
  layerId: string
  layerType: 'custom'
  layerRenderingMode: '2d'
}

export type MapLibreWarpedMapLayerOptions =
  SpecificMapLibreWarpedMapLayerOptions & Partial<WebGL2RenderOptions>

const DEFFAULT_SPECIFIC_MAPLIBRE_WARPED_MAP_LAYER_OPTIONS: SpecificMapLibreWarpedMapLayerOptions =
  {
    layerId: 'warped-map-layer',
    layerType: 'custom',
    layerRenderingMode: '2d'
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
   * Get the bounding box of all maps  as a MapLibre LngLatBoundsLike object
   *
   * This is the default MapLibre getBounds() function
   *
   * Result is in longitude/latitude `EPSG:4326` coordinates.
   *
   * @returns bounding box of all warped maps
   */
  getBounds(): LngLatBoundsLike | undefined {
    BaseWarpedMapLayer.assertRenderer(this.renderer)

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

  // /**
  //  * Prepare rendering the layer.
  //  */
  // preparerender(): void {
  //   // Empty function to make TypeScript happy
  // }

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
        this.map.fire(event.type, event.data)
      }
    }
  }
}
