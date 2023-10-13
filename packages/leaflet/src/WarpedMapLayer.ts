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
  RTree
} from '@allmaps/render'

import { hexToFractionalRgb } from '@allmaps/stdlib'

import type { Map, ZoomAnimEvent } from 'leaflet'

import type { Size, BBox, Transform, NeededTile } from '@allmaps/render'

// TODO: make class or integrate in Viewport
type FrameState = {
  size: [number, number] // [width, height]
  rotation: number // rotation in radians
  resolution: number
  center: [number, number] // position
  extent: [number, number, number, number] // [minx, miny, maxx, maxy]
  coordinateToPixelTransform: Transform
}

const WarpedMapLayer = L.Layer.extend({
  options: {
    THROTTLE_WAIT_MS: 500,
    THROTTLE_OPTIONS: {
      leading: true,
      trailing: true
    },
    opacity: 1
  },

  // Functions from WarpedMapLayers in @Allmaps/openlayers

  initialize: function (options: any) {
    L.setOptions(this, options)

    this.container = L.DomUtil.create('div')

    this.container.style.position = 'absolute'
    this.container.style.width = '100%' // TODO: 100%
    this.container.style.height = '100%' // TODO: 100%
    this.container.classList.add('leaflet-layer')
    this.container.classList.add('allmaps-warped-map-layer')

    this.canvas = L.DomUtil.create('canvas', undefined, this.container)

    this.canvas.style.position = 'absolute'
    this.canvas.style.left = '0'
    this.canvas.classList.add('leaflet-zoom-animated') // Treat canvas element like L.ImageOverlay
    this.canvas.classList.add('leaflet-image-layer') // Treat canvas element like L.ImageOverlay

    this.gl = this.canvas.getContext('webgl2', {
      premultipliedAlpha: true
    })

    if (!this.gl) {
      throw new Error('WebGL 2 not available')
    }

    this.tileCache = new TileCache()
    this.renderer = new WebGL2Renderer(this.gl, this.tileCache)

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this._rendererChanged.bind(this)
    )

    this.rtree = new RTree()
    this.world = new World(this.rtree, this.options.imageInfoCache)

    this.world.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this._warpedMapAdded.bind(this)
    )

    // this.world.addEventListener(
    //   WarpedMapEventType.ZINDICESCHANGES,
    //   this.zIndicesChanged.bind(this)
    // )

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

    this.tileCache.addEventListener(
      WarpedMapEventType.TILELOADED,
      this._update.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.ALLTILESLOADED,
      this._update.bind(this)
    )

    this.viewport = new Viewport(this.world)

    this.throttledUpdateViewportAndGetTilesNeeded = throttle(
      this.viewport.updateViewportAndGetTilesNeeded.bind(this.viewport),
      this.THROTTLE_WAIT_MS,
      this.THROTTLE_OPTIONS
    )
  },

  _warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const warpedMap = this.world.getMap(mapId)

      if (warpedMap) {
        this.renderer.addWarpedMap(warpedMap)
      }

      // TODO: Make a Leaflet event of this?
      // const olEvent = new OLWarpedMapEvent(
      //   WarpedMapEventType.WARPEDMAPADDED,
      //   mapId
      // )
      // this.dispatchEvent(olEvent)
    }

    this._update()
  },

  // zIndicesChanged() {
  //   const sortedMapIdsInViewport = [...this.mapIdsInViewport].sort(
  //     (mapIdA, mapIdB) => {
  //       const zIndexA = this.world.getZIndex(mapIdA)
  //       const zIndexB = this.world.getZIndex(mapIdB)
  //       if (zIndexA !== undefined && zIndexB !== undefined) {
  //         return zIndexA - zIndexB
  //       }

  //       return 0
  //     }
  //   )

  //   this.mapIdsInViewport = new Set(sortedMapIdsInViewport)
  //   this._update()
  // },

  _visibilityChanged() {
    this._update()
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

  // warpedMapEnter(event: Event) {
  //   if (event instanceof WarpedMapEvent) {
  //     const mapId = event.data as string
  //     this.mapIdsInViewport.add(mapId)
  //     this.zIndicesChanged()
  //   }
  // },

  // warpedMapLeave(event: Event) {
  //   if (event instanceof WarpedMapEvent) {
  //     const mapId = event.data as string
  //     this.mapIdsInViewport.delete(mapId)
  //   }
  // },

  _worldCleared() {
    this.renderer.clear()
    this.tileCache.clear()
  },

  _rendererChanged() {
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

  _onResize(entries: ResizeObserverEntry[]) {
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

  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this._update()
  },

  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this._update()
  },

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
  },

  resetRemoveBackground() {
    this.renderer.resetRemoveBackground()
    this._update()
  },

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
  },

  resetMapRemoveBackground(mapId: string) {
    this.renderer.resetMapRemoveBackground(mapId)
  },

  setColorize(hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setColorize({ color })
      this._update()
    }
  },

  resetColorize() {
    this.renderer.resetColorize()
    this._update()
  },

  setMapColorize(mapId: string, hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapColorize(mapId, { color })
      this._update()
    }
  },

  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorize(mapId)
    this._update()
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

  _prepareFrameInternal() {
    this.renderer.updateVertexBuffers(this.viewport)
  },

  _renderInternal(frameState: FrameState, last = false): HTMLElement {
    const projectionTransform = this._makeProjectionTransform(frameState)
    this.viewport.setProjectionTransform(projectionTransform)

    this._prepareFrameInternal()

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
        this.tileCache.setTiles(tilesNeeded)
      }

      // TODO: reset maps not in viewport, make sure these only
      // get drawn when they are visible AND when they have their buffers
      // updated.
      this.renderer.render(this.viewport)
    }

    return this.container
  },

  render(frameState: FrameState): HTMLElement {
    if (this.throttledRenderTimeoutId) {
      clearTimeout(this.throttledRenderTimeoutId)
    }

    this.throttledRenderTimeoutId = setTimeout(() => {
      this._renderInternal(frameState, true)
    }, this.options.THROTTLE_WAIT_MS)

    return this._renderInternal(frameState)
  },

  // Functions from WaredMapSource in @Allmaps/openlayers

  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.world.addGeoreferenceAnnotation(annotation)
    this._update()

    return results
  },

  async removeGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.world.removeGeoreferenceAnnotation(annotation)
    this._update()

    return results
  },

  // Functions to align Leaflet with OpenLayers

  computeFrameState(): FrameState {
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

  getOpacity(): number {
    return this.options.opacity
  },

  setOpacity(opacity: number) {
    this.options.opacity = opacity
    this._update()
  },

  setImageInfoCache(cache: Cache) {
    this.world.setImageInfoCache(cache)
  },

  // Leaflet specific Layer functions

  onAdd: function (map: Map) {
    const pane = map.getPane(this.options.pane)
    if (!pane) {
      throw new Error('Pane not found')
    }
    pane.appendChild(this.container)

    // TODO: remove, because this is done automatically
    // this._map = map

    map.on('zoomend viewreset moveend', this._update, this)
    map.on('zoomanim', this._animateZoom, this)

    this.resizeObserver = new ResizeObserver(this._onResize.bind(this))
    this.resizeObserver.observe(this._map.getContainer(), {
      box: 'content-box'
    })
    // Note: Leaflet has a resize map state change event which we could also use, but wortking with a resizeObserver is better when dealing with device pixel ratios
    // map.on('resize', this._update, this)

    this._update()
    return this
  },

  onRemove: function (map: Map) {
    this.container.remove()
    map.off('zoomend viewreset moveend', this._update, this)
    map.off('zoomanim', this._animateZoom, this)
  },

  // borrowed from L.ImageOverlay
  // https://github.com/Leaflet/Leaflet/blob/3b62c7ec96242ee4040cf438a8101a48f8da316d/src/layer/ImageOverlay.js#L225
  _animateZoom: function (e: ZoomAnimEvent) {
    const scale = this._map.getZoomScale(e.zoom)
    const offset = this._map._latLngBoundsToNewLayerBounds(
      this._map.getBounds(),
      e.zoom,
      e.center
    ).min

    L.DomUtil.setTransform(this.canvas, offset, scale)
  },

  _update: function () {
    if (!this._map) {
      return
    }

    const topLeft = this._map.containerPointToLayerPoint([0, 0])
    L.DomUtil.setPosition(this.canvas, topLeft)

    const frameState = this.computeFrameState()

    this.render(frameState)
  }
})

export default WarpedMapLayer
