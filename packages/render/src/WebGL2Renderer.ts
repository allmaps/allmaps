import { throttle } from 'lodash-es'

import TileCache from './TileCache.js'
import FetchableMapTile from './FetchableTile.js'
import WarpedMapList from './WarpedMapList.js'
import WebGL2WarpedMap from './WebGL2WarpedMap.js'

import {
  WarpedMapEvent,
  WarpedMapEventType,
  WarpedMapTileEventDetail
} from './shared/events.js'
import {
  geoBboxToResourceRing,
  getBestTileZoomLevelForScale,
  computeTilesCoveringRingAtTileZoomLevel
} from './shared/tiles.js'
import {
  createTransform,
  multiplyTransform,
  invertTransform,
  transformToMatrix4
} from './shared/matrix.js'
import { createShader, createProgram } from './shared/webgl2.js'

import vertexShaderSource from './shaders/vertex-shader.glsl?raw'
import fragmentShaderSource from './shaders/fragment-shader.glsl?raw'

import {
  distance,
  maxOfNumberOrUndefined,
  bboxToDiameter,
  bboxToCenter
} from '@allmaps/stdlib'

import type { DebouncedFunc } from 'lodash-es'

import type { Transform } from '@allmaps/types'

import type Viewport from './Viewport.js'
import type WarpedMap from './WarpedMap.js'

import type {
  RenderOptions,
  RemoveColorOptions,
  ColorizeOptions
} from './shared/types.js'

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
const MIN_VIEWPORT_DIAMETER = 5
const SIGNIFICANT_VIEWPORT_DISTANCE = 5
const ANIMATION_DURATION = 750

/**
 * Class that render warped maps to a HTML canvas element using WebGL 2
 *
 * Its main function is `render`
 *
 * @export
 * @class WebGL2Renderer
 * @typedef {WebGL2Renderer}
 * @extends {EventTarget}
 */
export default class WebGL2Renderer extends EventTarget {
  gl: WebGL2RenderingContext
  program: WebGLProgram

  warpedMapList: WarpedMapList

  webgl2WarpedMapsById: Map<string, WebGL2WarpedMap> = new Map()

  tileCache: TileCache = new TileCache()

  viewport: Viewport | undefined
  previousSignificantViewport: Viewport | undefined

  mapsInViewport: Set<string> = new Set()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  invertedRenderTransform: Transform

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  animationProgress = 1

  private throttledPrepareRenderInternal: DebouncedFunc<
    typeof this.prepareRenderInternal
  >

  private throttledChanged: DebouncedFunc<typeof this.changed>

  /**
   * Creates an instance of WebGL2Renderer.
   *
   * @constructor
   * @param {WebGL2RenderingContext} gl - the WebGL2 rendering context
   * @param {WarpedMapList} warpedMapList - the list of warped maps to render
   */
  constructor(gl: WebGL2RenderingContext, warpedMapList: WarpedMapList) {
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

    // Unclear how to remove shaders, possibly already after linking to program, see:
    // https://stackoverflow.com/questions/9113154/proper-way-to-delete-glsl-shader
    // https://stackoverflow.com/questions/27237696/webgl-detach-and-delete-shaders-after-linking
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)

