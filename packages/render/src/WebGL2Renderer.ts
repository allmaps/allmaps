import { throttle, debounce, type DebouncedFunc } from 'lodash-es'

import TileCache from './TileCache.js'
import WarpedMap, { hasImageInfo } from './WarpedMap.js'
import WarpedMapList from './WarpedMapList.js'
import WebGL2WarpedMap from './WebGL2WarpedMap.js'

import { createShader, createProgram } from './shared/webgl2.js'

import vertexShaderSource from './shaders/vertex-shader.glsl?raw'
import fragmentShaderSource from './shaders/fragment-shader.glsl?raw'

import {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapTileEventDetail
} from './shared/events.js'
import {
  createTransform,
  multiplyTransform,
  invertTransform,
  transformToMatrix4,
  applyTransform
} from './shared/matrix.js'
import {
  getProjectedGeoBboxResourcePolygon,
  getBestZoomLevel,
  computeIiifTilesForPolygonAndZoomLevel
} from './shared/tiles.js'

import type Viewport from './Viewport.js'

import type {
  RenderOptions,
  RemoveBackgroundOptions,
  ColorizeOptions
} from './shared/types.js'
import type {
  Point,
  Transform,
  NeededTile,
  TileZoomLevel
} from '@allmaps/types'

const THROTTLE_WAIT_MS = 50
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}
const DEBOUNCE_WAIT_MS = 100
const DEBOUNCE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1
const DEFAULT_REMOVE_BACKGROUND_THRESHOLD = 0
const DEFAULT_REMOVE_BACKGROUND_HARDNESS = 0.7
const MIN_COMBINED_PIXEL_SIZE = 5

export default class WebGL2Renderer extends EventTarget {
  tileCache: TileCache

  warpedMapList: WarpedMapList
  visibleWarpedMapIds: Set<string> = new Set()
  bestZoomLevelByMapId: Map<string, TileZoomLevel> = new Map()

  gl: WebGL2RenderingContext
  program: WebGLProgram

  webGLWarpedMapsById: Map<string, WebGL2WarpedMap> = new Map()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  // TODO: move to Viewport?
  invertedRenderTransform: Transform

  viewport: Viewport | undefined

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  transformationTransitionDuration = 750
  animationProgress = 1

  throttledPrepareRender: DebouncedFunc<typeof this.prepareRender>
  debouncedRenderInternal: DebouncedFunc<typeof this.prepareRender>

  constructor(
    warpedMapList: WarpedMapList,
    gl: WebGL2RenderingContext,
    tileCache: TileCache
  ) {
    super()

    this.warpedMapList = warpedMapList

    this.gl = gl

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    )

    this.program = createProgram(gl, vertexShader, fragmentShader)

    gl.disable(gl.DEPTH_TEST)

    this.tileCache = tileCache

    this.tileCache.addEventListener(
      WarpedMapEventType.TILELOADED,
      this.tileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILEREMOVED,
      this.tileRemoved.bind(this)
    )

    this.addEventListener(
      WarpedMapEventType.IMAGEINFONEEDED,
      this.imageInfoNeeded.bind(this)
    )

    this.invertedRenderTransform = createTransform()

    this.throttledPrepareRender = throttle(
      this.prepareRender.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )

