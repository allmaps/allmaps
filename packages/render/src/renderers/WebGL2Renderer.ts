import { throttle } from 'lodash-es'

import BaseRenderer from './BaseRenderer.js'
import WebGL2WarpedMap, {
  createWebGL2WarpedMapFactory
} from '../maps/WebGL2WarpedMap.js'
import CacheableImageBitmapTile from '../tilecache/CacheableImageBitmapTile.js'
import { distance, maxOfNumberOrUndefined } from '@allmaps/stdlib'
import { supportedDistortionMeasures } from '@allmaps/transform'

import {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapTileEventDetail
} from '../shared/events.js'
import {
  createTransform,
  multiplyTransform,
  invertTransform,
  transformToMatrix4
} from '../shared/matrix.js'
import { createShader, createProgram } from '../shared/webgl2.js'

import vertexShaderSource from '../shaders/vertex-shader.glsl'
import fragmentShaderSource from '../shaders/fragment-shader.glsl'

import type { DebouncedFunc } from 'lodash-es'

import type { Transform } from '@allmaps/types'

import type Viewport from '../viewport/Viewport.js'

import type {
  Renderer,
  RenderOptions,
  RemoveColorOptions,
  ColorizeOptions,
  GridOptions,
  WebGL2RendererOptions
} from '../shared/types.js'

const THROTTLE_PREPARE_WAIT_MS = 200
const THROTTLE_PREPARE_OPTIONS = {
  leading: true,
  trailing: true
}

const THROTTLE_CHANGED_WAIT_MS = 50
const THROTTLE_CHANGED_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1
const DEFAULT_REMOVE_COLOR_THRESHOLD = 0
const DEFAULT_REMOVE_COLOR_HARDNESS = 0.7
const SIGNIFICANT_VIEWPORT_DISTANCE = 5
const ANIMATION_DURATION = 750

/**
 * Class that renders WarpedMaps to a WebGL 2 context
 *
 * @export
 * @class WebGL2Renderer
 * @typedef {WebGL2Renderer}
 * @extends {BaseRenderer}
 */
