import { throttle } from 'lodash-es'

// TODO: convert colors to fractional rgb
// when setting options, not every render call
import { mergeOptions, squaredDistance } from '@allmaps/stdlib'
import { supportedDistortionMeasures } from '@allmaps/transform'

import { BaseRenderer } from './BaseRenderer.js'
import {
  WebGL2WarpedMap,
  createWebGL2WarpedMapFactory
} from '../maps/WebGL2WarpedMap.js'
import { DEFAULT_ANIMATION_OPTIONS } from '../maps/WarpedMapList.js'
import { CacheableWorkerImageBitmapTile } from '../tilecache/CacheableWorkerImageBitmapTile.js'
import {
  WarpedMapErrorEvent,
  WarpedMapEvent,
  WarpedMapEventType
} from '../shared/events.js'
import {
  multiplyHomogeneousTransform,
  invertHomogeneousTransform,
  homogeneousTransformToMatrix4
} from '../shared/homogeneous-transform.js'
import { createShader, createProgram } from '../shared/webgl2.js'
import {
  getCachedFractionalOpaqueRgba,
  getCachedFractionalRgb
} from '../shared/colors-cache.js'
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
import FetchAndGetImageBitmapWorker from '../workers/fetch-and-get-image-bitmap.js?worker&inline'
import { WorkerPool } from '../workers/PoolWorkers.js'

import type { DebouncedFunc } from 'lodash-es'

import type { FetchableTile } from '../tilecache/FetchableTile.js'

import type { FetchAndGetImageBitmapWorkerType } from '../workers/fetch-and-get-image-bitmap.js'

import type {
  AnimationOptions,
  Renderer,
  SpecificWebGL2RenderOptions,
  WebGL2RenderOptions,
  WebGL2WarpedMapOptions
} from '../shared/types.js'

const POOL_SIZE = Math.max(
  1,
  Math.min((navigator.hardwareConcurrency || 4) - 1, 4)
)

const THROTTLE_PREPARE_RENDER_WAIT_MS = 200
const THROTTLE_PREPARE_RENDER_OPTIONS = {
  leading: true,
  trailing: true
}

// Maximum number of tile uploads (texSubImage3D) performed per frame across all
// maps, in #updateMapTextures. Bounds per-frame GPU upload cost so a burst of
// arriving tiles streams in over a few frames instead of spiking one frame.
// Tunable: higher fills faster but risks jank; lower is smoother but slower.
// Needed since texture updates are no longer throttled (used to be 200ms)
// but now update at the speed at which renderInternal is called (typically 50ms external throttle).
const MAX_TILE_UPLOADS_PER_FRAME = 16

const SIGNIFICANT_VIEWPORT_EPSILON = 100 * Number.EPSILON
const SIGNIFICANT_VIEWPORT_DISTANCE = 5

// The map-program uniforms that come from the map's (rarely changing) options.
type MapAppearanceUniforms = Partial<WebGL2WarpedMapOptions>

/**
 * Class that renders WarpedMaps to a WebGL 2 context
 */