    this.debouncedRenderInternal = debounce(
      this.renderInternal.bind(this),
      DEBOUNCE_WAIT_MS,
      DEBOUNCE_OPTIONS
    )
  }

  /**
   * Returns the mapIds of the warped maps that are visible in the viewport, sorted by z-index
   * @returns {Iterable<string>}
   */
  getVisibleWarpedMapIds() {
    const sortedVisibleWarpedMapIds = [...this.visibleWarpedMapIds].sort(
      (mapIdA, mapIdB) => {
        const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
        const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }

        return 0
      }
    )

    return sortedVisibleWarpedMapIds
  }

  getTilesNeeded(): NeededTile[] {
    if (!this.viewport) {
      return []
    }

    // TODO: rename visibleWarpedMapIds because not filtering on visible or on bbox

    let possibleVisibleWarpedMapIds: Iterable<string> = []
    const possibleInvisibleWarpedMapIds = new Set(this.visibleWarpedMapIds)

    // TODO: change to geoBbox if we make RTree store geoBbox instead of projectedGeoBbox
    possibleVisibleWarpedMapIds = this.warpedMapList.getMapsByBbox(
      this.viewport.projectedGeoBbox
    )

    const neededTiles: NeededTile[] = []
    for (const mapId of possibleVisibleWarpedMapIds) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      // Don't show maps when they're too small
      const topLeft: Point = [
        warpedMap.projectedGeoMaskBbox[0],
        warpedMap.projectedGeoMaskBbox[1]
      ]
      const bottomRight: Point = [
        warpedMap.projectedGeoMaskBbox[2],
        warpedMap.projectedGeoMaskBbox[3]
      ]

      const pixelTopLeft = applyTransform(
        this.viewport.coordinateToPixelTransform,
        topLeft
      )
      const pixelBottomRight = applyTransform(
        this.viewport.coordinateToPixelTransform,
        bottomRight
      )

      const pixelWidth = Math.abs(pixelBottomRight[0] - pixelTopLeft[0])
      const pixelHeight = Math.abs(pixelTopLeft[1] - pixelBottomRight[1])

      // Only draw maps that are larger than MIN_COMBINED_PIXEL_SIZE pixels
      // in combined width and height
      if (pixelWidth + pixelHeight < MIN_COMBINED_PIXEL_SIZE) {
        continue
      }

      // TODO: move this funtion to WarpedMap, and store result
      const projectedGeoBboxResourcePolygon =
        getProjectedGeoBboxResourcePolygon(
          warpedMap.projectedTransformer,
          this.viewport.projectedGeoBbox
        )

      if (!hasImageInfo(warpedMap)) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.IMAGEINFONEEDED, mapId)
        )
        continue
      }

      const zoomLevel = getBestZoomLevel(
        warpedMap.parsedImage,
        this.viewport.canvasSize,
        projectedGeoBboxResourcePolygon
      )

      // TODO: remove maps from this list when they're removed from WarpedMapList
      // or not visible anymore
      this.bestZoomLevelByMapId.set(mapId, zoomLevel)

      // TODO: rename function
      const tiles = computeIiifTilesForPolygonAndZoomLevel(
        warpedMap.parsedImage,
        projectedGeoBboxResourcePolygon,
        zoomLevel
      )

      if (tiles.length) {
        if (!this.visibleWarpedMapIds.has(mapId)) {
          this.visibleWarpedMapIds.add(mapId)
          this.dispatchEvent(
            new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
          )
        }

        possibleInvisibleWarpedMapIds.delete(mapId)

        for (const tile of tiles) {
          const imageRequest = warpedMap.parsedImage.getIiifTile(
            tile.zoomLevel,
            tile.column,
            tile.row
          )
          const url = warpedMap.parsedImage.getImageUrl(imageRequest)

          neededTiles.push({
            mapId,
            tile,
            imageRequest,
            url
          })
        }
      }
    }

    for (const mapId of possibleInvisibleWarpedMapIds) {
      if (this.visibleWarpedMapIds.has(mapId)) {
        this.visibleWarpedMapIds.delete(mapId)
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
        )
      }
    }

    return neededTiles
  }

  tileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail

      const cachedTile = this.tileCache.getCachedTile(tileUrl)

      if (!cachedTile) {
        return
      }

      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        return
      }

      webglWarpedMap.addCachedTile(tileUrl, cachedTile)
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    }
  }

  tileRemoved(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail

      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        return
      }

      webglWarpedMap.removeCachedTile(tileUrl)
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    }
  }

  async imageInfoNeeded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string

      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        return
      }

      const warpedMap = webglWarpedMap.warpedMap

      await warpedMap.completeImageInfo()

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    }
  }

  addWarpedMap(warpedMap: WarpedMap) {
    const webglWarpedMap = new WebGL2WarpedMap(this.gl, this.program, warpedMap)
    this.webGLWarpedMapsById.set(warpedMap.mapId, webglWarpedMap)
  }

  removeWarpedMap(mapId: string) {
    this.webGLWarpedMapsById.delete(mapId)
  }

  clear() {
    this.webGLWarpedMapsById = new Map()
    this.visibleWarpedMapIds = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
  }

  updateTriangulation(warpedMap: WarpedMap, immediately?: boolean) {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(warpedMap.mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.updateTriangulation(warpedMap, immediately)
    }
  }

  private transformationTransitionFrame(now: number) {
    if (!this.transformationTransitionStart) {
      this.transformationTransitionStart = now
    }

    if (
      now - this.transformationTransitionStart >
      this.transformationTransitionDuration
    ) {
      for (const webGLWarpedMap of this.webGLWarpedMapsById.values()) {
        webGLWarpedMap.resetCurrentTriangles()
      }

      this.animating = false
      this.animationProgress = 0

      this.transformationTransitionStart = undefined
    } else {
      this.animationProgress =
        (now - this.transformationTransitionStart) /
        this.transformationTransitionDuration

      this.renderInternal()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        this.transformationTransitionFrame.bind(this)
      )
    }
  }

  startTransformationTransition() {
    if (this.lastAnimationFrameRequestId !== undefined) {
      cancelAnimationFrame(this.lastAnimationFrameRequestId)
    }

    this.animating = true
    // this.animationProgress = 0
    this.transformationTransitionStart = undefined
    this.lastAnimationFrameRequestId = requestAnimationFrame(
      this.transformationTransitionFrame.bind(this)
    )
  }

  getOpacity(): number | undefined {
    return this.opacity
  }

  setOpacity(opacity: number): void {
    this.opacity = opacity
  }

  resetOpacity(): void {
    this.opacity = DEFAULT_OPACITY
  }

  getMapOpacity(mapId: string): number | undefined {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)

    if (webGLWarpedMap) {
      return webGLWarpedMap.opacity
    }
  }

  setMapOpacity(mapId: string, opacity: number): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.opacity = Math.min(Math.max(opacity, 0), 1)
    }
  }

  resetMapOpacity(mapId: string): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.opacity = DEFAULT_OPACITY
    }
  }

  getRemoveBackground(): Partial<RemoveBackgroundOptions> | undefined {
    return this.renderOptions.removeBackground
  }

  setRemoveBackground(removeBackgroundOptions: RemoveBackgroundOptions) {
    this.renderOptions.removeBackground = removeBackgroundOptions
  }

  resetRemoveBackground() {
    this.renderOptions.removeBackground = undefined
  }

  getMapRemoveBackground(
    mapId: string
  ): Partial<RemoveBackgroundOptions> | undefined {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      return webGLWarpedMap.renderOptions.removeBackground
    }
  }

  setMapRemoveBackground(
    mapId: string,
    removeBackgroundOptions: RemoveBackgroundOptions
  ): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.renderOptions.removeBackground = removeBackgroundOptions
    }
  }

  resetMapRemoveBackground(mapId: string): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.renderOptions.removeBackground = undefined
    }
  }

  getColorize(): Partial<ColorizeOptions> | undefined {
    return this.renderOptions.colorize
  }

  setColorize(colorizeOptions: ColorizeOptions): void {
    this.renderOptions.colorize = colorizeOptions
  }

  resetColorize(): void {
    this.renderOptions.colorize = undefined
  }

  getMapColorize(mapId: string): Partial<ColorizeOptions> | undefined {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      return webGLWarpedMap.renderOptions.colorize
    }
  }

  setMapColorize(mapId: string, colorizeOptions: ColorizeOptions): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.renderOptions.colorize = colorizeOptions
    }
  }

  resetMapColorize(mapId: string): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.renderOptions.colorize = undefined
    }
  }

  /**
   * Set the saturation of the all warped maps
   * @param saturation 0 - grayscale, 1 - original colors
   */
  setSaturation(saturation: number): void {
    this.saturation = saturation
  }

  resetSaturation(): void {
    this.saturation = DEFAULT_SATURATION
  }

  /**
   * Set the saturation of a single warped map
   * @param mapId the ID of the warped map
   * @param saturation 0 - grayscale, 1 - original colors
   */
  setMapSaturation(mapId: string, saturation: number): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.saturation = saturation
    }
  }

  resetMapSaturation(mapId: string): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.saturation = DEFAULT_SATURATION
    }
  }

  max(
    number1: number | undefined,
    number2: number | undefined
  ): number | undefined {
    if (number1 !== undefined && number2 !== undefined) {
      return Math.max(number1, number2)
    } else if (number1 !== undefined) {
      return number1
    } else if (number2 !== undefined) {
      return number2
    }
  }

  setRenderOptionsUniforms(
    layerRenderOptions: RenderOptions,
    mapRenderOptions: RenderOptions
  ) {
    const gl = this.gl

    const renderOptions: RenderOptions = {
      removeBackground: {
        color:
          mapRenderOptions.removeBackground?.color ||
          layerRenderOptions.removeBackground?.color,
        hardness: this.max(
          mapRenderOptions.removeBackground?.hardness,
          layerRenderOptions.removeBackground?.hardness
        ),
        threshold: this.max(
          mapRenderOptions.removeBackground?.threshold,
          layerRenderOptions.removeBackground?.threshold
        )
      },
      colorize: {
        ...layerRenderOptions.colorize,
        ...mapRenderOptions.colorize
      }
    }

    // Remove background color
    const removeBackgroundColor = renderOptions.removeBackground?.color

    const removeBackgroundColorLocation = gl.getUniformLocation(
      this.program,
      'u_removeBackgroundColor'
    )
    gl.uniform1f(removeBackgroundColorLocation, removeBackgroundColor ? 1 : 0)

    if (removeBackgroundColor) {
      const backgroundColorLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColor'
      )
      gl.uniform3fv(backgroundColorLocation, removeBackgroundColor)

      const backgroundColorThresholdLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColorThreshold'
      )

      gl.uniform1f(
        backgroundColorThresholdLocation,
        renderOptions.removeBackground?.threshold ||
          DEFAULT_REMOVE_BACKGROUND_THRESHOLD
      )

      const backgroundColorHardnessLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColorHardness'
      )
      gl.uniform1f(
        backgroundColorHardnessLocation,
        renderOptions.removeBackground?.hardness ||
          DEFAULT_REMOVE_BACKGROUND_HARDNESS
      )
    }

    // Colorize
    const colorizeColor = renderOptions.colorize?.color

    const colorizeLocation = gl.getUniformLocation(this.program, 'u_colorize')
    gl.uniform1f(colorizeLocation, colorizeColor ? 1 : 0)

    if (colorizeColor) {
      const colorizeColorLocation = gl.getUniformLocation(
        this.program,
        'u_colorizeColor'
      )
      gl.uniform3fv(colorizeColorLocation, colorizeColor)
    }
  }

  updateVertexBuffers() {
    if (!this.viewport) {
      return
    }

    const projectionTransform = this.viewport.projectionTransform

    this.invertedRenderTransform = invertTransform(projectionTransform)

    for (const mapId of this.visibleWarpedMapIds) {
      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        break
      }

      webglWarpedMap.updateVertexBuffers(projectionTransform)
    }
  }

  private renderInternal(): void {
    if (!this.viewport) {
      return
    }

    const projectionTransform = this.viewport.projectionTransform
    const mapIds = this.getVisibleWarpedMapIds()

    if (!projectionTransform) {
      return
    }

    const renderTransform = multiplyTransform(
      projectionTransform,
      this.invertedRenderTransform
    )

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.program)

    const projectionMatrixLocation = gl.getUniformLocation(
      this.program,
      'u_projectionMatrix'
    )
    gl.uniformMatrix4fv(
      projectionMatrixLocation,
      false,
      transformToMatrix4(renderTransform)
    )

    const animationProgressLocation = gl.getUniformLocation(
      this.program,
      'u_animation_progress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    for (const mapId of mapIds) {
      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        continue
      }

      // TODO: we can also exclude hidden maps earlier, in RTree or before
      // passing mapIds to render function
      if (!webglWarpedMap.warpedMap.visible) {
        continue
      }

      this.setRenderOptionsUniforms(
        this.renderOptions,
        webglWarpedMap.renderOptions
      )

      const bestScaleFactorLocation = gl.getUniformLocation(
        this.program,
        'u_bestScaleFactor'
      )
      // TODO: make proper getter for bestScaleFactor for mapId
      const bestZoomLevel = this.bestZoomLevelByMapId.get(mapId)
      const bestScaleFactor = bestZoomLevel?.scaleFactor || 1
      gl.uniform1i(bestScaleFactorLocation, bestScaleFactor)

      const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.opacity * webglWarpedMap.opacity)

      const saturationLocation = gl.getUniformLocation(
        this.program,
        'u_saturation'
      )
      gl.uniform1f(
        saturationLocation,
        this.saturation * webglWarpedMap.saturation
      )

      const u_tilesTextureLocation = gl.getUniformLocation(
        this.program,
        'u_tilesTexture'
      )
      gl.uniform1i(u_tilesTextureLocation, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, webglWarpedMap.tilesTexture)

      const u_tilePositionsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_tilePositionsTexture'
      )
      gl.uniform1i(u_tilePositionsTextureLocation, 1)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, webglWarpedMap.tilePositionsTexture)

      const u_imagePositionsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_imagePositionsTexture'
      )
      gl.uniform1i(u_imagePositionsTextureLocation, 2)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, webglWarpedMap.imagePositionsTexture)

      const u_scaleFactorsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_scaleFactorsTexture'
      )
      gl.uniform1i(u_scaleFactorsTextureLocation, 3)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, webglWarpedMap.scaleFactorsTexture)

      const vao = webglWarpedMap.vao
      const triangles = webglWarpedMap.currentGeoMaskTriangles
      const count = triangles.length / 2

      const primitiveType = this.gl.TRIANGLES
      const offset = 0

      gl.bindVertexArray(vao)
      gl.drawArrays(primitiveType, offset, count)
    }
  }

  dispose() {
    for (const warpedMapWebGLRenderer of this.webGLWarpedMapsById.values()) {
      warpedMapWebGLRenderer.dispose()
    }

    // TODO: remove vertexShader, fragmentShader, program
    // TODO: remove event listeners
    //  - this.tileCache
  }

  // TODO: maybe this function can be included in the render call.
  setViewport(viewport: Viewport) {
    this.viewport = viewport
  }

  prepareRender(): void {
    // TODO: reset maps not in viewport, make sure these only
    // get drawn when they are visible AND when they have their buffers
    // updated.
    this.updateVertexBuffers()
    const tilesNeeded = this.getTilesNeeded()
    // TODO: inclide this if setTiles
    if (tilesNeeded && tilesNeeded.length) {
      this.tileCache.setTiles(tilesNeeded)
    }
    console.log('rendering')
  }

  render(): void {
    this.throttledPrepareRender()
    this.renderInternal()
    this.debouncedRenderInternal()
  }
}
