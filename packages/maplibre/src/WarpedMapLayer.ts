import type { Map, CustomLayerInterface } from 'maplibre-gl'
import { mat4 } from 'gl-matrix'

import {
  TileCache,
  World,
  RTree,
  Viewport,
  WebGL2Renderer,
  WarpedMapEvent,
  WarpedMapEventType,
  composeTransform
} from '@allmaps/render'

import type { Size, BBox, Transform, NeededTile } from '@allmaps/render'

type FrameState = {
  size: Size
  viewState: {
    rotation: number
    resolution: number
    center: number[]
  }
  extent: BBox | null
  coordinateToPixelTransform: Transform | null
}

export class WarpedMapLayer implements CustomLayerInterface {
  id = 'warped-map' as const
  type = 'custom' as const
  renderingMode = '2d' as const

  gl: WebGL2RenderingContext | null = null

  rtree: RTree
  world: World
  viewport: Viewport
  renderer: WebGL2Renderer | null = null
  tileCache: TileCache

  constructor() {
    this.rtree = new RTree()
    this.world = new World(this.rtree)
    this.viewport = new Viewport(this.world)
    this.tileCache = new TileCache()

    this.world.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )
  }

  onAdd(map: Map, gl: WebGL2RenderingContext) {
    this.gl = gl
    this.renderer = new WebGL2Renderer(this.gl, this.tileCache)
  }

  async addGeoreferenceAnnotation(
    annotation: unknown
  ): Promise<(string | Error)[]> {
    const results = this.world.addGeoreferenceAnnotation(annotation)

    return results
  }

  private warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const warpedMap = this.world.getMap(mapId)
      if (warpedMap && this.renderer) {
        this.renderer.addWarpedMap(warpedMap)
      }
    }
  }

  private makeProjectionTransform(frameState: FrameState): Transform {
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

  private prepareFrameInternal() {
    if (this.renderer) {
      this.renderer.updateVertexBuffers(this.viewport)
    }
  }

  private renderInternal(frameState: FrameState): void {
    if (!this.renderer) {
      return
    }

    const projectionTransform = this.makeProjectionTransform(frameState)

    console.log('projectionTransform', projectionTransform)
    this.viewport.setProjectionTransform(projectionTransform)

    this.prepareFrameInternal()

    if (frameState.extent) {
      const extent = frameState.extent as BBox

      // this.renderer.setOpacity(this.getOpacity())

      const viewportSize = [
        frameState.size[0] * window.devicePixelRatio,
        frameState.size[1] * window.devicePixelRatio
      ] as Size

      let tilesNeeded: NeededTile[] | undefined

      tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded(
        viewportSize,
        extent,
        frameState.coordinateToPixelTransform as Transform
      )

      if (tilesNeeded && tilesNeeded.length) {
        console.log(tilesNeeded)
        this.tileCache.setTiles(tilesNeeded)
      }

      // TODO: reset maps not in viewport, make sure these only
      // get drawn when they are visible AND when they have their buffers
      // updated.
      this.renderer.render(this.viewport)
    }
  }

  render(gl: WebGL2RenderingContext | WebGLRenderingContext, matrix: mat4) {
    console.log(matrix)

    gl.getParameter(gl.VIEWPORT)

    const frameState = {
      size: [1512, 557] as Size,
      viewState: {
        rotation: 0,
        resolution: 9.554628535647032,
        center: [-7910351.883820941, 5214893.4606114365]
      },
      extent: [
        -7917575.18299389, 5212232.496564259, -7903128.584647992,
        5217554.424658614
      ] as [number, number, number, number],
      coordinateToPixelTransform: [
        0.10466131637343458, 0, 0, -0.10466131637343458, 828663.8411377777,
        546076.1143348087
      ] as Transform
    }

    return this.renderInternal(frameState)
  }
}

// import {
//   TileCache,
//   World,
//   Viewport,
//   WarpedMapEvent,
//   WarpedMapEventType,
//   composeTransform
// } from '@allmaps/render'

