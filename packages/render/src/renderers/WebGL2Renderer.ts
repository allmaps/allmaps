import { throttle } from 'lodash-es'

import BaseRenderer from './BaseRenderer.js'
import WebGL2WarpedMap, {
  createWebGL2WarpedMapFactory
} from '../maps/WebGL2WarpedMap.js'
import CacheableImageBitmapTile from '../tilecache/CacheableImageBitmapTile.js'
import {
  distance,
  hexToFractionalRgb,
  maxOfNumberOrUndefined
} from '@allmaps/stdlib'
import { supportedDistortionMeasures } from '@allmaps/transform'
import { red, green, darkblue, yellow, white, black } from '@allmaps/tailwind'

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

import mapsVertexShaderSource from '../shaders/maps/vertex-shader.glsl'
import mapsFragmentShaderSource from '../shaders/maps/fragment-shader.glsl'
import linesVertexShaderSource from '../shaders/lines/vertex-shader.glsl'
import linesFragmentShaderSource from '../shaders/lines/fragment-shader.glsl'
import pointsVertexShaderSource from '../shaders/points/vertex-shader.glsl'
import pointsFragmentShaderSource from '../shaders/points/fragment-shader.glsl'

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

const THROTTLE_PREPARE_WAIT_MS = 500
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
  mapsProgram: WebGLProgram
  pointsProgram: WebGLProgram
  linesProgram: WebGLProgram

  previousSignificantViewport: Viewport | undefined

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  invertedRenderTransform: Transform

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  animationProgress = 0

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
    const mapsVertexShader = createShader(
      gl,
      gl.VERTEX_SHADER,
      mapsVertexShaderSource
    )
    const mapsFragmentShader = createShader(
      gl,
      gl.FRAGMENT_SHADER,
      mapsFragmentShaderSource
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

    const mapsProgram = createProgram(gl, mapsVertexShader, mapsFragmentShader)
    const pointsProgram = createProgram(
      gl,
      pointsVertexShader,
      pointsFragmentShader
    )
    const linesProgram = createProgram(
      gl,
      linesVertexShader,
      linesFragmentShader
    )

    super(
      CacheableImageBitmapTile.createFactory(),
      createWebGL2WarpedMapFactory(
        gl,
        mapsProgram,
        pointsProgram,
        linesProgram
      ),
      options
    )

    this.gl = gl
    this.mapsProgram = mapsProgram
    this.pointsProgram = pointsProgram
    this.linesProgram = linesProgram

    // Unclear how to remove shaders, possibly already after linking to program, see:
    // https://stackoverflow.com/questions/9113154/proper-way-to-delete-glsl-shader
    // https://stackoverflow.com/questions/27237696/webgl-detach-and-delete-shaders-after-linking
    gl.deleteShader(mapsVertexShader)
    gl.deleteShader(mapsFragmentShader)
    gl.deleteShader(mapsVertexShader)
    gl.deleteShader(mapsFragmentShader)
    gl.deleteShader(mapsVertexShader)
    gl.deleteShader(mapsFragmentShader)

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

  dispose() {
    for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
      this.removeEventListenersFromWebGL2WarpedMap(warpedMap)
      warpedMap.dispose()
    }

    this.tileCache.clear()
    this.tileCache.dispose()

    this.removeEventListeners()

    this.gl.deleteProgram(this.mapsProgram)
    // Can't delete context, see:
    // https://stackoverflow.com/questions/14970206/deleting-webgl-contexts
  }

  private prepareRenderInternal(): void {
    this.updateRequestedTiles()
    this.updateVertexBuffers()
  }

  protected shouldUpdateRequestedTiles(): boolean {
    // Returns whether requested tiles should be updated

    // Returns true wehn the viewport moved significantly
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

    for (const mapId of this.mapsInViewport) {
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

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

    this.renderMaps()
    this.renderLines()
    this.renderPoints()
  }

  private renderMaps(): void {
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
    const program = this.mapsProgram

    gl.useProgram(program)

    // Global uniform

    // Render transform

    const renderTransformLocation = gl.getUniformLocation(
      program,
      'u_renderTransform'
    )
    gl.uniformMatrix4fv(
      renderTransformLocation,
      false,
      transformToMatrix4(renderTransform)
    )

    // Animation progress

    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    // Distortion colors
    // TODO: make these colors pickable

    const colorDistortion00 = gl.getUniformLocation(
      program,
      'u_colorDistortion00'
    )
    gl.uniform4f(colorDistortion00, ...hexToFractionalRgb(red), 1)

    const colorDistortion01 = gl.getUniformLocation(
      program,
      'u_colorDistortion01'
    )
    gl.uniform4f(colorDistortion01, ...hexToFractionalRgb(darkblue), 1)

    const colorDistortion1 = gl.getUniformLocation(
      program,
      'u_colorDistortion1'
    )
    gl.uniform4f(colorDistortion1, ...hexToFractionalRgb(green), 1)

    const colorDistortion2 = gl.getUniformLocation(
      program,
      'u_colorDistortion2'
    )
    gl.uniform4f(colorDistortion2, ...hexToFractionalRgb(yellow), 1)

    const colorDistortion3 = gl.getUniformLocation(
      program,
      'u_colorDistortion3'
    )
    gl.uniform4f(colorDistortion3, ...hexToFractionalRgb(red), 1)

    const colorGrid = gl.getUniformLocation(program, 'u_colorGrid')
    gl.uniform4f(colorGrid, ...hexToFractionalRgb(black), 1)

    for (const mapId of this.mapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      // Map-specific uniforms

      this.setRenderOptionsUniforms(this.renderOptions, warpedMap.renderOptions)

      // Opacity

      const opacityLocation = gl.getUniformLocation(program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.opacity * warpedMap.opacity)

      // Saturation

      const saturationLocation = gl.getUniformLocation(program, 'u_saturation')
      gl.uniform1f(saturationLocation, this.saturation * warpedMap.saturation)

      // Distortion

      const distortionLocation = gl.getUniformLocation(program, 'u_distortion')
      gl.uniform1f(distortionLocation, warpedMap.distortionMeasure ? 1 : 0)

      if (warpedMap.distortionMeasure) {
        const distortionOptionsDistortionMeasureLocation =
          gl.getUniformLocation(program, 'u_distortionOptionsdistortionMeasure')
        gl.uniform1i(
          distortionOptionsDistortionMeasureLocation,
          supportedDistortionMeasures.indexOf(warpedMap.distortionMeasure)
        )
      }

      // Best scale factor

      const bestScaleFactorLocation = gl.getUniformLocation(
        program,
        'u_bestScaleFactor'
      )
      const bestScaleFactor = warpedMap.bestScaleFactor
      gl.uniform1i(bestScaleFactorLocation, bestScaleFactor)

      // Packed tiles texture

      const packedTilesTextureLocation = gl.getUniformLocation(
        program,
        'u_packedTilesTexture'
      )
      gl.uniform1i(packedTilesTextureLocation, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, warpedMap.packedTilesTexture)

      // Packed tiles positions texture

      const packedTilesPositionsTextureLocation = gl.getUniformLocation(
        program,
        'u_packedTilesPositionsTexture'
      )
      gl.uniform1i(packedTilesPositionsTextureLocation, 1)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, warpedMap.packedTilesPositionsTexture)

      // Packed tiles resource positions and dimensions texture

      const packedTilesResourcePositionsAndDimensionsLocation =
        gl.getUniformLocation(
          program,
          'u_packedTilesResourcePositionsAndDimensionsTexture'
        )
      gl.uniform1i(packedTilesResourcePositionsAndDimensionsLocation, 2)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(
        gl.TEXTURE_2D,
        warpedMap.packedTilesResourcePositionsAndDimensionsTexture
      )

      // Packed tiles scale factors texture

      const packedTileScaleFactorsTextureLocation = gl.getUniformLocation(
        program,
        'u_packedTilesScaleFactorsTexture'
      )
      gl.uniform1i(packedTileScaleFactorsTextureLocation, 3)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, warpedMap.packedTilesScaleFactorsTexture)

      // Draw each map

      const count = warpedMap.resourceTrianglePoints.length

      const primitiveType = this.gl.TRIANGLES
      const offset = 0

      gl.bindVertexArray(warpedMap.mapsVao)
      gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderLines(): void {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram

    gl.useProgram(program)

    // Global uniform

    const projectedGeoToViewportTransformLocation = gl.getUniformLocation(
      program,
      'u_projectedGeoToViewportTransform'
    )
    gl.uniformMatrix4fv(
      projectedGeoToViewportTransformLocation,
      false,
      transformToMatrix4(this.viewport.projectedGeoToViewportTransform)
    )

    const viewportToClipTransformLocation = gl.getUniformLocation(
      program,
      'u_viewportToClipTransform'
    )
    gl.uniformMatrix4fv(
      viewportToClipTransformLocation,
      false,
      transformToMatrix4(this.viewport.viewportToClipTransform)
    )

    // Animation progress

    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    for (const mapId of this.mapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      // (none)

      // Draw lines for each map

      const count = warpedMap.gcps.length * 3 * 2

      const primitiveType = this.gl.TRIANGLES
      const offset = 0

      gl.bindVertexArray(warpedMap.linesVao)
      gl.drawArrays(primitiveType, offset, count)
    }
  }

  private renderPoints(): void {
    if (!this.viewport) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram

    // Render Points
    // TODO: place in separate function
    // So 'pointsProgramRenderTransformLocation' can be renamed 'RenderTransformLocation'

    gl.useProgram(program)

    // Global uniform

    const projectedGeoToViewportTransformLocation = gl.getUniformLocation(
      program,
      'u_projectedGeoToViewportTransform'
    )
    gl.uniformMatrix4fv(
      projectedGeoToViewportTransformLocation,
      false,
      transformToMatrix4(this.viewport.projectedGeoToViewportTransform)
    )

    const viewportToClipTransformLocation = gl.getUniformLocation(
      program,
      'u_viewportToClipTransform'
    )
    gl.uniformMatrix4fv(
      viewportToClipTransformLocation,
      false,
      transformToMatrix4(this.viewport.viewportToClipTransform)
    )

    // Animation progress

    const animationProgressLocation = gl.getUniformLocation(
      program,
      'u_animationProgress'
    )
    gl.uniform1f(animationProgressLocation, this.animationProgress)

    for (const mapId of this.mapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      // (none)

      // Draw points for each map

      const count = warpedMap.gcps.length * warpedMap.pointLayers.length

      const primitiveType = this.gl.POINTS
      const offset = 0

      gl.bindVertexArray(warpedMap.pointsVao)
      gl.drawArrays(primitiveType, offset, count)
    }
  }

  private setRenderOptionsUniforms(
    layerRenderOptions: RenderOptions,
    mapRenderOptions: RenderOptions
  ) {
    const gl = this.gl
    const program = this.mapsProgram

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

    const removeColorLocation = gl.getUniformLocation(program, 'u_removeColor')
    gl.uniform1f(removeColorLocation, removeColorOptionsColor ? 1 : 0)

    if (removeColorOptionsColor) {
      const removeColorOptionsColorLocation = gl.getUniformLocation(
        program,
        'u_removeColorOptionsColor'
      )
      gl.uniform3fv(removeColorOptionsColorLocation, removeColorOptionsColor)

      const removeColorOptionsThresholdLocation = gl.getUniformLocation(
        program,
        'u_removeColorOptionsThreshold'
      )
      gl.uniform1f(
        removeColorOptionsThresholdLocation,
        renderOptions.removeColorOptions?.threshold ||
          DEFAULT_REMOVE_COLOR_THRESHOLD
      )

      const removeColorOptionsHardnessLocation = gl.getUniformLocation(
        program,
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

    const colorizeLocation = gl.getUniformLocation(program, 'u_colorize')
    gl.uniform1f(colorizeLocation, colorizeOptionsColor ? 1 : 0)

    if (colorizeOptionsColor) {
      const colorizeOptionsColorLocation = gl.getUniformLocation(
        program,
        'u_colorizeOptionsColor'
      )
      gl.uniform3fv(colorizeOptionsColorLocation, colorizeOptionsColor)
    }

    // Grid uniforms

    const gridOptionsGrid = renderOptions.gridOptions?.enabled

    const gridLocation = gl.getUniformLocation(program, 'u_grid')
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
      // animationProgress goes from 0 to 1 throughout animation
      this.animationProgress =
        (now - this.transformationTransitionStart) / ANIMATION_DURATION

      this.renderInternal()

      this.lastAnimationFrameRequestId = requestAnimationFrame(
        this.transformationTransitionFrame.bind(this)
      )
    } else {
      for (const warpedMap of this.warpedMapList.getWarpedMaps()) {
        warpedMap.resetPrevious()
      }
      this.updateVertexBuffers()

      this.animating = false
      this.animationProgress = 0
      this.transformationTransitionStart = undefined
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

  protected handlePreChange(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const warpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        if (this.animating) {
          warpedMap.mixPreviousAndNew(1 - this.animationProgress)
        }
      }
    }
  }

  protected transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.updateVertexBuffers()
      this.startTransformationTransition() // TODO: pass mapIds here reset only those mapIds
    }
  }

  protected distortionChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.updateVertexBuffers()
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
}
