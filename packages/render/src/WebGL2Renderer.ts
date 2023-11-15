import { throttle, debounce } from 'lodash-es'

import TileCache from './TileCache.js'
import { hasImageInfo } from './WarpedMap.js'
import WarpedMapList from './WarpedMapList.js'
import WebGL2WarpedMap from './WebGL2WarpedMap.js'

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
import {
  geoBboxToResourceRing,
  getBestTileZoomLevelForScale as getBestTileZoomLevel,
  computeTiles,
  tileToNeededTile
} from './shared/tiles.js'
import { createShader, createProgram } from './shared/webgl2.js'

import vertexShaderSource from './shaders/vertex-shader.glsl?raw'
import fragmentShaderSource from './shaders/fragment-shader.glsl?raw'

import {
  computeBbox,
  bboxToDiameter,
  bboxToExtent,
  extentsToScale,
  distance,
  maxOfNumberOrUndefined
} from '@allmaps/stdlib'

import type { DebouncedFunc } from 'lodash-es'

import type Viewport from './Viewport.js'

import type {
  RenderOptions,
  RemoveBackgroundOptions,
  ColorizeOptions
} from './shared/types.js'

import type { Transform, NeededTile, TileZoomLevel } from '@allmaps/types'

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
const MIN_RESOURCE_SIZE = 5
const SIGNIFICANT_VIEWPORT_DISTANCE = 5

export default class WebGL2Renderer extends EventTarget {
  tileCache: TileCache = new TileCache()

  warpedMapList: WarpedMapList

  gl: WebGL2RenderingContext
  program: WebGLProgram

  webGL2WarpedMapsById: Map<string, WebGL2WarpedMap> = new Map()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  invertedRenderTransform: Transform

  viewport: Viewport | undefined
  previousSignificantViewport: Viewport | undefined

  mapsInViewport: Set<string> = new Set()
  bestZoomLevelByMapIdAtViewport: Map<string, TileZoomLevel> = new Map()

  lastAnimationFrameRequestId: number | undefined
  animating = false
  transformationTransitionStart: number | undefined
  transformationTransitionDuration = 750
  animationProgress = 1

  throttledPrepareRender: DebouncedFunc<typeof this.prepareRenderInternal>
  debouncedRenderInternal: DebouncedFunc<typeof this.prepareRenderInternal>

  constructor(warpedMapList: WarpedMapList, gl: WebGL2RenderingContext) {
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

    this.invertedRenderTransform = createTransform()

    this.addEventListener(
      WarpedMapEventType.IMAGEINFONEEDED,
      this.imageInfoNeeded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILELOADED,
      this.tileLoaded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILEREMOVED,
      this.tileRemoved.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.WARPEDMAPADDED,
      this.warpedMapAdded.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.TRANSFORMATIONCHANGED,
      this.transformationChanged.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.RESOURCEMASKUPDATED,
      this.resourceMaskUpdated.bind(this)
    )

    this.warpedMapList.addEventListener(
      WarpedMapEventType.CLEARED,
      this.clear.bind(this)
    )

    this.throttledPrepareRender = throttle(
      this.prepareRenderInternal.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )

    this.debouncedRenderInternal = debounce(
      this.renderInternal.bind(this),
      DEBOUNCE_WAIT_MS,
      DEBOUNCE_OPTIONS
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
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)

    if (webGL2WarpedMap) {
      return webGL2WarpedMap.opacity
    }
  }

