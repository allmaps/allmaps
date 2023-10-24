import TileCache from './TileCache.js'
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
  transformToMatrix4
} from './shared/matrix.js'

import type Viewport from './Viewport.js'

import type {
  WarpedMap,
  RenderOptions,
  RemoveBackgroundOptions,
  ColorizeOptions
} from './shared/types.js'
import type { Transform } from '@allmaps/types'

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1
const DEFAULT_REMOVE_BACKGROUND_THRESHOLD = 0
const DEFAULT_REMOVE_BACKGROUND_HARDNESS = 0.7

export default class WebGL2Renderer extends EventTarget {
  tileCache: TileCache

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

  constructor(gl: WebGL2RenderingContext, tileCache: TileCache) {
    super()

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

    this.invertedRenderTransform = createTransform()
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

  addWarpedMap(warpedMap: WarpedMap) {
    const webglWarpedMap = new WebGL2WarpedMap(this.gl, this.program, warpedMap)
    this.webGLWarpedMapsById.set(warpedMap.mapId, webglWarpedMap)
  }

  removeWarpedMap(mapId: string) {
    this.webGLWarpedMapsById.delete(mapId)
  }

  clear() {
    this.webGLWarpedMapsById = new Map()
    this.viewport?.clear()
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

  updateVertexBuffers(viewport: Viewport) {
    const projectionTransform = viewport.getProjectionTransform()

    this.invertedRenderTransform = invertTransform(projectionTransform)

    for (const mapId of viewport.visibleWarpedMapIds) {
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

    const projectionTransform = this.viewport.getProjectionTransform()
    const mapIds = this.viewport.getVisibleWarpedMapIds()

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
      const bestZoomLevel = this.viewport.bestZoomLevelByMapId.get(mapId)
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

  render(viewport: Viewport): void {
    this.viewport = viewport

    this.renderInternal()
  }
}
