import { throttle } from 'lodash-es'
import { wrap as comlinkWtap } from 'comlink'

import {
  hexToFractionalOpaqueRgba,
  hexToFractionalRgb,
  mergeOptions,
  squaredDistance
} from '@allmaps/stdlib'
import { supportedDistortionMeasures } from '@allmaps/transform'

import { BaseRenderer } from './BaseRenderer.js'
import {
  WebGL2WarpedMap,
  createWebGL2WarpedMapFactory
} from '../maps/WebGL2WarpedMap.js'
import { CacheableWorkerImageDataTile } from '../tilecache/CacheableWorkerImageDataTile.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import {
  multiplyHomogeneousTransform,
  invertHomogeneousTransform,
  homogeneousTransformToMatrix4
} from '../shared/homogeneous-transform.js'
import { createShader, createProgram } from '../shared/webgl2.js'
import { Viewport } from '../viewport/Viewport.js'

import mapVertexShaderSource from '../shaders/map/vertex-shader.glsl'
import mapFragmentShaderSource from '../shaders/map/fragment-shader.glsl'
import linesVertexShaderSource from '../shaders/lines/vertex-shader.glsl'
import linesFragmentShaderSource from '../shaders/lines/fragment-shader.glsl'
import pointsVertexShaderSource from '../shaders/points/vertex-shader.glsl'
import pointsFragmentShaderSource from '../shaders/points/fragment-shader.glsl'

// Using the recommended URL constructor -
// See https://vite.dev/guide/features.html#import-with-constructors -
// leads to import errors when publising on platforms like jsdelivr.
// Using the inline query parameter solves this.
import FetchAndGetImageDataWorker from '../workers/fetch-and-get-image-data.js?worker&inline'
import ApplySpritesImageDataWorker from '../workers/apply-sprites-image-data.js?worker&inline'

import type { DebouncedFunc } from 'lodash-es'

import type { FetchableTile } from '../tilecache/FetchableTile.js'

import type { FetchAndGetImageDataWorkerType } from '../workers/fetch-and-get-image-data.js'

import type {
  Renderer,
  SpecificWebGL2RenderOptions,
  WebGL2RenderOptions
} from '../shared/types.js'
import { ApplySpritesImageDataWorkerType } from '../workers/apply-sprites-image-data.js'

const THROTTLE_PREPARE_RENDER_WAIT_MS = 200
const THROTTLE_PREPARE_RENDER_OPTIONS = {
  leading: true,
  trailing: true
}

const THROTTLE_CHANGED_WAIT_MS = 50
const THROTTLE_CHANGED_OPTIONS = {
  leading: true,
  trailing: true
}

const SIGNIFICANT_VIEWPORT_EPSILON = 100 * Number.EPSILON
const SIGNIFICANT_VIEWPORT_DISTANCE = 5
const ANIMATION_DURATION = 750

export const DEFAULT_SPECIFIC_WEBGL2_RENDER_OPTIONS: SpecificWebGL2RenderOptions =
  {}

/**
 * Class that renders WarpedMaps to a WebGL 2 context
 */