    if (webGL2WarpedMap) {
      return webGL2WarpedMap.opacity
    }
  }

  /**
   * Set the opacity of a map
   *
   * @param {string} mapId - ID of the map
   * @param {number} opacity - opacity to set
   */
  setMapOpacity(mapId: string, opacity: number): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.opacity = Math.min(Math.max(opacity, 0), 1)
    }
  }

  /**
   * Rreset the opacity of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapOpacity(mapId: string): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.opacity = DEFAULT_OPACITY
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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.renderOptions.removeColorOptions
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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.removeColorOptions = removeColorOptions
    }
  }

  /**
   * Reset the remove color options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapRemoveColorOptions(mapId: string): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.removeColorOptions = undefined
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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.renderOptions.colorizeOptions
    }
  }

  /**
   * Set the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   * @param {ColorizeOptions} colorizeOptions - the colorize options to set
   */
  setMapColorizeOptions(mapId: string, colorizeOptions: ColorizeOptions): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.colorizeOptions = colorizeOptions
    }
  }

  /**
   * Reset the colorize options of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapColorizeOptions(mapId: string): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.colorizeOptions = undefined
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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.saturation
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
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.saturation = saturation
    }
  }

  /**
   * Reset the saturation of a map
   *
   * @param {string} mapId - ID of the map
   */
  resetMapSaturation(mapId: string): void {
    const webGL2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.saturation = DEFAULT_SATURATION
    }
  }

  /**
   * Render the map for a given viewport
   *
   * @param {Viewport} viewport - the current viewport
   */
  render(viewport: Viewport): void {
    this.viewport = viewport
    if (this.checkAndLoadImageInfos()) {
      // Don't fire throttled function unless it could result in something
      this.throttledPrepareRenderInternal()
    }
    this.renderInternal()
  }

  clear() {
    this.warpedMapList.clear()
    this.webgl2WarpedMapsById = new Map()
    this.mapsInViewport = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  dispose() {
    for (const webgl2warpedMap of this.webgl2WarpedMapsById.values()) {
      this.removeEventListenersFromWebGL2WarpedMap(webgl2warpedMap)
      webgl2warpedMap.dispose()
    }

    this.tileCache.clear()
    this.tileCache.dispose()

    this.removeEventListeners()

    this.gl.deleteProgram(this.program)
    // Can't delete context, see:
    // https://stackoverflow.com/questions/14970206/deleting-webgl-contexts
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
    }
  }

  private checkAndLoadImageInfos(): boolean {
    if (!this.viewport) {
      return false
    }

    const checks = Array.from(
      this.warpedMapList.getMapsByGeoBbox(this.viewport.geoRectangleBbox)
    )
      .map((mapId) => this.warpedMapList.getWarpedMap(mapId) as WarpedMap)
      .map((warpedMap) => {
        if (!warpedMap.hasImageInfo()) {
          if (!warpedMap.loadingImageInfo) {
            // Load if non-existent and not already loading
            warpedMap.loadImageInfo()
          }
          return false
        } else {
          return true
        }
      })
    return checks.some((val) => val === true)
  }

  private prepareRenderInternal(): void {
    this.updateRequestedTiles()
    this.updateVertexBuffers()
  }

  private updateRequestedTiles(): void {
    if (!this.viewport) {
      return
    }

    if (!this.viewportMovedSignificantly()) {
      return
    }

    if (this.animating) {
      return
    }

    const possibleMapsInViewport = Array.from(
      this.warpedMapList.getMapsByGeoBbox(this.viewport.geoRectangleBbox)
    ).sort(
      (mapId0, mapId1) =>
        distance(
          bboxToCenter(this.warpedMapList.getWarpedMap(mapId0)!.geoMaskBbox),
          this.viewport!.geoCenter
        ) -
        distance(
          bboxToCenter(this.warpedMapList.getWarpedMap(mapId1)!.geoMaskBbox),
          this.viewport!.geoCenter
        )
    )

    const requestedTiles: FetchableMapTile[] = []
    for (const mapId of possibleMapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      if (!warpedMap.visible) {
        continue
      }

      if (!warpedMap.hasImageInfo()) {
        // Note: don't load image info here
        // this would imply waiting for the first throttling cycle to complete
        // before acting on a sucessful load
        continue
      }

      // Only draw maps that are larger than MIN_VIEWPORT_DIAMETER pixels are returned
      // Note that diameter is equivalent to geometryToDiameter(warpedMap.projectedGeoMask) / this.viewport.projectedGeoPerViewportScale
      if (
        bboxToDiameter(warpedMap.getViewportMaskBbox(this.viewport)) <
        MIN_VIEWPORT_DIAMETER
      ) {
        continue
      }

      // Note the equivalence of the following two:
      // - warpedMap.getApproxResourceToCanvasScale(this.viewport)
      // - warpedMap.resourceToProjectedGeoScale * this.viewport.projectedGeoPerCanvasScale
      const tileZoomLevel = getBestTileZoomLevelForScale(
        warpedMap.parsedImage,
        warpedMap.getResourceToCanvasScale(this.viewport)
      )

      warpedMap.setBestScaleFactor(tileZoomLevel.scaleFactor)

      // Transforming the viewport back to resource
      const projectedTransformerOptions = {
        // This can be expensive at high maxDepth and seems to work fine with maxDepth = 0
        maxDepth: 0
      }

      const resourceViewportRing = geoBboxToResourceRing(
        warpedMap.projectedTransformer,
        this.viewport.projectedGeoRectangleBbox,
        projectedTransformerOptions
      )

      warpedMap.setResourceViewportRing(resourceViewportRing)

      // This returns tiles sorted by distance from center of resourceViewportRing
      const tiles = computeTilesCoveringRingAtTileZoomLevel(
        resourceViewportRing,
        tileZoomLevel,
        warpedMap.parsedImage
      )

      for (const tile of tiles) {
        requestedTiles.push(new FetchableMapTile(tile, warpedMap))
      }
    }

    this.tileCache.requestFetcableMapTiles(requestedTiles)
    this.updateMapsInViewport(requestedTiles)
  }

  private updateVertexBuffers() {
    if (!this.viewport) {
      return
    }

    this.invertedRenderTransform = invertTransform(
      this.viewport.projectedGeoToClipTransform
    )

    for (const mapId of this.mapsInViewport) {
      const webgl2WarpedMap = this.webgl2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        break
      }

      webgl2WarpedMap.updateVertexBuffers(
        this.viewport.projectedGeoToClipTransform
      )
    }
  }

  private viewportMovedSignificantly(): boolean {
    // Returns whether the viewport moved significantly (or didn't move at all).
    // This to prevent updating requested tiles on minimal movements.
    // No move should also return true, e.g. when this function is called multiple times during startup, without changes to the viewport

    // TODO: this could be a problem if the viewport is quickly and continously moved
    // within the tolerance during initial loading.
    // Possible solution: adding a 'allrendered' event and listening to it.

    if (!this.viewport) {
      return false
    }
    if (!this.previousSignificantViewport) {
      this.previousSignificantViewport = this.viewport
      return true // No move should also return true
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
        // No move should also pass, e.g. when this function is called multiple times during startup,
        // without changes to the viewport
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

  private updateMapsInViewport(tiles: FetchableMapTile[]) {
    // TODO: handle everything as Set() once JS supports filter on sets.
    // And speed up with annonymous functions with the Set.prototype.difference() once broadly supported
    const oldMapsInViewportAsArray = Array.from(this.mapsInViewport)
    const newMapsInViewportAsArray = tiles
      .map((tile) => tile.mapId)
      .filter((v, i, a) => {
        // filter out duplicate mapIds
        return a.indexOf(v) === i
      })

    this.mapsInViewport = new Set(
      newMapsInViewportAsArray.sort((mapIdA, mapIdB) => {
        const zIndexA = this.warpedMapList.getMapZIndex(mapIdA)
        const zIndexB = this.warpedMapList.getMapZIndex(mapIdB)
        if (zIndexA !== undefined && zIndexB !== undefined) {
          return zIndexA - zIndexB
        }
        return 0
      })
    )

    const enteringMapsInViewport = newMapsInViewportAsArray.filter(
      (mapId) => !oldMapsInViewportAsArray.includes(mapId)
    )
    const leavingMapsInViewport = oldMapsInViewportAsArray.filter(
      (mapId) => !newMapsInViewportAsArray.includes(mapId)
    )

    for (const mapId in enteringMapsInViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPENTER, mapId)
      )
    }
    for (const mapId in leavingMapsInViewport) {
      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.WARPEDMAPLEAVE, mapId)
      )
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

    // Global uniform

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
      const webgl2WarpedMap = this.webgl2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        continue
      }

      // Map-specific uniforms

      this.setRenderOptionsUniforms(
        this.renderOptions,
        webgl2WarpedMap.renderOptions
      )

      // Opacity

      const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.opacity * webgl2WarpedMap.opacity)

      // Saturation

      const saturationLocation = gl.getUniformLocation(
        this.program,
        'u_saturation'
      )
      gl.uniform1f(
        saturationLocation,
        this.saturation * webgl2WarpedMap.saturation
      )

      // Best scale factor

      const bestScaleFactorLocation = gl.getUniformLocation(
        this.program,
        'u_bestScaleFactor'
      )
      const bestScaleFactor = webgl2WarpedMap.warpedMap.bestScaleFactor
      gl.uniform1i(bestScaleFactorLocation, bestScaleFactor)

      // Packed tiles texture

      const packedTilesTextureLocation = gl.getUniformLocation(
        this.program,
        'u_packedTilesTexture'
      )
      gl.uniform1i(packedTilesTextureLocation, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.packedTilesTexture)

      // Packed tiles positions texture

      const packedTilesPositionsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_packedTilesPositionsTexture'
      )
      gl.uniform1i(packedTilesPositionsTextureLocation, 1)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.packedTilesPositionsTexture)

      // Packed tiles resource positions and dimensions texture

      const packedTilesResourcePositionsAndDimensionsLocation =
        gl.getUniformLocation(
          this.program,
          'u_packedTilesResourcePositionsAndDimensionsTexture'
        )
      gl.uniform1i(packedTilesResourcePositionsAndDimensionsLocation, 2)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(
        gl.TEXTURE_2D,
        webgl2WarpedMap.packedTilesResourcePositionsAndDimensionsTexture
      )

      // Packed tiles scale factors texture

      const packedTileScaleFactorsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_packedTilesScaleFactorsTexture'
      )
      gl.uniform1i(packedTileScaleFactorsTextureLocation, 3)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(
        gl.TEXTURE_2D,
        webgl2WarpedMap.packedTilesScaleFactorsTexture
      )

      // Draw each map

      const vao = webgl2WarpedMap.vao
      const count = webgl2WarpedMap.warpedMap.resourceTrianglePoints.length

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
  }

  private changed() {
    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
  }

  private imageInfoLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    }
  }

  private mapTileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const tile = this.tileCache.getCacheableTile(tileUrl)

      if (!tile) {
        return
      }

      if (!tile.isCachedTile()) {
        return
      }

      const webgl2WarpedMap = this.webgl2WarpedMapsById.get(mapId)
      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.addCachedTileAndUpdateTextures(tile)
    }
  }

  private mapTileRemoved(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const webgl2WarpedMap = this.webgl2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.removeCachedTileAndUpdateTextures(tileUrl)
    }
  }

  private warpedMapAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)
      if (warpedMap) {
        const webgl2WarpedMap = new WebGL2WarpedMap(
          this.gl,
          this.program,
          warpedMap
        )
        this.webgl2WarpedMapsById.set(warpedMap.mapId, webgl2WarpedMap)
        this.addEventListenersToWebGL2WarpedMap(webgl2WarpedMap)
      }
    }
  }

  private transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const warpedMap of this.warpedMapList.getWarpedMaps(mapIds)) {
        if (this.animating) {
          warpedMap.mixProjectedGeoTrianglePoints(this.animationProgress)
        }
        warpedMap.updateProjectedGeoTrianglePoints(false)
      }

      this.updateVertexBuffers()
      this.startTransformationTransition()
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

  private addEventListeners() {
    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )
  }

  private removeEventListeners() {
    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILELOADED,
      this.mapTileLoaded.bind(this)
    )

    this.tileCache.removeEventListener(
      WarpedMapEventType.MAPTILEREMOVED,
      this.mapTileRemoved.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.IMAGEINFOLOADED,
      this.imageInfoLoaded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.removeEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )
  }
}