export default class WebGL2Renderer
  extends BaseRenderer<WebGL2WarpedMap, ImageBitmap>
  implements Renderer
{
  gl: WebGL2RenderingContext
  program: WebGLProgram

  previousSignificantViewport: Viewport | undefined

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  invertedRenderTransform: Transform

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  animationProgress = 1

  disableRender = false

  private throttledPrepareRenderInternal: DebouncedFunc<
    typeof this.prepareRenderInternal
  >

  private throttledChanged: DebouncedFunc<typeof this.changed>

  /**
   * Creates an instance of WebGL2Renderer.
   *
   * @constructor
   * @param {WebGL2RenderingContext} gl - WebGL 2 rendering context
   * @param {WebGL2RendererOptions} options - options
   */
  constructor(
    gl: WebGL2RenderingContext,
    options?: Partial<WebGL2RendererOptions>
  ) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    )

    const program = createProgram(gl, vertexShader, fragmentShader)

    super(
      CacheableImageBitmapTile.createFactory(),
      createWebGL2WarpedMapFactory(gl, program),
      options
    )

    this.gl = gl
    this.program = program

    gl.disable(gl.DEPTH_TEST)

    this.invertedRenderTransform = createTransform()

    this.addEventListeners()

    this.throttledPrepareRenderInternal = throttle(
      this.prepareRenderInternal.bind(this),
      THROTTLE_PREPARE_WAIT_MS,
      THROTTLE_PREPARE_OPTIONS
    )

    this.throttledChanged = throttle(
      this.changed.bind(this),
      THROTTLE_CHANGED_WAIT_MS,
      THROTTLE_CHANGED_OPTIONS
    )
  }

  initializeWebGL(gl: WebGL2RenderingContext) {
    // This code is duplicated from the constructor to allow for context loss and restoration
    // Can't call this function in the constructor, because 'super' must be called before accessing 'this'
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    )

    const program = createProgram(gl, vertexShader, fragmentShader)

    this.gl = gl
    this.program = program

    gl.disable(gl.DEPTH_TEST)

    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      warpedMap.initializeWebGL(program)
    }
  }

  /**
   * Get the opacity of the renderer
   *
   * @returns {(number | undefined)}
   */
  getOpacity(): number | undefined {
    return this.opacity
  }

  /**
   * Set the opacity of the renderer
   *
   * @param {number} opacity - opacity to set
   */
  setOpacity(opacity: number): void {
    this.opacity = opacity
  }

  /**
   * Reset the opacity of the renderer
   */
  resetOpacity(): void {
    this.opacity = DEFAULT_OPACITY
  }

  /**
   * Get the opacity of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(number | undefined)}
   */
  getMapOpacity(mapId: string): number | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)

    if (warpedMap) {
      return warpedMap.opacity
    }
  }

  /**
   * Set the opacity of a map
   *
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity to set
   */
  setMapOpacity(mapId: string, opacity: number): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.opacity = Math.min(Math.max(opacity, 0), 1)
    }
  }

  /**
   * Rreset the opacity of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.opacity = DEFAULT_OPACITY
    }
  }

  /**
   * Get the remove color options of the renderer
   *
   * @returns {(Partial<RemoveColorOptions> | undefined)}
   */
  getRemoveColorOptions(): Partial<RemoveColorOptions> | undefined {
    return this.renderOptions.removeColorOptions
  }

  /**
   * Set the remove color options of the renderer
   *
   * @param {RemoveColorOptions} removeColorOptions
   */
  setRemoveColorOptions(removeColorOptions: RemoveColorOptions) {
    this.renderOptions.removeColorOptions = removeColorOptions
  }

  /**
   * Reset the remove color options of the renderer
   */
  resetRemoveColorOptions() {
    this.renderOptions.removeColorOptions = undefined
  }

  /**
   * Get the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<RemoveColorOptions> | undefined)}
   */
  getMapRemoveColorOptions(
    mapId: string
  ): Partial<RemoveColorOptions> | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      return warpedMap.renderOptions.removeColorOptions
    }
  }

  /**
   * Set the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {RemoveColorOptions} removeColorOptions - the 'remove color options' to set
   */
  setMapRemoveColorOptions(
    mapId: string,
    removeColorOptions: RemoveColorOptions
  ): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.removeColorOptions = removeColorOptions
    }
  }

  /**
   * Reset the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColorOptions(mapId: string): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.removeColorOptions = undefined
    }
  }

  /**
   * Get the colorize options of the renderer
   *
   * @returns {(Partial<ColorizeOptions> | undefined)}
   */
  getColorizeOptions(): Partial<ColorizeOptions> | undefined {
    return this.renderOptions.colorizeOptions
  }

  /**
   * Set the colorize options of the renderer
   *
   * @param {ColorizeOptions} colorizeOptions - the colorize options to set
   */
  setColorizeOptions(colorizeOptions: ColorizeOptions): void {
    this.renderOptions.colorizeOptions = colorizeOptions
  }

  /**
   * Reset the colorize options of the renderer
   */
  resetColorizeOptions(): void {
    this.renderOptions.colorizeOptions = undefined
  }

  /**
   * Get the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<ColorizeOptions> | undefined)}
   */
  getMapColorizeOptions(mapId: string): Partial<ColorizeOptions> | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      return warpedMap.renderOptions.colorizeOptions
    }
  }

  /**
   * Set the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {ColorizeOptions} colorizeOptions - the colorize options to set
   */
  setMapColorizeOptions(mapId: string, colorizeOptions: ColorizeOptions): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.colorizeOptions = colorizeOptions
    }
  }

  /**
   * Reset the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapColorizeOptions(mapId: string): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.colorizeOptions = undefined
    }
  }

  /**
   * Get the grid options of the renderer
   *
   * @returns {(Partial<GridOptions> | undefined)}
   */
  getGridOptions(): Partial<GridOptions> | undefined {
    return this.renderOptions.gridOptions
  }

  /**
   * Set the grid options of the renderer
   *
   * @param {GridOptions} gridOptions - the grid options to set
   */
  setGridOptions(gridOptions: GridOptions): void {
    this.renderOptions.gridOptions = gridOptions
  }

  /**
   * Reset the grid options of the renderer
   */
  resetGridOptions(): void {
    this.renderOptions.gridOptions = undefined
  }

  /**
   * Get the grid options of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(Partial<GridOptions> | undefined)}
   */
  getMapGridOptions(mapId: string): Partial<GridOptions> | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      return warpedMap.renderOptions.gridOptions
    }
  }

  /**
   * Set the grid options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {GridOptions} gridOptions - the grid options to set
   */
  setMapGridOptions(mapId: string, gridOptions: GridOptions): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.gridOptions = gridOptions
    }
  }

  /**
   * Reset the grid options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapGridOptions(mapId: string): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.renderOptions.gridOptions = undefined
    }
  }

  /**
   * Get the saturation of the renderer
   *
   * @returns {number}
   */
  getSaturation(): number {
    return this.saturation
  }

  /**
   * Set the saturation of the renderer
   *
   * 0 - grayscale, 1 - original colors
   *
   * @param saturation - the satuation to set
   */
  setSaturation(saturation: number): void {
    this.saturation = saturation
  }

  /**
   * Reset the satuation of the renderer
   */
  resetSaturation(): void {
    this.saturation = DEFAULT_SATURATION
  }

  /**
   * Get the saturation of a map
   *
   * @param {string} mapId - ID of the map
   * @returns {(number | undefined)}
   */
  getMapSaturation(mapId: string): number | undefined {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      return warpedMap.saturation
    }
  }

  /**
   * Set the saturation of a map
   *
   * 0 - grayscale, 1 - original colors
   *
   * @param mapId - ID of the map
   * @param saturation - the saturation to set
   */
  setMapSaturation(mapId: string, saturation: number): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.saturation = saturation
    }
  }

  /**
   * Reset the saturation of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string): void {
    const warpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (warpedMap) {
      warpedMap.saturation = DEFAULT_SATURATION
    }
  }

  /**
   * Render the map for a given viewport
   *
   * @param {Viewport} viewport - the current viewport
   */
  render(viewport: Viewport): void {
    if (this.disableRender) {
      return
    }

    this.viewport = viewport

    // Not awaiting this, using events to trigger new render calls
    this.loadMissingImageInfosInViewport()

    // Don't fire throttled function unless it could result in something
    // Otherwise we have to wait for that cycle to finish before useful cycle can be started
    if (this.someImageInfosInViewport()) {
      this.throttledPrepareRenderInternal()
    }

    this.renderInternal()
  }

  clear() {
    this.warpedMapList.clear()
    this.mapsInViewport = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  cancelThrottledFunctions() {
    this.throttledPrepareRenderInternal.cancel()
    this.throttledChanged.cancel()
  }

  destroy() {
    this.cancelThrottledFunctions()

    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      this.removeEventListenersFromWebGL2WarpedMap(warpedMap)
    }

    this.removeEventListeners()

    super.destroy()

    this.gl.deleteProgram(this.program)
  }

  private prepareRenderInternal(): void {
    this.updateRequestedTiles()
    this.updateVertexBuffers()
  }

  protected shouldUpdateRequestedTiles(): boolean {
    // Returns whether requested tiles should be updated

    // Returns true when the viewport moved significantly
    // > to prevent updating requested tiles on minimal movements/
    // Returns true when the viewport didn't move at all
    // > since this function is called (possibly multiple times) during startup, without changes to the viewport
    // Returns false in other cases

    // TODO: this could be a problem if the viewport is quickly and continously moved
    // within the tolerance during initial loading.
    // Possible solution: adding a 'allrendered' event and listening to it.

    if (!this.viewport) {
      return false
    }
    if (this.animating) {
      return false
    }
    if (!this.previousSignificantViewport) {
      this.previousSignificantViewport = this.viewport
      return true
    } else {
      const rectangleDistances = []
      for (let i = 0; i < 4; i++) {
        rectangleDistances.push(
          distance(
            this.previousSignificantViewport.projectedGeoRectangle[i],
            this.viewport.projectedGeoRectangle[i]
          ) / this.viewport.projectedGeoPerViewportScale
        )
      }
      const dist = Math.max(...rectangleDistances)
      if (dist === 0) {
        return true
      }
      if (dist > SIGNIFICANT_VIEWPORT_DISTANCE) {
        this.previousSignificantViewport = this.viewport
        return true
      } else {
        return false
      }
    }
  }

  private updateVertexBuffers() {
    if (!this.viewport) {
      return
    }

    this.invertedRenderTransform = invertTransform(
      this.viewport.projectedGeoToClipTransform
    )

    for (const mapId of this.possibleMapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!warpedMap) {
        break
      }

      warpedMap.updateVertexBuffers(this.viewport.projectedGeoToClipTransform)
    }
  }

  private renderInternal(): void {
    if (!this.viewport) {
      return
    }

    // renderTransform is the product of:
    // - the viewport's projectedGeoToClipTransform (projected geo coordinates -> clip coordinates)
    // - the saved invertedRenderTransform (projected clip coordinates -> geo coordinates)
    // since updateVertexBuffers ('where to draw triangles') run with possibly a different Viewport then renderInternal ('drawing the triangles'), a difference caused by throttling, there needs to be an adjustment.
    // this adjustment is minimal: indeed, since invertedRenderTransform is set as the inverse of the viewport's projectedGeoToClipTransform in updateVertexBuffers()
    // this renderTransform is almost the identity transform [1, 0, 0, 1, 0, 0].
    const renderTransform = multiplyTransform(
      this.viewport.projectedGeoToClipTransform,
      this.invertedRenderTransform
    )

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.program)

    // Global uniforms

    // Render transform

    const renderTransformLocation = gl.getUniformLocation(
      this.program,
      'u_renderTransform'
    )
    gl.uniformMatrix4fv(
      renderTransformLocation,
      false,
      transformToMatrix4(renderTransform)
    )

    // Animation progress

    const animationProgressLocation = gl.getUniformLocation(
      this.program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    for (const mapId of this.mapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      // Map-specific uniforms

      this.setRenderOptionsUniforms(this.renderOptions, warpedMap.renderOptions)

      // Opacity

      const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.opacity * warpedMap.opacity)

      // Saturation

      const saturationLocation = gl.getUniformLocation(
        this.program,
        'u_saturation'
      )
      gl.uniform1f(saturationLocation, this.saturation * warpedMap.saturation)

      // Distortion

      const distortionLocation = gl.getUniformLocation(
        this.program,
        'u_distortion'
      )
      gl.uniform1f(distortionLocation, warpedMap.distortionMeasure ? 1 : 0)

      if (warpedMap.distortionMeasure) {
        const distortionOptionsDistortionMeasureLocation =
          gl.getUniformLocation(
            this.program,
            'u_distortionOptionsdistortionMeasure'
          )
        gl.uniform1i(
          distortionOptionsDistortionMeasureLocation,
          supportedDistortionMeasures.indexOf(warpedMap.distortionMeasure)
        )
      }

      // Best scale factor

      const currentBestScaleFactorLocation = gl.getUniformLocation(
        this.program,
        'u_currentBestScaleFactor'
      )
      const currentBestScaleFactor = warpedMap.currentBestScaleFactor
      gl.uniform1i(currentBestScaleFactorLocation, currentBestScaleFactor)

      // Cached tiles texture array

      const cachedTilesTextureArrayLocation = gl.getUniformLocation(
        this.program,
        'u_cachedTilesTextureArray'
      )
      gl.uniform1i(cachedTilesTextureArrayLocation, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, warpedMap.cachedTilesTextureArray)

      // Cached tiles resource positions and dimensions texture

      const cachedTilesResourcePositionsAndDimensionsLocation =
        gl.getUniformLocation(
          this.program,
          'u_cachedTilesResourcePositionsAndDimensionsTexture'
        )
      gl.uniform1i(cachedTilesResourcePositionsAndDimensionsLocation, 2)
      gl.activeTexture(gl.TEXTURE2)

      gl.bindTexture(
        gl.TEXTURE_2D,
        warpedMap.cachedTilesResourcePositionsAndDimensionsTexture
      )

      // Cached tiles scale factors texture

      const cachedTileScaleFactorsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_cachedTilesScaleFactorsTexture'
      )
      gl.uniform1i(cachedTileScaleFactorsTextureLocation, 3)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, warpedMap.cachedTilesScaleFactorsTexture)

      // Draw each map

      const vao = warpedMap.vao
      const count = warpedMap.resourceTrianglePoints.length

      const primitiveType = this.gl.TRIANGLES
      const offset = 0

      gl.bindVertexArray(vao)

      gl.drawArrays(primitiveType, offset, count)
    }
  }

  private setRenderOptionsUniforms(
    layerRenderOptions: RenderOptions,
    mapRenderOptions: RenderOptions
  ) {
    const gl = this.gl

    const renderOptions: RenderOptions = {
      removeColorOptions: {
        color:
          mapRenderOptions.removeColorOptions?.color ||
          layerRenderOptions.removeColorOptions?.color,
        hardness: maxOfNumberOrUndefined(
          mapRenderOptions.removeColorOptions?.hardness,
          layerRenderOptions.removeColorOptions?.hardness
        ),
        threshold: maxOfNumberOrUndefined(
          mapRenderOptions.removeColorOptions?.threshold,
          layerRenderOptions.removeColorOptions?.threshold
        )
      },
      colorizeOptions: {
        ...layerRenderOptions.colorizeOptions,
        ...mapRenderOptions.colorizeOptions
      },
      gridOptions: {
        ...layerRenderOptions.gridOptions,
        ...mapRenderOptions.gridOptions
      }
    }

    // Remove color uniforms

    const removeColorOptionsColor = renderOptions.removeColorOptions?.color

    const removeColorLocation = gl.getUniformLocation(
      this.program,
      'u_removeColor'
    )
    gl.uniform1f(removeColorLocation, removeColorOptionsColor ? 1 : 0)

    if (removeColorOptionsColor) {
      const removeColorOptionsColorLocation = gl.getUniformLocation(
        this.program,
        'u_removeColorOptionsColor'
      )
      gl.uniform3fv(removeColorOptionsColorLocation, removeColorOptionsColor)

      const removeColorOptionsThresholdLocation = gl.getUniformLocation(
        this.program,
        'u_removeColorOptionsThreshold'
      )
      gl.uniform1f(
        removeColorOptionsThresholdLocation,
        renderOptions.removeColorOptions?.threshold ||
          DEFAULT_REMOVE_COLOR_THRESHOLD
      )

      const removeColorOptionsHardnessLocation = gl.getUniformLocation(
        this.program,
        'u_removeColorOptionsHardness'
      )
      gl.uniform1f(
        removeColorOptionsHardnessLocation,
        renderOptions.removeColorOptions?.hardness ||
          DEFAULT_REMOVE_COLOR_HARDNESS
      )
    }

    // Colorize uniforms

    const colorizeOptionsColor = renderOptions.colorizeOptions?.color

    const colorizeLocation = gl.getUniformLocation(this.program, 'u_colorize')
    gl.uniform1f(colorizeLocation, colorizeOptionsColor ? 1 : 0)

    if (colorizeOptionsColor) {
      const colorizeOptionsColorLocation = gl.getUniformLocation(
        this.program,
        'u_colorizeOptionsColor'
      )
      gl.uniform3fv(colorizeOptionsColorLocation, colorizeOptionsColor)
    }

    // Grid uniforms

    const gridOptionsGrid = renderOptions.gridOptions?.enabled

    const gridLocation = gl.getUniformLocation(this.program, 'u_grid')
    gl.uniform1f(gridLocation, gridOptionsGrid ? 1 : 0)
  }

  private startTransformationTransition() {
    if (this.lastAnimationFrameRequestId !== undefined) {
      cancelAnimationFrame(this.lastAnimationFrameRequestId)
    }

    this.animating = true
    this.transformationTransitionStart = undefined
    this.lastAnimationFrameRequestId = requestAnimationFrame(
      this.transformationTransitionFrame.bind(this)
    )
  }

  private transformationTransitionFrame(now: number) {
    if (!this.transformationTransitionStart) {
      this.transformationTransitionStart = now
    }

    if (now - this.transformationTransitionStart < ANIMATION_DURATION) {
      this.animationProgress =
        (now - this.transformationTransitionStart) / ANIMATION_DURATION

      this.renderInternal()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        this.transformationTransitionFrame.bind(this)
      )
    } else {
      for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
        warpedMap.resetTrianglePoints()
      }
      this.updateVertexBuffers()

      this.animating = false
      this.animationProgress = 0
      this.transformationTransitionStart = undefined
      this.changed()
    }
  }

  private changed() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  protected imageInfoLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    }
  }

  protected clearMapTextures(mapId: string) {
    const webGL2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.clearTextures()
    }
  }

  protected mapTileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const tile = this.tileCache.getCacheableTile(tileUrl)

      if (!tile) {
        return
      }

      if (!tile.isCachedTile()) {
        return
      }

      const warpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!warpedMap) {
        return
      }

      warpedMap.addCachedTileAndUpdateTextures(tile)
    }
  }

  protected mapTileRemoved(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        return
      }

      warpedMap.removeCachedTileAndUpdateTextures(tileUrl)
    }
  }

  protected warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (warpedMap) {
        this.addEventListenersToWebGL2WarpedMap(warpedMap)
      }
    }
  }

  protected transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const warpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        if (this.animating) {
          warpedMap.mixTrianglePoints(this.animationProgress)
        }
        warpedMap.updateProjectedGeoTrianglePoints(false)
      }

      this.updateVertexBuffers() // TODO: can this be removed?
      this.startTransformationTransition() // TODO: pass mapIds here reset only those mapIds
    }
  }

  protected distortionChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const warpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        if (this.animating) {
          warpedMap.mixTrianglePoints(this.animationProgress)
        }
        warpedMap.updateTrianglePointsDistortion(false)
      }

      this.updateVertexBuffers() // TODO: can this be removed?
      this.startTransformationTransition() // TODO: pass mapIds here reset only those mapIds
    }
  }

  private addEventListenersToWebGL2WarpedMap(webgl2WarpedMap: WebGL2WarpedMap) {
    webgl2WarpedMap.addEventListener(
      WarpedMapEventType.TEXTURESUPDATED,
      this.throttledChanged.bind(this)
    )
  }

  private removeEventListenersFromWebGL2WarpedMap(
    webgl2WarpedMap: WebGL2WarpedMap
  ) {
    webgl2WarpedMap.removeEventListener(
      WarpedMapEventType.TEXTURESUPDATED,
      this.throttledChanged.bind(this)
    )
  }

  contextLost() {
    this.disableRender = true

    this.cancelThrottledFunctions()
    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      warpedMap.cancelThrottledFunctions()
    }

    this.tileCache.clear()
  }

  contextRestored() {
    this.initializeWebGL(this.gl)

    this.disableRender = false
  }
}
