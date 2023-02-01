import Layer from 'ol/layer/Layer.js'
import type { FrameState } from 'ol/PluggableMap.js'

// import { throttle } from 'lodash-es'

import {
  TileCache,
  World,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2Renderer
} from '@allmaps/render'

import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import type { Size, BBox, Transform, OptionalColor } from '@allmaps/render'

import type { WarpedMapSource } from './WarpedMapSource.js'

export class WarpedMapLayer extends Layer {
  source: WarpedMapSource | null = null
  container: HTMLElement

  canvas: HTMLCanvasElement | null = null
  gl: WebGL2RenderingContext

  canvasSize: [number, number] = [0, 0]

  world: World
  renderer: WebGL2Renderer
  viewport: Viewport
  tileCache: TileCache

  mapIdsInViewport: Set<string> = new Set()

  constructor(options: {}) {
    options = options || {}

    super(options)

    const container = document.createElement('div')
    this.container = container

    container.style.position = 'absolute'
    container.style.width = '100%'
    container.style.height = '100%'
    container.classList.add('ol-layer')
    container.classList.add('allmaps-warped-layer')
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

    const resizeObserver = new ResizeObserver(this.onResize.bind(this))
    resizeObserver.observe(canvas, { box: 'content-box' })

    this.canvas = canvas
    this.gl = gl

    this.tileCache = new TileCache()
    this.renderer = new WebGL2Renderer(gl, this.tileCache)

    this.renderer.addEventListener(
      WarpedMapEventType.CHANGED,
      this.rendererChanged.bind(this)
    )

    this.source = this.getSource() as WarpedMapSource
    // TODO: listen to change:source

    this.world = this.source.getWorld()
    this.world.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.viewport = new Viewport(this.world)

    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this.warpedMapEnter.bind(this)
    )
    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this.warpedMapLeave.bind(this)
    )

    for (let warpedMap of this.world.getWarpedMaps()) {
      this.renderer.addWarpedMap(warpedMap)
    }
  }

  warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const warpedMap = this.world.getWarpedMap(mapId)

      if (warpedMap) {
        this.renderer.addWarpedMap(warpedMap)
      }

      const olEvent = new OLWarpedMapEvent(
        WarpedMapEventType.WARPEDMAPADDED,
        mapId
      )
      this.dispatchEvent(olEvent)
    }

    this.changed()
  }

  warpedMapEnter(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      this.mapIdsInViewport.add(mapId)

      // const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
      // TODO: set visible
    }
  }

  warpedMapLeave(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      this.mapIdsInViewport.delete(mapId)
      // const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
      // TODO: set invisible
    }
  }

  rendererChanged() {
    this.changed()
  }

  onResize(entries: ResizeObserverEntry[]) {
    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    for (const entry of entries) {
      let width = entry.contentRect.width
      let height = entry.contentRect.height
      let dpr = window.devicePixelRatio
      if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other paths are imperfect fallbacks
        // for browsers that don't provide anyway to do this
        width = entry.devicePixelContentBoxSize[0].inlineSize
        height = entry.devicePixelContentBoxSize[0].blockSize
        dpr = 1 // it's already in width and height
      } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
          width = entry.contentBoxSize[0].inlineSize
          height = entry.contentBoxSize[0].blockSize
        }
      }
      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)
      this.canvasSize = [displayWidth, displayHeight]
    }
    this.changed()
  }

  resizeCanvas(canvas: HTMLCanvasElement, [width, height]: [number, number]) {
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      canvas.width = width
      canvas.height = height
    }

    return needResize
  }

  hexToRgb(hex: string | null): OptionalColor {
    if (!hex) {
      return null
    }

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 256,
          parseInt(result[2], 16) / 256,
          parseInt(result[3], 16) / 256
        ]
      : null
  }

  setMapOpacity(mapId: string, opacity: number) {
    this.renderer.setMapOpacity(mapId, opacity)
    this.changed()
  }

  resetMapOpacity(mapId: string) {
    this.renderer.resetMapOpacity(mapId)
    this.changed()
  }

  setRemoveBackground(
    hexColor: string,
    options?: { threshold: number; hardness: number }
  ) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setRemoveBackground({
        color,
        ...options
      })
      this.changed()
    }
  }

  resetRemoveBackground() {
    this.renderer.resetRemoveBackground()
    this.changed()
  }

  setMapRemoveBackground(
    mapId: string,
    hexColor: string,
    options?: { threshold: number; hardness: number }
  ) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapRemoveBackground(mapId, {
        color,
        ...options
      })
      this.changed()
    }
  }

  resetMapRemoveBackground(mapId: string) {
    this.renderer.resetMapRemoveBackground(mapId)
  }

  setColorize(hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setColorize({ color })
      this.changed()
    }
  }

  resetColorize() {
    this.renderer.resetColorize()
    this.changed()
  }

  setMapColorize(mapId: string, hexColor: string) {
    const color = this.hexToRgb(hexColor)
    if (color) {
      this.renderer.setMapColorize(mapId, { color })
      this.changed()
    }
  }

  resetMapColorize(mapId: string) {
    this.renderer.resetMapColorize(mapId)
    this.changed()
  }

  // disposeInternal() {
  // for (let warpedMapWebGLRenderer of this.warpedMapWebGLRenderers.values()) {
  //   warpedMapWebGLRenderer.dispose()
  // }

  // if (this.gl) {
  //   for (let uboBuffer of this.uboBuffers.values()) {
  //     this.gl.deleteBuffer(uboBuffer)
  //   }

  //   this.gl.deleteProgram(this.program)
  //   this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  // }

  // super.disposeInternal()
  // }

  render(frameState: FrameState, target: HTMLElement): HTMLElement {
    if (frameState.extent) {
      const extent = frameState.extent as BBox

      if (this.canvas) {
        this.resizeCanvas(this.canvas, this.canvasSize)
      }

      this.renderer.setOpacity(this.getOpacity())

      const viewportSize = [
        frameState.size[0] * window.devicePixelRatio,
        frameState.size[1] * window.devicePixelRatio
      ] as Size

      //   if (this.throttledUpdateNeededTiles) {
      //     this.throttledUpdateNeededTiles(
      //       viewportSize,
      //       extent,
      //       frameState.coordinateToPixelTransform
      //     )
      //   }
      // }
      const tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded(
        viewportSize,
        extent
      )

      this.tileCache.setTiles(tilesNeeded)

      this.renderer.render(
        frameState.coordinateToPixelTransform as Transform,
        frameState.pixelToCoordinateTransform as Transform,
        this.mapIdsInViewport.values()
      )
    }

    return this.container
  }
}