export class WebGL2Renderer
  extends BaseRenderer<WebGL2WarpedMap, ImageData>
  implements Renderer
{
  #worker: Worker

  gl: WebGL2RenderingContext

  declare options: Partial<WebGL2RenderOptions>

  mapProgram: WebGLProgram
  linesProgram: WebGLProgram
  pointsProgram: WebGLProgram

  previousSignificantViewport: Viewport | undefined

  lastAnimationFrameRequestId: number | undefined
  animating = false
  animationStart: number | undefined
  animationProgress = 0

  disableRender = false

  private throttledPrepareRenderInternal: DebouncedFunc<
    typeof this.prepareRenderInternal
  >

  private throttledChanged: DebouncedFunc<typeof this.changed>

  /**
   * Creates an instance of WebGL2Renderer.
   *
   * @constructor
   * @param gl - WebGL 2 rendering context
   * @param options - options
   */
  constructor(
    gl: WebGL2RenderingContext,
    options?: Partial<WebGL2RenderOptions>
  ) {
    const mapVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      mapVertexShaderSource
    )
    const mapFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mapFragmentShaderSource
    )

    const linesVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      linesVertexShaderSource
    )
    const linesFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      linesFragmentShaderSource
    )

    const pointsVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      pointsVertexShaderSource
    )
    const pointsFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      pointsFragmentShaderSource
    )

    const mapProgram = createProgram(gl, mapVertexShader, mapFragmentShader)
    const linesProgram = createProgram(
      gl,
      linesVertexShader,
      linesFragmentShader
    )
    const pointsProgram = createProgram(
      gl,
      pointsVertexShader,
      pointsFragmentShader
    )

    const worker = new FetchAndGetImageDataWorker()
    const spritesWorker = new ApplySpritesImageDataWorker()
    const wrappedWorker = comlinkWtap<FetchAndGetImageDataWorkerType>(worker)
    const wrappedSpritesWorker =
      comlinkWtap<ApplySpritesImageDataWorkerType>(spritesWorker)

    super(
      createWebGL2WarpedMapFactory(gl, mapProgram, linesProgram, pointsProgram),
      CacheableWorkerImageDataTile.createFactory(
        wrappedWorker,
        wrappedSpritesWorker
      ),
      options
    )

    this.#worker = worker
    this.gl = gl

    this.options = mergeOptions(
      DEFAULT_SPECIFIC_WEBGL2_RENDER_OPTIONS,
      this.options
    )

    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    // Unclear how to remove shaders, possibly already after linking to program, see:
    // https://stackoverflow.com/questions/9113154/proper-way-to-delete-glsl-shader
    // https://stackoverflow.com/questions/27237696/webgl-detach-and-delete-shaders-after-linking
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)
    gl.deleteShader(mapVertexShader)
    gl.deleteShader(mapFragmentShader)

    gl.disable(gl.DEPTH_TEST)

    this.addEventListeners()

    this.throttledPrepareRenderInternal = throttle(
      this.prepareRenderInternal.bind(this),
      THROTTLE_PREPARE_RENDER_WAIT_MS,
      THROTTLE_PREPARE_RENDER_OPTIONS
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
    const mapVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      mapVertexShaderSource
    )
    const mapFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mapFragmentShaderSource
    )

    const linesVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      linesVertexShaderSource
    )
    const linesFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      linesFragmentShaderSource
    )

    const pointsVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      pointsVertexShaderSource
    )
    const pointsFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      pointsFragmentShaderSource
    )

    const mapProgram = createProgram(gl, mapVertexShader, mapFragmentShader)
    const linesProgram = createProgram(
      gl,
      linesVertexShader,
      linesFragmentShader
    )
    const pointsProgram = createProgram(
      gl,
      pointsVertexShader,
      pointsFragmentShader
    )

    this.gl = gl
    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    gl.disable(gl.DEPTH_TEST)

    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      webgl2WarpedMap.initializeWebGL(mapProgram, linesProgram, pointsProgram)
    }
  }

  /**
   * Render the map for a given viewport.
   *
   * If no viewport is specified the current viewport is rerendered.
   * If no current viewport is known, a viewport is deduced based on the WarpedMapList and canvas width and hight.
   *
   * @param viewport - the current viewport
   */
  render(viewport?: Viewport): void {
    if (this.disableRender) {
      return
    }

    this.viewport =
      viewport ||
      this.viewport ||
      Viewport.fromSizeAndMaps(
        [this.gl.canvas.width, this.gl.canvas.width],
        this.warpedMapList
      )

    // Not awaiting this, using events to trigger new render calls
    this.loadMissingImagesInViewport()

    // Don't fire throttled function unless it could result in something
    // Otherwise we have to wait for that cycle to finish before useful cycle can be started
    if (this.someImagesInViewport()) {
      this.throttledPrepareRenderInternal()
    }

    this.renderInternal()
  }

  clear() {
    this.warpedMapList.clear()
    this.mapsInViewport = new Set()
    this.mapsWithFetchableTilesForViewport = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  cancelThrottledFunctions() {
    this.throttledPrepareRenderInternal.cancel()
    this.throttledChanged.cancel()
  }

  destroy() {
    this.cancelThrottledFunctions()

    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      this.removeEventListenersFromWebGL2WarpedMap(webgl2WarpedMap)
    }

    this.removeEventListeners()

    super.destroy()

    this.gl.deleteProgram(this.mapProgram)
    this.gl.deleteProgram(this.linesProgram)
    this.gl.deleteProgram(this.pointsProgram)

    this.#worker.terminate()
    // Can't delete context, see:
    // https://stackoverflow.com/questions/14970206/deleting-webgl-contexts
  }

  protected updateMapsForViewport(
    allFechableTilesForViewport: FetchableTile[],
    allRequestedTilesForViewport: FetchableTile[]
  ): {
    mapsEnteringViewport: string[]
    mapsLeavingViewport: string[]
  } {
    const { mapsEnteringViewport, mapsLeavingViewport } =
      super.updateMapsForViewport(
        allFechableTilesForViewport,
        allRequestedTilesForViewport
      )

    this.updateVertexBuffers(mapsEnteringViewport)

    return { mapsEnteringViewport, mapsLeavingViewport }
  }

  protected resetPrevious(mapIds?: string[]) {
    const webgl2WarpedMaps = this.warpedMapList.getWarpedMaps({ mapIds })
    for (const webgl2WarpedMap of webgl2WarpedMaps) {
      webgl2WarpedMap.resetPrevious()
    }
  }

  protected updateVertexBuffers(mapIds?: string[]) {
    if (!this.viewport) {
      return
    }

    const webgl2WarpedMaps = this.warpedMapList.getWarpedMaps({ mapIds })
    for (const webgl2WarpedMap of webgl2WarpedMaps) {
      webgl2WarpedMap.updateVertexBuffers(
        this.viewport.projectedGeoToClipHomogeneousTransform
      )
    }
  }

  private prepareRenderInternal(): void {
    this.assureProjection()
    this.requestFetchableTiles()
  }

  protected shouldRequestFetchableTiles(): boolean {
    // Returns whether requested tiles should be updated

    // Returns true when the viewport moved significantly
    // > to prevent updating requested tiles on minimal movements/
    // Returns true when the viewport didn't move at all
    // > since this function is called (possibly multiple times) during startup, without changes to the viewport
    // Returns false in other cases

    // TODO: this could be a problem if the viewport is quickly and continuously moved
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
      const rectangleSquaredDistances = []
      for (let i = 0; i < 4; i++) {
        rectangleSquaredDistances.push(
          squaredDistance(
            this.previousSignificantViewport.projectedGeoRectangle[i],
            this.viewport.projectedGeoRectangle[i]
          ) / Math.pow(this.viewport.projectedGeoPerViewportScale, 2)
        )
      }
      const maxSquaredDistance = Math.max(...rectangleSquaredDistances)
      if (maxSquaredDistance < SIGNIFICANT_VIEWPORT_EPSILON) {
        return true
      }
      if (maxSquaredDistance > Math.pow(SIGNIFICANT_VIEWPORT_DISTANCE, 2)) {
        this.previousSignificantViewport = this.viewport
        return true
      } else {
        return false
      }
    }
  }

  protected shouldAnticipateInteraction() {
    // Get a map's overview tiles only for this render
    return true
  }

  private renderInternal(): void {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    this.renderMapsInternal()
    this.renderLinesInternal()
    this.renderPointsInternal()
  }

  private renderMapsInternal(): void {
    if (!this.viewport) {
      return
    }

    this.setMapProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap || !webgl2WarpedMap.shouldRenderMap()) {
        continue
      }

      this.setMapProgramMapUniforms(webgl2WarpedMap)

      // Draw map
      const count = webgl2WarpedMap.resourceTrianglePoints.length
      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.mapVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderLinesInternal(): void {
    this.setLinesProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap || !webgl2WarpedMap.shouldRenderLines()) {
        continue
      }

      this.setLinesProgramMapUniforms(webgl2WarpedMap)

      // Draw lines for each map
      const count =
        webgl2WarpedMap.lineGroups.reduce(
          (accumulator: number, lineGroup) =>
            accumulator + lineGroup.projectedGeoLines.length,
          0
        ) * 6
      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.linesVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderPointsInternal(): void {
    this.setPointsProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap! || !webgl2WarpedMap.shouldRenderPoints()) {
        continue
      }

      this.setPointsProgramMapUniforms(webgl2WarpedMap)

      // Draw points for each map
      const count = webgl2WarpedMap.pointGroups.reduce(
        (accumulator: number, pointGroup) =>
          accumulator + pointGroup.projectedGeoPoints.length,
        0
      )
      const primitiveType = this.gl.POINTS
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.pointsVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  private setMapProgramUniforms() {
    const program = this.mapProgram
    const gl = this.gl
    gl.useProgram(program)

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  private setMapProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.mapProgram
    gl.useProgram(program)

    // Render Transform
    const renderHomogeneousTransform = multiplyHomogeneousTransform(
      this.viewport.projectedGeoToClipHomogeneousTransform,
      webgl2WarpedMap.invertedRenderHomogeneousTransform
    )
    const renderHomogeneousTransformLocation = gl.getUniformLocation(
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )

    // Opacity
    const opacityLocation = gl.getUniformLocation(program, 'u_opacity')
    gl.uniform1f(opacityLocation, webgl2WarpedMap.options.opacity)

    // Saturation
    const saturationLocation = gl.getUniformLocation(program, 'u_saturation')
    gl.uniform1f(saturationLocation, webgl2WarpedMap.options.saturation)

    // Remove color
    const removeColorLocation = gl.getUniformLocation(program, 'u_removeColor')
    gl.uniform1f(
      removeColorLocation,
      webgl2WarpedMap.options.removeColor ? 1 : 0
    )

    const removeColorColorLocation = gl.getUniformLocation(
      program,
      'u_removeColorColor'
    )
    gl.uniform3fv(
      removeColorColorLocation,
      hexToFractionalRgb(webgl2WarpedMap.options.removeColorColor)
    )

    const removeColorThresholdLocation = gl.getUniformLocation(
      program,
      'u_removeColorThreshold'
    )
    gl.uniform1f(
      removeColorThresholdLocation,
      webgl2WarpedMap.options.removeColorThreshold
    )

    const removeColorHardnessLocation = gl.getUniformLocation(
      program,
      'u_removeColorHardness'
    )
    gl.uniform1f(
      removeColorHardnessLocation,
      webgl2WarpedMap.options.removeColorHardness
    )

    // Colorize
    const colorizeLocation = gl.getUniformLocation(program, 'u_colorize')
    gl.uniform1f(colorizeLocation, webgl2WarpedMap.options.colorize ? 1 : 0)

    const colorizeColorLocation = gl.getUniformLocation(
      program,
      'u_colorizeColor'
    )
    gl.uniform3fv(
      colorizeColorLocation,
      hexToFractionalRgb(webgl2WarpedMap.options.colorizeColor)
    )

    // Grid
    const gridLocation = gl.getUniformLocation(program, 'u_renderGrid')
    gl.uniform1f(gridLocation, webgl2WarpedMap.options.renderGrid ? 1 : 0)

    const colorGrid = gl.getUniformLocation(program, 'u_renderGridColor')
    gl.uniform4fv(
      colorGrid,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.renderGridColor)
    )

    // Distortion
    const distortionLocation = gl.getUniformLocation(program, 'u_distortion')
    gl.uniform1f(distortionLocation, webgl2WarpedMap.distortionMeasure ? 1 : 0)

    const distortionMeasureLocation = gl.getUniformLocation(
      program,
      'u_distortionMeasure'
    )
    gl.uniform1i(
      distortionMeasureLocation,
      webgl2WarpedMap.distortionMeasure
        ? supportedDistortionMeasures.indexOf(webgl2WarpedMap.distortionMeasure)
        : 0
    )

    const distortionColor00Location = gl.getUniformLocation(
      program,
      'u_distortionColor00'
    )
    gl.uniform4fv(
      distortionColor00Location,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.distortionColor00)
    )

    const distortionColor01Location = gl.getUniformLocation(
      program,
      'u_distortionColor01'
    )
    gl.uniform4fv(
      distortionColor01Location,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.distortionColor01)
    )

    const distortionColor1Location = gl.getUniformLocation(
      program,
      'u_distortionColor1'
    )
    gl.uniform4fv(
      distortionColor1Location,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.distortionColor1)
    )

    const distortionColor2Location = gl.getUniformLocation(
      program,
      'u_distortionColor2'
    )
    gl.uniform4fv(
      distortionColor2Location,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.distortionColor2)
    )

    const distortionColorLocation3 = gl.getUniformLocation(
      program,
      'u_distortionColor3'
    )
    gl.uniform4fv(
      distortionColorLocation3,
      hexToFractionalOpaqueRgba(webgl2WarpedMap.options.distortionColor3)
    )

    // Debug Triangles
    const debugTrianglesLocation = gl.getUniformLocation(
      program,
      'u_debugTriangles'
    )
    gl.uniform1f(
      debugTrianglesLocation,
      webgl2WarpedMap.options.debugTriangles ? 1 : 0
    )

    // Debug Tiles
    const debugTilesLocation = gl.getUniformLocation(program, 'u_debugTiles')
    gl.uniform1f(debugTilesLocation, webgl2WarpedMap.options.debugTiles ? 1 : 0)

    // Best scale factor
    const scaleFactorForViewportLocation = gl.getUniformLocation(
      program,
      'u_scaleFactorForViewport'
    )
    const scaleFactorForViewport = webgl2WarpedMap.tileZoomLevelForViewport
      ? webgl2WarpedMap.tileZoomLevelForViewport.scaleFactor
      : 1
    gl.uniform1i(scaleFactorForViewportLocation, scaleFactorForViewport)

    // Cached tiles texture array
    const cachedTilesTextureArrayLocation = gl.getUniformLocation(
      program,
      'u_cachedTilesTextureArray'
    )
    gl.uniform1i(cachedTilesTextureArrayLocation, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, webgl2WarpedMap.cachedTilesTextureArray)

    // Cached tiles resource origin points and dimensions texture
    const cachedTilesResourceOriginPointsAndDimensionsLocation =
      gl.getUniformLocation(
        program,
        'u_cachedTilesResourceOriginPointsAndDimensionsTexture'
      )
    gl.uniform1i(cachedTilesResourceOriginPointsAndDimensionsLocation, 1)
    gl.activeTexture(gl.TEXTURE1)

    gl.bindTexture(
      gl.TEXTURE_2D,
      webgl2WarpedMap.cachedTilesResourceOriginPointsAndDimensionsTexture
    )

    // Cached tiles scale factors texture
    const cachedTileScaleFactorsTextureLocation = gl.getUniformLocation(
      program,
      'u_cachedTilesScaleFactorsTexture'
    )
    gl.uniform1i(cachedTileScaleFactorsTextureLocation, 2)
    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(
      gl.TEXTURE_2D,
      webgl2WarpedMap.cachedTilesScaleFactorsTexture
    )
  }

  private setLinesProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.useProgram(program)

    // ViewportToClip Transform
    const viewportToClipHomogeneousTransformLocation = gl.getUniformLocation(
      program,
      'u_viewportToClipHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      viewportToClipHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(
        this.viewport.viewportToClipHomogeneousTransform
      )
    )

    // clipToViewport Transform
    const clipToViewportHomogeneousTransformLocation = gl.getUniformLocation(
      program,
      'u_clipToViewportHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      clipToViewportHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(
        invertHomogeneousTransform(
          this.viewport.viewportToClipHomogeneousTransform
        )
      )
    )

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  private setLinesProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.useProgram(program)

    // Render Transform
    const renderHomogeneousTransform = multiplyHomogeneousTransform(
      this.viewport.projectedGeoToClipHomogeneousTransform,
      webgl2WarpedMap.invertedRenderHomogeneousTransform
    )
    const renderHomogeneousTransformLocation = gl.getUniformLocation(
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )
  }

  private setPointsProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.useProgram(program)

    // Animation progress
    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  private setPointsProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.useProgram(program)

    // Render Transform
    const renderHomogeneousTransform = multiplyHomogeneousTransform(
      this.viewport.projectedGeoToClipHomogeneousTransform,
      webgl2WarpedMap.invertedRenderHomogeneousTransform
    )
    const renderHomogeneousTransformLocation = gl.getUniformLocation(
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )
  }

  private startAnimation(mapIds: string[]) {
    // This changed() is needed to prevent a blank canvas flash
    this.changed()
    this.updateVertexBuffers(mapIds)

    if (this.lastAnimationFrameRequestId !== undefined) {
      cancelAnimationFrame(this.lastAnimationFrameRequestId)
    }

    this.animating = true
    this.animationProgress = 0
    this.animationStart = undefined
    this.lastAnimationFrameRequestId = requestAnimationFrame(
      ((now: number) => this.animationFrame(now, mapIds)).bind(this)
    )
  }

  private animationFrame(now: number, mapIds: string[]) {
    if (!this.animationStart) {
      this.animationStart = now
    }

    if (now - this.animationStart < ANIMATION_DURATION) {
      // Animation is ongoing
      // animationProgress goes from 0 to 1 throughout animation
      this.animationProgress = (now - this.animationStart) / ANIMATION_DURATION

      // This changed() is needed to trigger the repaint of the canvas
      this.changed()
      this.renderInternal()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        ((now: number) => this.animationFrame(now, mapIds)).bind(this)
      )
    } else {
      // Animation ended
      this.finishAnimation(mapIds)
    }
  }

  private finishAnimation(mapIds: string[]) {
    this.resetPrevious(mapIds)
    this.updateVertexBuffers(mapIds)

    this.animating = false
    this.animationProgress = 0
    this.animationStart = undefined

    this.changed()
  }

  private changed() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  protected imageLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.IMAGELOADED, event.data)
      )
    }
  }

  protected clearMap(mapId: string) {
    const webGL2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.clearTextures()
    }
  }

  protected mapTileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds || !event.data?.tileUrl) {
        throw new Error('Event data missing')
      }
      const { mapIds, tileUrl } = event.data
      const mapId = mapIds[0]
      const tile = this.tileCache.getCacheableTile(tileUrl)

      if (!tile) {
        return
      }

      if (!tile.isCachedTile()) {
        return
      }

      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.addCachedTileAndUpdateTextures(tile)
    }
  }

  protected mapTileDeleted(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds || !event.data.tileUrl) {
        throw new Error('Event data missing')
      }
      const { mapIds, tileUrl } = event.data
      const mapId = mapIds[0]
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.removeCachedTileAndUpdateTextures(tileUrl)
    }
  }

  protected warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      const mapId = mapIds[0]
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (webgl2WarpedMap) {
        this.addEventListenersToWebGL2WarpedMap(webgl2WarpedMap)
      }
    }
  }

  protected prepareChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps({
        mapIds
      })) {
        if (this.animating) {
          webgl2WarpedMap.mixPreviousAndNew(1 - this.animationProgress)
        }
      }
    }
  }

  protected animatedChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      this.startAnimation(mapIds)
    }
  }

  protected immediateChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      this.finishAnimation(mapIds)
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
    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      webgl2WarpedMap.cancelThrottledFunctions()
    }

    this.tileCache.clear()
  }

  contextRestored() {
    this.initializeWebGL(this.gl)

    this.disableRender = false
  }
}