// import { WebGL2Renderer } from '@allmaps/render'

// import { OLWarpedMapEvent } from './OLWarpedMapEvent.js'

// import type { FrameState } from 'ol/Map.js'

// import type {
//   Size,
//   BBox,
//   Transform,
//   OptionalColor,
//   NeededTile
// } from '@allmaps/render'

// import type { WarpedMapSource } from './WarpedMapSource.js'

// // TODO: Move to stdlib?
// const THROTTLE_WAIT_MS = 500
// const THROTTLE_OPTIONS = {
//   leading: true,
//   trailing: true
// }

// export class WarpedMapLayer extends Layer {
//   source: WarpedMapSource | null = null

//   container: HTMLElement

//   canvas: HTMLCanvasElement | null = null
//   gl: WebGL2RenderingContext

//   canvasSize: [number, number] = [0, 0]

//   world: World
//   renderer: WebGL2Renderer
//   viewport: Viewport
//   tileCache: TileCache

//   // TODO: move to Viewport
//   // mapIdsInViewport: Set<string> = new Set()

//   throttledUpdateViewportAndGetTilesNeeded: DebouncedFunc<
//     typeof this.viewport.updateViewportAndGetTilesNeeded
//   >

//   private throttledRenderTimeoutId: number | undefined

//   private lastPreparedFrameLayerRevision = 0
//   private lastPreparedFrameSourceRevision = 0

//   private previousExtent: number[] | null = null

//   private resizeObserver: ResizeObserver

//   constructor(options: object) {
//     options = options || {}

//     super(options)

//     const container = document.createElement('div')
//     this.container = container

//     container.style.position = 'absolute'
//     container.style.width = '100%'
//     container.style.height = '100%'
//     container.classList.add('ol-layer')
//     container.classList.add('allmaps-warped-map-layer')
//     const canvas = document.createElement('canvas')

//     canvas.style.position = 'absolute'
//     canvas.style.left = '0'

//     canvas.style.width = '100%'
//     canvas.style.height = '100%'

//     container.appendChild(canvas)

//     const gl = canvas.getContext('webgl2', { premultipliedAlpha: true })

//     if (!gl) {
//       throw new Error('WebGL 2 not available')
//     }

//     this.resizeObserver = new ResizeObserver(this.onResize.bind(this))
//     this.resizeObserver.observe(canvas, { box: 'content-box' })

//     this.canvas = canvas
//     this.gl = gl

//     this.tileCache = new TileCache()
//     this.renderer = new WebGL2Renderer(gl, this.tileCache)

//     this.renderer.addEventListener(
//       WarpedMapEventType.CHANGED,
//       this.rendererChanged.bind(this)
//     )

//     this.source = this.getSource() as WarpedMapSource
//     // TODO: listen to change:source

//     this.world = this.source.getWorld()

//     this.world.addEventListener(
//       WarpedMapEventType.WARPEDMAPADDED,
//       this.warpedMapAdded.bind(this)
//     )

//     // this.world.addEventListener(
//     //   WarpedMapEventType.ZINDICESCHANGES,
//     //   this.zIndicesChanged.bind(this)
//     // )

//     this.world.addEventListener(
//       WarpedMapEventType.VISIBILITYCHANGED,
//       this.visibilityChanged.bind(this)
//     )

//     this.world.addEventListener(
//       WarpedMapEventType.TRANSFORMATIONCHANGED,
//       this.transformationChanged.bind(this)
//     )

//     this.world.addEventListener(
//       WarpedMapEventType.RESOURCEMASKUPDATED,
//       this.resourceMaskUpdated.bind(this)
//     )

//     this.world.addEventListener(
//       WarpedMapEventType.CLEARED,
//       this.worldCleared.bind(this)
//     )

//     this.tileCache.addEventListener(
//       WarpedMapEventType.TILELOADED,
//       this.changed.bind(this)
//     )