export class WebGL2Renderer
  extends BaseRenderer<WebGL2WarpedMap, ImageBitmap>
  implements Renderer
{
  #workerPool: WorkerPool<FetchAndGetImageBitmapWorkerType>

  DEFAULT_SPECIFIC_WEBGL2_RENDER_OPTIONS: SpecificWebGL2RenderOptions

  gl: WebGL2RenderingContext

  declare options: WebGL2RenderOptions

  mapProgram: WebGLProgram
  linesProgram: WebGLProgram
  pointsProgram: WebGLProgram

  #uniformCache: Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>

  // Last appearance-uniform values set on the map program. These come from the
  // map's options and are usually identical across maps and stable across
  // frames; since uniforms are program-global they stay set, so each appearance
  // uniform is only re-set when its value changed. Reset (to {}) on program
  // (re)creation so they're all re-set afterwards.
  #lastMapAppearance: MapAppearanceUniforms = {}

  previousSignificantViewport: Viewport | undefined

  lastAnimationFrameRequestId: number | undefined
  animating = false
  animationStart: number | undefined
  animationProgress = 0

  disableRender = false

  #throttledPrepareRenderInternal: DebouncedFunc<() => void>

  // Maps whose tile set changed and whose textures still need (re)uploading.
  // Drained under a per-frame budget in #updateMapTextures, so GPU uploads stay
  // bounded and frame-aligned instead of running on a per-map throttle.
  #mapsWithTextureToUpdate: Set<string> = new Set()

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

    // All tiles are decoded to ImageBitmaps and uploaded directly to the
    // texture array (no getImageData readback). Sprite tiles are clipped from
    // their atlas ImageBitmap in CacheableWorkerImageBitmapTile.applySprites.
    const workerPool = new WorkerPool<FetchAndGetImageBitmapWorkerType>(
      FetchAndGetImageBitmapWorker,
      POOL_SIZE
    )

    const warpedMapFactory = createWebGL2WarpedMapFactory(
      gl,
      mapProgram,
      linesProgram,
      pointsProgram
    )

    const defaultSpecificWebGL2RenderOptions = {
      warpedMapFactory,
      anticipateInteraction: true
    }

    super(
      CacheableWorkerImageBitmapTile.createFactory(workerPool),
      mergeOptions(defaultSpecificWebGL2RenderOptions, options)
    )

    this.#workerPool = workerPool
    this.gl = gl

    this.DEFAULT_SPECIFIC_WEBGL2_RENDER_OPTIONS =
      defaultSpecificWebGL2RenderOptions

    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    this.#uniformCache = new Map()
    this.#lastMapAppearance = {}

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

    this.#throttledPrepareRenderInternal = throttle(
      this.#prepareRenderInternal.bind(this),
      THROTTLE_PREPARE_RENDER_WAIT_MS,
      THROTTLE_PREPARE_RENDER_OPTIONS
    )

    this.warpedMapList.updateWarpedMapsUsingFactory()
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

    this.#uniformCache = new Map()
    this.#lastMapAppearance = {}

    gl.disable(gl.DEPTH_TEST)

    for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps()) {
      webgl2WarpedMap.initializeWebGL(mapProgram, linesProgram, pointsProgram)
    }
  }

  /**
   * Get the default options of the renderer and list
   */
  getDefaultOptions(): WebGL2RenderOptions & WebGL2WarpedMapOptions {
    return mergeOptions(
      super.getDefaultOptions(),
      this.DEFAULT_SPECIFIC_WEBGL2_RENDER_OPTIONS
    )
  }

  /**
   * Render the map for a given viewport.
   *
   * If no viewport is specified the current viewport is rerendered.
   * If no current viewport is known, a viewport is deduced based on the WarpedMapList and canvas width and hight.
   *
   * @param viewport - the current viewport
   */
  render(viewport?: Viewport) {
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
    this.loadMissingImagesInViewport().forEach((promise) => {
      promise.catch(() => {
        // Image-info failures are emitted as IMAGEINFOFETCHERROR events.
      })
    })

    // Don't fire throttled function unless it could result in something
    // Otherwise we have to wait for that cycle to finish before useful cycle can be started
    if (!this.someImagesInViewport()) {
      return
    }

    this.#throttledPrepareRenderInternal()
    this.#renderInternal()
  }

  clear() {
    this.warpedMapList.clear()
    this.mapsInViewport = new Set()
    this.mapsWithFetchableTilesForViewport = new Set()
    this.#mapsWithTextureToUpdate.clear()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  cancelThrottledFunctions() {
    this.#throttledPrepareRenderInternal.cancel()
  }

  destroy() {
    this.cancelThrottledFunctions()

    this.removeEventListeners()

    super.destroy()

    this.gl.deleteProgram(this.mapProgram)
    this.gl.deleteProgram(this.linesProgram)
    this.gl.deleteProgram(this.pointsProgram)

    this.#workerPool.destroy()
    // Can't delete context, see:
    // https://stackoverflow.com/questions/14970206/deleting-webgl-contexts
  }

  #getUniformLocation(
    gl: WebGLRenderingContext,
    program: WebGLProgram,
    name: string
  ): WebGLUniformLocation | null {
    // Get or create program cache
    let programCache = this.#uniformCache.get(program)
    if (!programCache) {
      programCache = new Map()
      this.#uniformCache.set(program, programCache)
    }

    // Get or fetch uniform location
    if (!programCache.has(name)) {
      const location = gl.getUniformLocation(program, name)
      programCache.set(name, location)
    }

    return programCache.get(name)!
  }

  protected updateMapsForViewport(
    allFechableTilesForViewport: FetchableTile[]
  ): {
    mapsInListEntering: string[]
    mapsInListLeaving: string[]
    mapsInViewportEntering: string[]
    mapsInViewportLeaving: string[]
    mapsWithFetchableTilesForViewportEntering: string[]
    mapsWithFetchableTilesForViewportLeaving: string[]
  } {
    const {
      mapsInListEntering,
      mapsInListLeaving,
      mapsWithFetchableTilesForViewportEntering,
      mapsWithFetchableTilesForViewportLeaving,
      mapsInViewportEntering,
      mapsInViewportLeaving
    } = super.updateMapsForViewport(allFechableTilesForViewport)

    this.updateVertexBuffers(mapsWithFetchableTilesForViewportEntering)

    return {
      mapsInListEntering,
      mapsInListLeaving,
      mapsWithFetchableTilesForViewportEntering,
      mapsWithFetchableTilesForViewportLeaving,
      mapsInViewportEntering,
      mapsInViewportLeaving
    }
  }

  protected resetPrevious() {
    const webgl2WarpedMaps = this.warpedMapList.getWarpedMaps()
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

  #prepareRenderInternal() {
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

  #renderInternal() {
    if (!this.viewport) {
      return
    }

    // Upload any pending tile textures (bounded per frame) before drawing, so
    // freshly arrived tiles show this frame without spiking upload cost.
    this.#updateMapTextures()

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    this.#renderMapsInternal()
    this.#renderLinesInternal()
    this.#renderPointsInternal()
  }

  #renderMapsInternal() {
    if (!this.viewport) {
      return
    }

    this.#setMapProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap || !webgl2WarpedMap.shouldRenderMap()) {
        continue
      }

      this.#setMapProgramMapUniforms(webgl2WarpedMap)

      // Draw map
      const count = webgl2WarpedMap.resourceTrianglePoints.length

      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      this.gl.bindVertexArray(webgl2WarpedMap.mapVao)
      this.gl.drawArrays(primitiveType, offset, count)
    }
  }

  #renderLinesInternal() {
    this.#setLinesProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap || !webgl2WarpedMap.shouldRenderLines()) {
        continue
      }

      this.#setLinesProgramMapUniforms(webgl2WarpedMap)

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

  #renderPointsInternal() {
    this.#setPointsProgramUniforms()

    for (const mapId of this.mapsWithFetchableTilesForViewport) {
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!webgl2WarpedMap! || !webgl2WarpedMap.shouldRenderPoints()) {
        continue
      }

      this.#setPointsProgramMapUniforms(webgl2WarpedMap)

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

  #setMapProgramUniforms() {
    const program = this.mapProgram
    const gl = this.gl
    gl.useProgram(program)

    // Animation progress
    const animationProgressLocation = this.#getUniformLocation(
      gl,
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  #setMapProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
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
    const renderHomogeneousTransformLocation = this.#getUniformLocation(
      gl,
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )

    // Visible
    const visibilityOpacityLocation = this.#getUniformLocation(
      gl,
      program,
      'u_visibilityOpacity'
    )
    gl.uniform1f(visibilityOpacityLocation, webgl2WarpedMap.visibilityOpacity)
    const previousVisibilityOpacityLocation = this.#getUniformLocation(
      gl,
      program,
      'u_previousVisibilityOpacity'
    )
    gl.uniform1f(
      previousVisibilityOpacityLocation,
      webgl2WarpedMap.previousVisibilityOpacity
    )
    const applymaskOpacityLocation = this.#getUniformLocation(
      gl,
      program,
      'u_applyMaskOpacity'
    )
    gl.uniform1f(applymaskOpacityLocation, webgl2WarpedMap.applyMaskOpacity)
    const previousApplyMaskOpacityLocation = this.#getUniformLocation(
      gl,
      program,
      'u_previousApplyMaskOpacity'
    )
    gl.uniform1f(
      previousApplyMaskOpacityLocation,
      webgl2WarpedMap.previousApplyMaskOpacity
    )

    // As the renderer is running this function for every webgl2WarpedMap,
    // the appearance uniforms are often the same for consecutive maps.
    // We check this and if so don't set the uniforms again.
    const options = webgl2WarpedMap.options
    const distortionMeasure = webgl2WarpedMap.distortionMeasure
    const lastMapAppearance = this.#lastMapAppearance

    // Opacity
    if (lastMapAppearance.opacity !== options.opacity) {
      const opacityLocation = this.#getUniformLocation(gl, program, 'u_opacity')
      gl.uniform1f(opacityLocation, options.opacity)
      lastMapAppearance.opacity = options.opacity
    }

    // Saturation
    if (lastMapAppearance.saturation !== options.saturation) {
      const saturationLocation = this.#getUniformLocation(
        gl,
        program,
        'u_saturation'
      )
      gl.uniform1f(saturationLocation, options.saturation)
      lastMapAppearance.saturation = options.saturation
    }

    // Remove color
    if (lastMapAppearance.removeColor !== options.removeColor) {
      const removeColorLocation = this.#getUniformLocation(
        gl,
        program,
        'u_removeColor'
      )
      gl.uniform1f(removeColorLocation, options.removeColor ? 1 : 0)
      lastMapAppearance.removeColor = options.removeColor
    }

    if (lastMapAppearance.removeColorColor !== options.removeColorColor) {
      const removeColorColorLocation = this.#getUniformLocation(
        gl,
        program,
        'u_removeColorColor'
      )
      gl.uniform3fv(
        removeColorColorLocation,
        getCachedFractionalRgb(options.removeColorColor)
      )
      lastMapAppearance.removeColorColor = options.removeColorColor
    }

    if (
      lastMapAppearance.removeColorThreshold !== options.removeColorThreshold
    ) {
      const removeColorThresholdLocation = this.#getUniformLocation(
        gl,
        program,
        'u_removeColorThreshold'
      )
      gl.uniform1f(removeColorThresholdLocation, options.removeColorThreshold)
      lastMapAppearance.removeColorThreshold = options.removeColorThreshold
    }

    if (lastMapAppearance.removeColorHardness !== options.removeColorHardness) {
      const removeColorHardnessLocation = this.#getUniformLocation(
        gl,
        program,
        'u_removeColorHardness'
      )
      gl.uniform1f(removeColorHardnessLocation, options.removeColorHardness)
      lastMapAppearance.removeColorHardness = options.removeColorHardness
    }

    // Colorize
    if (lastMapAppearance.colorize !== options.colorize) {
      const colorizeLocation = this.#getUniformLocation(
        gl,
        program,
        'u_colorize'
      )
      gl.uniform1f(colorizeLocation, options.colorize ? 1 : 0)
      lastMapAppearance.colorize = options.colorize
    }

    if (lastMapAppearance.colorizeColor !== options.colorizeColor) {
      const colorizeColorLocation = this.#getUniformLocation(
        gl,
        program,
        'u_colorizeColor'
      )
      gl.uniform3fv(
        colorizeColorLocation,
        getCachedFractionalRgb(options.colorizeColor)
      )
      lastMapAppearance.colorizeColor = options.colorizeColor
    }

    // Grid
    if (lastMapAppearance.renderGrid !== options.renderGrid) {
      const gridLocation = this.#getUniformLocation(gl, program, 'u_renderGrid')
      gl.uniform1f(gridLocation, options.renderGrid ? 1 : 0)
      lastMapAppearance.renderGrid = options.renderGrid
    }

    if (lastMapAppearance.renderGridColor !== options.renderGridColor) {
      const colorGrid = this.#getUniformLocation(
        gl,
        program,
        'u_renderGridColor'
      )
      gl.uniform4fv(
        colorGrid,
        getCachedFractionalOpaqueRgba(options.renderGridColor)
      )
      lastMapAppearance.renderGridColor = options.renderGridColor
    }

    // Distortion (drives both u_distortion and u_distortionMeasure)
    if (lastMapAppearance.distortionMeasure !== distortionMeasure) {
      const distortionLocation = this.#getUniformLocation(
        gl,
        program,
        'u_distortion'
      )
      gl.uniform1f(distortionLocation, distortionMeasure ? 1 : 0)

      const distortionMeasureLocation = this.#getUniformLocation(
        gl,
        program,
        'u_distortionMeasure'
      )
      gl.uniform1i(
        distortionMeasureLocation,
        distortionMeasure
          ? supportedDistortionMeasures.indexOf(distortionMeasure)
          : 0
      )
      lastMapAppearance.distortionMeasure = distortionMeasure
    }

    if (lastMapAppearance.distortionColor00 !== options.distortionColor00) {
      const distortionColor00Location = this.#getUniformLocation(
        gl,
        program,
        'u_distortionColor00'
      )
      gl.uniform4fv(
        distortionColor00Location,
        getCachedFractionalOpaqueRgba(options.distortionColor00)
      )
      lastMapAppearance.distortionColor00 = options.distortionColor00
    }

    if (lastMapAppearance.distortionColor01 !== options.distortionColor01) {
      const distortionColor01Location = this.#getUniformLocation(
        gl,
        program,
        'u_distortionColor01'
      )
      gl.uniform4fv(
        distortionColor01Location,
        getCachedFractionalOpaqueRgba(options.distortionColor01)
      )
      lastMapAppearance.distortionColor01 = options.distortionColor01
    }

    if (lastMapAppearance.distortionColor1 !== options.distortionColor1) {
      const distortionColor1Location = this.#getUniformLocation(
        gl,
        program,
        'u_distortionColor1'
      )
      gl.uniform4fv(
        distortionColor1Location,
        getCachedFractionalOpaqueRgba(options.distortionColor1)
      )
      lastMapAppearance.distortionColor1 = options.distortionColor1
    }

    if (lastMapAppearance.distortionColor2 !== options.distortionColor2) {
      const distortionColor2Location = this.#getUniformLocation(
        gl,
        program,
        'u_distortionColor2'
      )
      gl.uniform4fv(
        distortionColor2Location,
        getCachedFractionalOpaqueRgba(options.distortionColor2)
      )
      lastMapAppearance.distortionColor2 = options.distortionColor2
    }

    if (lastMapAppearance.distortionColor3 !== options.distortionColor3) {
      const distortionColorLocation3 = this.#getUniformLocation(
        gl,
        program,
        'u_distortionColor3'
      )
      gl.uniform4fv(
        distortionColorLocation3,
        getCachedFractionalOpaqueRgba(options.distortionColor3)
      )
      lastMapAppearance.distortionColor3 = options.distortionColor3
    }

    // Debug Triangles
    if (lastMapAppearance.debugTriangles !== options.debugTriangles) {
      const debugTrianglesLocation = this.#getUniformLocation(
        gl,
        program,
        'u_debugTriangles'
      )
      gl.uniform1f(debugTrianglesLocation, options.debugTriangles ? 1 : 0)
      lastMapAppearance.debugTriangles = options.debugTriangles
    }

    // Debug Tiles
    if (lastMapAppearance.debugTiles !== options.debugTiles) {
      const debugTilesLocation = this.#getUniformLocation(
        gl,
        program,
        'u_debugTiles'
      )
      gl.uniform1f(debugTilesLocation, options.debugTiles ? 1 : 0)
      lastMapAppearance.debugTiles = options.debugTiles
    }

    // Best scale factor
    const scaleFactorForViewportLocation = this.#getUniformLocation(
      gl,
      program,
      'u_scaleFactorForViewport'
    )
    const scaleFactorForViewport = webgl2WarpedMap.tileZoomLevelForViewport
      ? webgl2WarpedMap.tileZoomLevelForViewport.scaleFactor
      : 1
    gl.uniform1i(scaleFactorForViewportLocation, scaleFactorForViewport)

    // Number of resident tiles / texture slots (bounds the fragment shader's
    // loop; the texture array is allocated with headroom, so this is not its
    // depth)
    const textureSlotCountLocation = this.#getUniformLocation(
      gl,
      program,
      'u_textureSlotCount'
    )
    gl.uniform1i(textureSlotCountLocation, webgl2WarpedMap.textureSlotCount)

    // Cached tiles texture array
    const cachedTilesTextureArrayLocation = this.#getUniformLocation(
      gl,
      program,
      'u_cachedTilesTextureArray'
    )
    gl.uniform1i(cachedTilesTextureArrayLocation, 0)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, webgl2WarpedMap.cachedTilesTextureArray)

    // Cached tiles resource origin points and sizes texture
    const cachedTilesResourceOriginPointsAndSizesLocation =
      this.#getUniformLocation(
        gl,
        program,
        'u_cachedTilesResourceOriginPointsAndSizesTexture'
      )
    gl.uniform1i(cachedTilesResourceOriginPointsAndSizesLocation, 1)
    gl.activeTexture(gl.TEXTURE1)

    gl.bindTexture(
      gl.TEXTURE_2D,
      webgl2WarpedMap.cachedTilesResourceOriginPointsAndSizesTexture
    )

    // Cached tiles scale factors texture
    const cachedTileScaleFactorsTextureLocation = this.#getUniformLocation(
      gl,
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

  #setLinesProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.useProgram(program)

    // ViewportToClip Transform
    const viewportToClipHomogeneousTransformLocation = this.#getUniformLocation(
      gl,
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
    const clipToViewportHomogeneousTransformLocation = this.#getUniformLocation(
      gl,
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
    const animationProgressLocation = this.#getUniformLocation(
      gl,
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)
  }

  #setLinesProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
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
    const renderHomogeneousTransformLocation = this.#getUniformLocation(
      gl,
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )
  }

  #setPointsProgramUniforms() {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.useProgram(program)

    // Animation progress
    const animationProgressLocation = this.#getUniformLocation(
      gl,
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    // Device pixel ratio
    const devicePixelRatioLocation = this.#getUniformLocation(
      gl,
      program,
      'u_devicePixelRatio'
    )
    gl.uniform1f(devicePixelRatioLocation, this.viewport.devicePixelRatio)
  }

  #setPointsProgramMapUniforms(webgl2WarpedMap: WebGL2WarpedMap) {
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
    const renderHomogeneousTransformLocation = this.#getUniformLocation(
      gl,
      program,
      'u_renderHomogeneousTransform'
    )
    gl.uniformMatrix4fv(
      renderHomogeneousTransformLocation,
      false,
      homogeneousTransformToMatrix4(renderHomogeneousTransform)
    )
  }

  #startAnimation(
    mapIds: string[],
    partialAnimationOptions?: Partial<AnimationOptions>
  ) {
    const options = mergeOptions(
      DEFAULT_ANIMATION_OPTIONS,
      partialAnimationOptions
    )

    // This changed() is needed to prevent a blank canvas flash
    this.#changed()
    // This requestFetchableTiles() is needed to update
    // mapsWithFetchableTilesForViewport when visible is changed
    this.requestFetchableTiles()
    this.updateVertexBuffers(mapIds)

    if (this.lastAnimationFrameRequestId !== undefined) {
      cancelAnimationFrame(this.lastAnimationFrameRequestId)
    }

    this.animating = true
    this.animationProgress = 0
    this.animationStart = undefined
    this.lastAnimationFrameRequestId = requestAnimationFrame(
      ((now: number) =>
        this.#animationFrame(now, mapIds, options.duration)).bind(this)
    )
  }

  #animationFrame(now: number, mapIds: string[], duration: number) {
    if (!this.animationStart) {
      this.animationStart = now
    }

    if (now - this.animationStart < duration) {
      // Animation is ongoing
      // animationProgress goes from 0 to 1 throughout animation
      this.animationProgress = (now - this.animationStart) / duration

      // This changed() is needed to trigger the repaint of the canvas
      this.#changed()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        ((now: number) => this.#animationFrame(now, mapIds, duration)).bind(
          this
        )
      )
    } else {
      // Animation ended
      this.#finishAnimation(mapIds)
    }
  }

  #finishAnimation(mapIds: string[]) {
    this.resetPrevious()
    this.updateVertexBuffers(mapIds)

    this.animating = false
    this.animationProgress = 0
    this.animationStart = undefined

    this.previousSignificantViewport = this.viewport

    // Unthrottled prepareRenderInternal to avoid flickering when maps are made visible/invisible
    // and render is called before prepareRenderInternal throttled delay would have passed
    this.#prepareRenderInternal()
    this.#changed()
  }

  #changed() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  protected imageLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.IMAGELOADED, event.data)
      )
    }
  }

  protected imageInfoFetchError(event: Event) {
    if (event instanceof WarpedMapEvent && event.error) {
      this.dispatchEvent(
        new WarpedMapErrorEvent(
          event.error,
          event.data,
          WarpedMapEventType.IMAGEINFOFETCHERROR
        )
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

      webgl2WarpedMap.addCachedTile(tile)
      this.#markMapWithTextureToUpdate(mapId)
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

      if (webgl2WarpedMap.removeCachedTile(tileUrl)) {
        this.#markMapWithTextureToUpdate(mapId)
      }
    }
  }

  protected prepareChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      if (this.animating) {
        for (const webgl2WarpedMap of this.warpedMapList.getWarpedMaps({
          mapIds
        })) {
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
      const { mapIds, animationOptions } = event.data
      this.#startAnimation(mapIds, animationOptions)
    }
  }

  protected immediateChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      if (!event.data?.mapIds) {
        throw new Error('Event data missing')
      }
      const { mapIds } = event.data
      this.#finishAnimation(mapIds)
    }
  }

  /**
   * Mark a map's textures as needing an upload and request a repaint. The
   * actual (bounded) upload happens in #updateMapTextures at the start of the
   * next render. Tiles arrive as separate async worker messages and
   * triggerRepaint is cheap and coalesced by the map library to one repaint per
   * frame, so requesting one per arrival is fine.
   */
  #markMapWithTextureToUpdate(mapId: string) {
    this.#mapsWithTextureToUpdate.add(mapId)
    this.#changed()
  }

  /**
   * Upload pending tile textures for the dirty maps, bounded by a global
   * per-frame budget (MAX_TILE_UPLOADS_PER_FRAME). Maps that still have a
   * backlog afterwards (budget exhausted, or more tiles than the budget) stay
   * marked dirty and a repaint is requested so they continue on later frames.
   */
  #updateMapTextures() {
    if (this.#mapsWithTextureToUpdate.size === 0) {
      return
    }

    let budget = MAX_TILE_UPLOADS_PER_FRAME
    for (const mapId of this.#mapsWithTextureToUpdate) {
      if (budget <= 0) {
        break
      }
      const webgl2WarpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (!webgl2WarpedMap) {
        this.#mapsWithTextureToUpdate.delete(mapId)
        continue
      }
      const { uploadsPerformed, backlog } =
        webgl2WarpedMap.updateTextures(budget)
      budget -= uploadsPerformed
      if (backlog <= 0) {
        this.#mapsWithTextureToUpdate.delete(mapId)
      }
    }

    // Budget exhausted or maps still have a backlog: continue next frame.
    if (this.#mapsWithTextureToUpdate.size > 0) {
      this.#changed()
    }
  }

  contextLost() {
    this.disableRender = true

    this.cancelThrottledFunctions()

    // The textures are gone with the context; drop any pending upload work.
    this.#mapsWithTextureToUpdate.clear()

    this.tileCache.clear()
  }

  contextRestored() {
    this.initializeWebGL(this.gl)

    this.disableRender = false
  }
}
