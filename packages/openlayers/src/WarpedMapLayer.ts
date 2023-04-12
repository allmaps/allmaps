import Layer from 'ol/layer/Layer.js'
import ViewHint from 'ol/ViewHint.js'

import { throttle, type DebouncedFunc } from 'lodash-es'

import {
  TileCache,
  World,
  Viewport,
  WarpedMapEvent,
  WarpedMapEventType,
  WebGL2Renderer,
  composeTransform
} from '@allmaps/render'

import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

import type { FrameState } from 'ol/PluggableMap.js'

import type {
  Size,
  BBox,
  Transform,
  OptionalColor,
  NeededTile
} from '@allmaps/render'

import type { WarpedMapSource } from './WarpedMapSource.js'

// TODO: Move to stdlib?
const THROTTLE_WAIT_MS = 500
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

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

  throttledUpdateViewportAndGetTilesNeeded: DebouncedFunc<
    (viewportSize: Size, geoBBox: BBox) => NeededTile[]
  >

  throttledRenderTimeoutId: number | undefined

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

    this.world.addEventListener(
      WarpedMapEventType.ZINDICESCHANGES,
      this.zIndicesChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.VISIBILITYCHANGED,
      this.visibilityChanged.bind(this)
    )

    this.world.addEventListener(
      WarpedMapEventType.CLEARED,
      this.worldCleared.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILEADDED,
      this.changed.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.ALLTILESLOADED,
      this.changed.bind(this)
    )

    this.viewport = new Viewport(this.world)

    this.throttledUpdateViewportAndGetTilesNeeded = throttle(
      this.viewport.updateViewportAndGetTilesNeeded.bind(this.viewport),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )

    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPENTER,
      this.warpedMapEnter.bind(this)
    )
    this.viewport.addEventListener(
      WarpedMapEventType.WARPEDMAPLEAVE,
      this.warpedMapLeave.bind(this)
    )

    for (let warpedMap of this.world.getMaps()) {
      this.renderer.addWarpedMap(warpedMap)
    }
  }

  warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const warpedMap = this.world.getMap(mapId)

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

  zIndicesChanged() {
    const sortedMapIdsInViewport = [...this.mapIdsInViewport].sort(
      (mapIdA, mapIdB) => {
        const zIndexA = this.world.getZIndex(mapIdA)
        const zIndexB = this.world.getZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }

        return 0
      }
    )

    this.mapIdsInViewport = new Set(sortedMapIdsInViewport)
  }

  visibilityChanged() {
    this.changed()
  }

  warpedMapEnter(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      this.mapIdsInViewport.add(mapId)
      this.zIndicesChanged()
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

  private worldCleared() {
    this.renderer.clear()
    // viewport: Viewport
    this.tileCache.clear()
  }

  rendererChanged() {
    this.changed()
  }

  onResize(entries: ResizeObserverEntry[]) {
    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    // TODO: read + understand https://web.dev/device-pixel-content-box/
    for (const entry of entries) {
      let width = entry.contentRect.width
      let height = entry.contentRect.height
      let dpr = window.devicePixelRatio

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

  // TODO: use OL's own makeProjectionTransform function?
  makeProjectionTransform(frameState: FrameState): Transform {
    const size = frameState.size
    const rotation = frameState.viewState.rotation
    const resolution = frameState.viewState.resolution
    const center = frameState.viewState.center

    return composeTransform(
      0,
      0,
      2 / (resolution * size[0]),
      2 / (resolution * size[1]),
      -rotation,
      -center[0],
      -center[1]
    )
  }

  // TODO: Use OL's renderer class, move this function there?
  // TODO: finish this function, use extent and revision
  prepareFrameInternal(frameState: FrameState) {
    const vectorSource = this.source
    const viewState = frameState.viewState
    const viewNotMoving =
      !frameState.viewHints[ViewHint.ANIMATING] &&
      !frameState.viewHints[ViewHint.INTERACTING]
    const extentChanged = true // !equals(this.previousExtent_, frameState.extent)
    const sourceChanged = true // this.sourceRevision_ < vectorSource.getRevision()

    // if (sourceChanged) {
    //   this.sourceRevision_ = vectorSource.getRevision()
    // }

    if (viewNotMoving && (extentChanged || sourceChanged)) {
      //   this.rebuildBuffers_(frameState);
      //   this.previousExtent_ = frameState.extent.slice();

      const projectionTransform = this.makeProjectionTransform(frameState)
      this.renderer.updateVertexBuffers(
        projectionTransform,
        this.mapIdsInViewport.values()
      )
    }
  }

  private renderInternal(frameState: FrameState, last = false): HTMLElement {
    this.prepareFrameInternal(frameState)

    const projectionTransform = this.makeProjectionTransform(frameState)

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
          extent
        )
      } else {
        tilesNeeded = this.throttledUpdateViewportAndGetTilesNeeded(
          viewportSize,
          extent
        )
      }

      if (tilesNeeded && tilesNeeded.length) {
        this.tileCache.setTiles(tilesNeeded)
      }

      // TODO: reset maps not in viewport, make sure these only
      // get drawn when they are visible AND when they have their buffers
      // updated.
      this.renderer.render(
        frameState.pixelToCoordinateTransform as Transform,
        projectionTransform,
        this.mapIdsInViewport.values()
      )
    }

    return this.container
  }

  render(frameState: FrameState): HTMLElement {
    if (this.throttledRenderTimeoutId) {
      clearTimeout(this.throttledRenderTimeoutId)
    }

    if (this.canvas) {
      this.resizeCanvas(this.canvas, this.canvasSize)
    }

    this.throttledRenderTimeoutId = setTimeout(() => {
      this.renderInternal(frameState, true)
    }, THROTTLE_WAIT_MS)

    return this.renderInternal(frameState)
  }
}