//     this.tileCache.addEventListener(
//       WarpedMapEventType.ALLTILESLOADED,
//       this.changed.bind(this)
//     )

//     this.viewport = new Viewport(this.world)

//     this.throttledUpdateViewportAndGetTilesNeeded = throttle(
//       this.viewport.updateViewportAndGetTilesNeeded.bind(this.viewport),
//       THROTTLE_WAIT_MS,
//       THROTTLE_OPTIONS
//     )

//     // this.viewport.addEventListener(
//     //   WarpedMapEventType.WARPEDMAPENTER,
//     //   this.warpedMapEnter.bind(this)
//     // )
//     // this.viewport.addEventListener(
//     //   WarpedMapEventType.WARPEDMAPLEAVE,
//     //   this.warpedMapLeave.bind(this)
//     // )

//     for (const warpedMap of this.world.getMaps()) {
//       this.renderer.addWarpedMap(warpedMap)
//     }
//   }

//   private arraysEqual<T>(arr1: Array<T> | null, arr2: Array<T> | null) {
//     if (!arr1 || !arr2) {
//       return false
//     }

//     const len1 = arr1.length
//     if (len1 !== arr2.length) {
//       return false
//     }
//     for (let i = 0; i < len1; i++) {
//       if (arr1[i] !== arr2[i]) {
//         return false
//       }
//     }
//     return true
//   }

//   private warpedMapAdded(event: Event) {
//     if (event instanceof WarpedMapEvent) {
//       const mapId = event.data as string

//       const warpedMap = this.world.getMap(mapId)

//       if (warpedMap) {
//         this.renderer.addWarpedMap(warpedMap)
//       }

//       const olEvent = new OLWarpedMapEvent(
//         WarpedMapEventType.WARPEDMAPADDED,
//         mapId
//       )
//       this.dispatchEvent(olEvent)
//     }

//     this.changed()
//   }

//   // private zIndicesChanged() {
//   //   const sortedMapIdsInViewport = [...this.mapIdsInViewport].sort(
//   //     (mapIdA, mapIdB) => {
//   //       const zIndexA = this.world.getZIndex(mapIdA)
//   //       const zIndexB = this.world.getZIndex(mapIdB)
//   //       if (zIndexA !== undefined && zIndexB !== undefined) {
//   //         return zIndexA - zIndexB
//   //       }

//   //       return 0
//   //     }
//   //   )

//   //   this.mapIdsInViewport = new Set(sortedMapIdsInViewport)
//   //   this.changed()
//   // }

//   private visibilityChanged() {
//     this.changed()
//   }

//   private transformationChanged(event: Event) {
//     if (event instanceof WarpedMapEvent) {
//       const mapIds = event.data as string[]
//       for (const mapId of mapIds) {
//         const warpedMap = this.world.getMap(mapId)

//         if (warpedMap) {
//           this.renderer.updateTriangulation(warpedMap, false)
//         }
//       }

//       this.renderer.startTransformationTransition()
//     }
//   }

//   private resourceMaskUpdated(event: Event) {
//     if (event instanceof WarpedMapEvent) {
//       const mapId = event.data as string
//       const warpedMap = this.world.getMap(mapId)

//       if (warpedMap) {
//         this.renderer.updateTriangulation(warpedMap)
//       }
//     }
//   }

//   // private warpedMapEnter(event: Event) {
//   //   if (event instanceof WarpedMapEvent) {
//   //     const mapId = event.data as string
//   //     this.mapIdsInViewport.add(mapId)
//   //     this.zIndicesChanged()
//   //   }
//   // }

//   // private warpedMapLeave(event: Event) {
//   //   if (event instanceof WarpedMapEvent) {
//   //     const mapId = event.data as string
//   //     this.mapIdsInViewport.delete(mapId)
//   //   }
//   // }

//   private worldCleared() {
//     this.renderer.clear()
//     this.tileCache.clear()
//   }

//   private rendererChanged() {
//     this.changed()
//   }