  setMapOpacity(mapId: string, opacity: number): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.opacity = Math.min(Math.max(opacity, 0), 1)
    }
  }

  resetMapOpacity(mapId: string): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.opacity = DEFAULT_OPACITY
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
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.renderOptions.removeBackground
    }
  }

  setMapRemoveBackground(
    mapId: string,
    removeBackgroundOptions: RemoveBackgroundOptions
  ): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.removeBackground = removeBackgroundOptions
    }
  }

  resetMapRemoveBackground(mapId: string): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.removeBackground = undefined
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
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.renderOptions.colorize
    }
  }

  setMapColorize(mapId: string, colorizeOptions: ColorizeOptions): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.colorize = colorizeOptions
    }
  }

  resetMapColorize(mapId: string): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.renderOptions.colorize = undefined
    }
  }

  getSaturation(): number {
    return this.saturation
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

  getMapSaturation(mapId: string): number | undefined {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      return webGL2WarpedMap.saturation
    }
  }

  /**
   * Set the saturation of a single warped map
   * @param mapId the ID of the warped map
   * @param saturation 0 - grayscale, 1 - original colors
   */
  setMapSaturation(mapId: string, saturation: number): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.saturation = saturation
    }
  }

  resetMapSaturation(mapId: string): void {
    const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
    if (webGL2WarpedMap) {
      webGL2WarpedMap.saturation = DEFAULT_SATURATION
    }
  }

  render(viewport: Viewport): void {
    this.viewport = viewport
    this.throttledPrepareRender()
    this.renderInternal()
    this.debouncedRenderInternal()
  }

  clear() {
    this.webGL2WarpedMapsById = new Map()
    this.mapsInViewport = new Set()
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT | this.gl.COLOR_BUFFER_BIT)
    this.tileCache.clear()
  }

  dispose() {
    for (const warpedMapWebGLRenderer of this.webGL2WarpedMapsById.values()) {
      warpedMapWebGLRenderer.dispose()
    }

    // TODO: remove vertexShader, fragmentShader, program
    // TODO: remove event listeners
    //  - this.tileCache
  }

  private startTransformationTransition() {
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

  private transformationTransitionFrame(now: number) {
    if (!this.transformationTransitionStart) {
      this.transformationTransitionStart = now
    }

    if (
      now - this.transformationTransitionStart >
      this.transformationTransitionDuration
    ) {
      for (const webGL2WarpedMap of this.webGL2WarpedMapsById.values()) {
        webGL2WarpedMap.resetCurrentTriangles()
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

  private prepareRenderInternal(): void {
    // TODO: reset maps not in viewport, make sure these only
    // get drawn when they are visible AND when they have their buffers
    // updated.
    this.updateVertexBuffers()
    this.updateNeededTiles()
  }

  private updateVertexBuffers() {
    if (!this.viewport) {
      return
    }

    const projectionTransform = this.viewport.projectionTransform

    this.invertedRenderTransform = invertTransform(projectionTransform)

    for (const mapId of this.mapsInViewport) {
      const webgl2WarpedMap = this.webGL2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        break
      }

      webgl2WarpedMap.updateVertexBuffers(projectionTransform)
    }
  }

  private updateNeededTiles(): void {
    if (!this.viewport) {
      return
    }

    if (!this.viewportMovedSignificantly()) {
      return
    }

    const possibleMapsInViewport = this.warpedMapList.getMapsByBbox(
      this.viewport.projectedGeoBbox
    )

    const neededTiles: NeededTile[] = []
    for (const mapId of possibleMapsInViewport) {
      const warpedMap = this.warpedMapList.getWarpedMap(mapId)

      if (!warpedMap) {
        continue
      }

      if (!warpedMap.visible) {
        continue
      }

      // Get warped map image info if lacking
      if (!hasImageInfo(warpedMap)) {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.IMAGEINFONEEDED, mapId)
        )
        continue
      }

      // Only draw maps that are larger than MIN_RESOURCE_SIZE pixels
      if (
        bboxToDiameter(warpedMap.projectedGeoMask) / this.viewport.resolution <
        MIN_RESOURCE_SIZE
      ) {
        continue
      }

      const resourceViewportRing = geoBboxToResourceRing(
        warpedMap.projectedTransformer,
        this.viewport.projectedGeoBbox
      )

      const zoomLevel = getBestTileZoomLevel(
        warpedMap.parsedImage,
        extentsToScale(
          bboxToExtent(computeBbox(resourceViewportRing)),
          this.viewport.canvasSize
        )
      )

      this.bestZoomLevelByMapIdAtViewport.set(mapId, zoomLevel)

      const tiles = computeTiles(
        resourceViewportRing,
        warpedMap.parsedImage,
        zoomLevel
      )

      for (const tile of tiles) {
        neededTiles.push(tileToNeededTile(tile, warpedMap))
      }
    }

    this.tileCache.setTiles(neededTiles)
    this.updateMapsInViewport(neededTiles)
  }

  private viewportMovedSignificantly(): boolean {
    // TODO: this could be a problem if the viewport is quickly and continously moved
    // within the tolerance during initial loading.
    // Possible solution: adding a 'allrendered' event and listening to it.
    if (!this.viewport) {
      return false
    }
    if (!this.previousSignificantViewport) {
      this.previousSignificantViewport = this.viewport
      return false
    } else {
      const rectangleDistances = []
      for (let i = 0; i < 4; i++) {
        rectangleDistances.push(
          distance(
            this.previousSignificantViewport.projectedGeoRectangle[i],
            this.viewport.projectedGeoRectangle[i]
          ) / this.viewport.resolution
        )
      }
      const dist = Math.max(...rectangleDistances)
      if (dist == 0) {
        // No move should also pass, e.g. when this function is called multiple times during startup, without changes to the viewport
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

  private updateMapsInViewport(neededTiles: NeededTile[]) {
    // TODO: handle everything as Set() once JS supports filter on sets.
    const oldMapsInViewportAsArray = Array.from(this.mapsInViewport)
    const newMapsInViewportAsArray = neededTiles
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

    const projectionTransform = this.viewport.projectionTransform

    // This transform is almost [1, 0, 0, 1, 0, 0]
    // since invertedRenderTransform is set as the inverse of the viewport's projectionTransform at every updateVertexBuffers()
    // But due to throttling this can be a different viewport then that over renderInternal()
    // TODO: replace this with [1, 0, 0, 1, 0, 0] if these fuctions ever fall under the same throttle function.
    const renderTransform = multiplyTransform(
      projectionTransform,
      this.invertedRenderTransform
    )

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.useProgram(this.program)

    // Global uniform

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

    // Map specific uniforms

    for (const mapId of this.mapsInViewport) {
      const webgl2WarpedMap = this.webGL2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        continue
      }

      this.setRenderOptionsUniforms(
        this.renderOptions,
        webgl2WarpedMap.renderOptions
      )

      const bestScaleFactorLocation = gl.getUniformLocation(
        this.program,
        'u_bestScaleFactor'
      )
      const bestZoomLevel = this.bestZoomLevelByMapIdAtViewport.get(mapId)
      const bestScaleFactor = bestZoomLevel?.scaleFactor || 1
      gl.uniform1i(bestScaleFactorLocation, bestScaleFactor)

      const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.opacity * webgl2WarpedMap.opacity)

      const saturationLocation = gl.getUniformLocation(
        this.program,
        'u_saturation'
      )
      gl.uniform1f(
        saturationLocation,
        this.saturation * webgl2WarpedMap.saturation
      )

      const u_tilesTextureLocation = gl.getUniformLocation(
        this.program,
        'u_tilesTexture'
      )
      gl.uniform1i(u_tilesTextureLocation, 0)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.tilesTexture)

      const u_tilePositionsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_tilePositionsTexture'
      )
      gl.uniform1i(u_tilePositionsTextureLocation, 1)
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.tilePositionsTexture)

      const u_imagePositionsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_imagePositionsTexture'
      )
      gl.uniform1i(u_imagePositionsTextureLocation, 2)
      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.imagePositionsTexture)

      const u_scaleFactorsTextureLocation = gl.getUniformLocation(
        this.program,
        'u_scaleFactorsTexture'
      )
      gl.uniform1i(u_scaleFactorsTextureLocation, 3)
      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, webgl2WarpedMap.scaleFactorsTexture)

      const vao = webgl2WarpedMap.vao
      const triangles = webgl2WarpedMap.currentGeoMaskTriangles
      const count = triangles.length / 2

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
      removeBackground: {
        color:
          mapRenderOptions.removeBackground?.color ||
          layerRenderOptions.removeBackground?.color,
        hardness: maxOfNumberOrUndefined(
          mapRenderOptions.removeBackground?.hardness,
          layerRenderOptions.removeBackground?.hardness
        ),
        threshold: maxOfNumberOrUndefined(
          mapRenderOptions.removeBackground?.threshold,
          layerRenderOptions.removeBackground?.threshold
        )
      },
      colorize: {
        ...layerRenderOptions.colorize,
        ...mapRenderOptions.colorize
      }
    }

    // Remove background color uniforms

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

    // Colorize uniforms

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

  private async imageInfoNeeded(event: Event) {
    // TODO: why do we need webgl2warpedmap here? warpedmap seems to suffice!
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const webgl2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
      if (!webgl2WarpedMap) {
        return
      }

      const warpedMap = webgl2WarpedMap.warpedMap
      await warpedMap.completeImageInfo()

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.IMAGEINFOLOADED))
    }
  }

  private tileLoaded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const cachedTile = this.tileCache.getCachedTile(tileUrl)

      if (!cachedTile) {
        return
      }

      const webgl2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.addCachedTile(tileUrl, cachedTile)

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
    }
  }

  private tileRemoved(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data as WarpedMapTileEventDetail
      const webgl2WarpedMap = this.webGL2WarpedMapsById.get(mapId)

      if (!webgl2WarpedMap) {
        return
      }

      webgl2WarpedMap.removeCachedTile(tileUrl)

      this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.CHANGED))
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
        this.webGL2WarpedMapsById.set(warpedMap.mapId, webgl2WarpedMap)
      }
    }
  }

  private transformationChanged(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapIds = event.data as string[]
      for (const mapId of mapIds) {
        const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
        if (webGL2WarpedMap) {
          webGL2WarpedMap.updateTriangulation(false)
        }
      }

      this.startTransformationTransition()
    }
  }

  private resourceMaskUpdated(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const mapId = event.data as string
      const webGL2WarpedMap = this.webGL2WarpedMapsById.get(mapId)
      if (webGL2WarpedMap) {
        webGL2WarpedMap.updateTriangulation(false)
      }
    }
  }
}