//   private onResize(entries: ResizeObserverEntry[]) {
//     // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
//     // TODO: read + understand https://web.dev/device-pixel-content-box/
//     for (const entry of entries) {
//       const width = entry.contentRect.width
//       const height = entry.contentRect.height
//       const dpr = window.devicePixelRatio

//       // if (entry.devicePixelContentBoxSize) {
//       //   // NOTE: Only this path gives the correct answer
//       //   // The other paths are imperfect fallbacks
//       //   // for browsers that don't provide anyway to do this
//       //   width = entry.devicePixelContentBoxSize[0].inlineSize
//       //   height = entry.devicePixelContentBoxSize[0].blockSize
//       //   dpr = 1 // it's already in width and height
//       // } else if (entry.contentBoxSize) {
//       //   if (entry.contentBoxSize[0]) {
//       //     width = entry.contentBoxSize[0].inlineSize
//       //     height = entry.contentBoxSize[0].blockSize
//       //   }
//       // }

//       const displayWidth = Math.round(width * dpr)
//       const displayHeight = Math.round(height * dpr)

//       this.canvasSize = [displayWidth, displayHeight]
//     }
//     this.changed()
//   }

//   resizeCanvas(canvas: HTMLCanvasElement, [width, height]: [number, number]) {
//     const needResize = canvas.width !== width || canvas.height !== height

//     if (needResize) {
//       canvas.width = width
//       canvas.height = height
//     }

//     return needResize
//   }

//   private hexToRgb(hex: string | undefined): OptionalColor {
//     if (!hex) {
//       return
//     }

//     const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
//     return result
//       ? [
//           parseInt(result[1], 16) / 256,
//           parseInt(result[2], 16) / 256,
//           parseInt(result[3], 16) / 256
//         ]
//       : undefined
//   }

//   setMapOpacity(mapId: string, opacity: number) {
//     this.renderer.setMapOpacity(mapId, opacity)
//     this.changed()
//   }

//   resetMapOpacity(mapId: string) {
//     this.renderer.resetMapOpacity(mapId)
//     this.changed()
//   }

//   setRemoveBackground(
//     options: Partial<{ hexColor: string; threshold: number; hardness: number }>
//   ) {
//     const color = this.hexToRgb(options.hexColor)

//     this.renderer.setRemoveBackground({
//       color,
//       threshold: options.threshold,
//       hardness: options.hardness
//     })
//     this.changed()
//   }

//   resetRemoveBackground() {
//     this.renderer.resetRemoveBackground()
//     this.changed()
//   }

//   setMapRemoveBackground(
//     mapId: string,

//     options: Partial<{ hexColor: string; threshold: number; hardness: number }>
//   ) {
//     const color = this.hexToRgb(options.hexColor)

//     this.renderer.setMapRemoveBackground(mapId, {
//       color,
//       threshold: options.threshold,
//       hardness: options.hardness
//     })
//     this.changed()
//   }

//   resetMapRemoveBackground(mapId: string) {
//     this.renderer.resetMapRemoveBackground(mapId)
//   }

//   setColorize(hexColor: string) {
//     const color = this.hexToRgb(hexColor)
//     if (color) {
//       this.renderer.setColorize({ color })
//       this.changed()
//     }
//   }

//   resetColorize() {
//     this.renderer.resetColorize()
//     this.changed()
//   }

//   setMapColorize(mapId: string, hexColor: string) {
//     const color = this.hexToRgb(hexColor)
//     if (color) {
//       this.renderer.setMapColorize(mapId, { color })
//       this.changed()
//     }
//   }

//   resetMapColorize(mapId: string) {
//     this.renderer.resetMapColorize(mapId)
//     this.changed()
//   }

//   dispose() {
//     this.renderer.dispose()

//     const extension = this.gl.getExtension('WEBGL_lose_context')
//     if (extension) {
//       extension.loseContext()
//     }
//     const canvas = this.gl.canvas
//     canvas.width = 1
//     canvas.height = 1

//     this.resizeObserver.disconnect()

//     // TODO: remove event listeners
//     //  - this.viewport
//     //  - this.tileCache
//     //  - this.world

//     this.tileCache.clear()

//     super.disposeInternal()
//   }

//   // TODO: use OL's own makeProjectionTransform function?
//   makeProjectionTransform(frameState: FrameState): Transform {
//     const size = frameState.size
//     const rotation = frameState.viewState.rotation
//     const resolution = frameState.viewState.resolution
//     const center = frameState.viewState.center

//     return composeTransform(
//       0,
//       0,
//       2 / (resolution * size[0]),
//       2 / (resolution * size[1]),
//       -rotation,
//       -center[0],
//       -center[1]
//     )
//   }

//   // TODO: Use OL's renderer class, move this function there?
//   private prepareFrameInternal(frameState: FrameState) {
//     const vectorSource = this.source
//     const viewNotMoving =
//       !frameState.viewHints[ViewHint.ANIMATING] &&
//       !frameState.viewHints[ViewHint.INTERACTING]
//     const extentChanged = !this.arraysEqual(
//       this.previousExtent,
//       frameState.extent
//     )

//     let sourceChanged = false
//     if (vectorSource) {
//       sourceChanged =
//         this.lastPreparedFrameSourceRevision < vectorSource.getRevision()

//       if (sourceChanged) {
//         this.lastPreparedFrameSourceRevision = vectorSource.getRevision()
//       }
//     }

//     const layerChanged =
//       this.lastPreparedFrameLayerRevision < this.getRevision()

//     if (layerChanged) {
//       this.lastPreparedFrameLayerRevision = this.getRevision()
//     }

//     if (layerChanged || (viewNotMoving && (extentChanged || sourceChanged))) {
//       this.previousExtent = frameState.extent?.slice() || null

//       this.renderer.updateVertexBuffers(this.viewport)

//       // this.renderer.updateVertexBuffers(
//       //   projectionTransform,
//       //   this.mapIdsInViewport.values()
//       // )
//     }
//   }

//   private renderInternal(frameState: FrameState, last = false): HTMLElement {
//     const projectionTransform = this.makeProjectionTransform(frameState)
//     this.viewport.setProjectionTransform(projectionTransform)

//     this.prepareFrameInternal(frameState)

//     if (frameState.extent) {
//       const extent = frameState.extent as BBox

//       this.renderer.setOpacity(this.getOpacity())

//       const viewportSize = [
//         frameState.size[0] * window.devicePixelRatio,
//         frameState.size[1] * window.devicePixelRatio
//       ] as Size

//       let tilesNeeded: NeededTile[] | undefined
//       if (last) {
//         tilesNeeded = this.viewport.updateViewportAndGetTilesNeeded(
//           viewportSize,
//           extent,
//           frameState.coordinateToPixelTransform as Transform
//         )
//       } else {
//         tilesNeeded = this.throttledUpdateViewportAndGetTilesNeeded(
//           viewportSize,
//           extent,
//           frameState.coordinateToPixelTransform as Transform
//         )
//       }

//       if (tilesNeeded && tilesNeeded.length) {
//         this.tileCache.setTiles(tilesNeeded)
//       }

//       // TODO: reset maps not in viewport, make sure these only
//       // get drawn when they are visible AND when they have their buffers
//       // updated.
//       this.renderer.render(this.viewport)
//     }

//     return this.container
//   }

//   render(frameState: FrameState): HTMLElement {
//     if (this.throttledRenderTimeoutId) {
//       clearTimeout(this.throttledRenderTimeoutId)
//     }

//     if (this.canvas) {
//       this.resizeCanvas(this.canvas, this.canvasSize)
//     }

//     this.throttledRenderTimeoutId = setTimeout(() => {
//       this.renderInternal(frameState, true)
//     }, THROTTLE_WAIT_MS)

//     return this.renderInternal(frameState)
//   }
// }
