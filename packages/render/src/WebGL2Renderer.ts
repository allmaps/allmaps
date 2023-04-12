import TileCache from './TileCache.js'
import WebGL2WarpedMap from './WebGL2WarpedMap.js'

import { createShader, createProgram } from './shared/webgl2.js'

import vertexShaderSource from './shaders/vertex-shader.glsl?raw'
import fragmentShaderSource from './shaders/fragment-shader.glsl?raw'

import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import {
  createTransform,
  translateTransform,
  scaleTransform,
  multiplyTransform,
  invertTransform,
  transformToMatrix4
} from './shared/matrix.js'

import type {
  WarpedMap,
  Transform,
  RenderOptions,
  RemoveBackgroundOptions,
  ColorizeOptions
} from './shared/types.js'

import type { GCPTransformInfo } from '@allmaps/transform'

const DEFAULT_OPACITY = 1
const DEFAULT_REMOVE_BACKGROUND_THRESHOLD = 0.2
const DEFAULT_REMOVE_BACKGROUND_HARDNESS = 0.7

export default class WebGL2Renderer extends EventTarget {
  tileCache: TileCache

  gl: WebGL2RenderingContext
  program: WebGLProgram

  webGLWarpedMapsById: Map<string, WebGL2WarpedMap> = new Map()

  renderOptions: RenderOptions = {}
  renderOptionsScope: 'layer' | 'map' = 'layer'

  // TODO: move to Viewport?
  invertedRenderTransform: Transform

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
      WarpedMapEventType.TILEADDED,
      this.tileAdded.bind(this)
    )

    this.tileCache.addEventListener(
      WarpedMapEventType.TILEREMOVED,
      this.tileRemoved.bind(this)
    )

    this.invertedRenderTransform = createTransform()
  }

  tileAdded(event: Event) {
    if (event instanceof WarpedMapEvent) {
      const { mapId, tileUrl } = event.data

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
      const { mapId, tileUrl } = event.data

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
  }

  // update
  // updateTriangulation

  setVisible(visible: boolean): void {}

  getOpacity(): number | undefined {
    return this.renderOptions?.opacity
  }

  setOpacity(opacity: number): void {
    this.renderOptions.opacity = opacity
  }

  resetOpacity(): void {
    this.renderOptions.opacity = undefined
  }

  getMapOpacity(mapId: string): number | undefined {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)

    if (webGLWarpedMap) {
      return webGLWarpedMap.renderOptions.opacity
    }
  }

  setMapOpacity(mapId: string, opacity: number): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      webGLWarpedMap.renderOptions.opacity = opacity
    }
  }

  resetMapOpacity(mapId: string): void {
    const webGLWarpedMap = this.webGLWarpedMapsById.get(mapId)
    if (webGLWarpedMap) {
      return (webGLWarpedMap.renderOptions.opacity = undefined)
    }
  }

  getRemoveBackground(): RemoveBackgroundOptions | undefined {
    return this.renderOptions.removeBackground
  }

  setRemoveBackground(removeBackgroundOptions: RemoveBackgroundOptions) {
    this.renderOptions.removeBackground = removeBackgroundOptions
  }

  resetRemoveBackground() {
    this.renderOptions.removeBackground = undefined
  }

  getMapRemoveBackground(mapId: string): RemoveBackgroundOptions | undefined {
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

  getColorize(): ColorizeOptions | undefined {
    return this.renderOptions.colorize
  }

  setColorize(colorizeOptions: ColorizeOptions): void {
    this.renderOptions.colorize = colorizeOptions
  }

  resetColorize(): void {
    this.renderOptions.colorize = undefined
  }

  getMapColorize(mapId: string): ColorizeOptions | undefined {
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

  setRenderOptionsUniforms(renderOptions: RenderOptions) {
    const gl = this.gl

    const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
    gl.uniform1f(
      opacityLocation,
      renderOptions.opacity !== undefined
        ? renderOptions.opacity
        : DEFAULT_OPACITY
    )

    const removeBackgroundColorLocation = gl.getUniformLocation(
      this.program,
      'u_removeBackgroundColor'
    )
    gl.uniform1f(
      removeBackgroundColorLocation,
      renderOptions.removeBackground ? 1 : 0
    )

    if (renderOptions.removeBackground) {
      const backgroundColorLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColor'
      )
      gl.uniform3fv(
        backgroundColorLocation,
        renderOptions.removeBackground.color
      )

      const backgroundColorThresholdLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColorThreshold'
      )
      gl.uniform1f(
        backgroundColorThresholdLocation,
        renderOptions.removeBackground.threshold !== undefined
          ? renderOptions.removeBackground.threshold
          : DEFAULT_REMOVE_BACKGROUND_THRESHOLD
      )

      const backgroundColorHardnessLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColorHardness'
      )
      gl.uniform1f(
        backgroundColorHardnessLocation,
        renderOptions.removeBackground.hardness !== undefined
          ? renderOptions.removeBackground.hardness
          : DEFAULT_REMOVE_BACKGROUND_HARDNESS
      )
    }

    const colorizeLocation = gl.getUniformLocation(this.program, 'u_colorize')
    gl.uniform1f(colorizeLocation, renderOptions.colorize ? 1 : 0)

    if (renderOptions.colorize) {
      const colorizeColorLocation = gl.getUniformLocation(
        this.program,
        'u_colorizeColor'
      )
      gl.uniform3fv(colorizeColorLocation, renderOptions.colorize.color)
    }
  }

  updateVertexBuffers(
    projectionTransform: Transform,
    mapIds: IterableIterator<string>
  ) {
    this.invertedRenderTransform = invertTransform(projectionTransform)

    for (let mapId of mapIds) {
      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        break
      }

      webglWarpedMap.updateVertexBuffers(projectionTransform)
    }
  }

  getGcpTransform(transformer: GCPTransformInfo): Transform {
    const u_adfFromGeoX = transformer.adfFromGeoX
    const u_adfFromGeoY = transformer.adfFromGeoY

    return [
      u_adfFromGeoX[2],
      u_adfFromGeoY[2],
      u_adfFromGeoX[1],
      u_adfFromGeoY[1],
      u_adfFromGeoX[0],
      u_adfFromGeoY[0]
    ]
  }

  getPixelToImageTransform(
    pixelToCoordinateTransform: Transform,
    transformer: GCPTransformInfo,
    devicePixelRatio: number,
    canvasHeight: number
  ): Transform {
    let transform = scaleTransform(
      pixelToCoordinateTransform,
      1 / devicePixelRatio,
      1 / devicePixelRatio
    )

    transform = translateTransform(transform, 0, canvasHeight)
    transform = scaleTransform(transform, 1, -1)

    const meanTranslateTransform = translateTransform(
      createTransform(),
      -transformer.y2Mean,
      -transformer.x2Mean
    )

    return multiplyTransform(
      multiplyTransform(
        this.getGcpTransform(transformer),
        meanTranslateTransform
      ),
      transform
    )
  }

  render(
    pixelToCoordinateTransform: Transform,
    projectionTransform: Transform,
    mapIds: IterableIterator<string>
  ): void {
    const renderTransform = multiplyTransform(
      projectionTransform,
      this.invertedRenderTransform
    )

    const gl = this.gl
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
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

    if (this.renderOptionsScope === 'layer') {
      this.setRenderOptionsUniforms(this.renderOptions)
    }

    for (let mapId of mapIds) {
      const webglWarpedMap = this.webGLWarpedMapsById.get(mapId)

      if (!webglWarpedMap) {
        continue
      }

      // TODO: we can also exclude hidden maps earlier, in RTree or before
      // passing mapIds to render function
      if (!webglWarpedMap.warpedMap.visible) {
        continue
      }

      if (this.renderOptionsScope === 'map') {
        this.setRenderOptionsUniforms(webglWarpedMap.renderOptions)
      }

      const transformer = webglWarpedMap.warpedMap.transformer

      const pixelToImageTransform = this.getPixelToImageTransform(
        pixelToCoordinateTransform,
        transformer,
        window.devicePixelRatio,
        gl.canvas.height
      )

      const pixelToImageMatrixLocation = gl.getUniformLocation(
        this.program,
        'u_pixelToImageMatrix'
      )
      gl.uniformMatrix4fv(
        pixelToImageMatrixLocation,
        false,
        transformToMatrix4(pixelToImageTransform)
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
      const triangles = webglWarpedMap.triangles
      const primitiveType = this.gl.TRIANGLES
      const offset = 0
      const count = triangles.length / 2
      gl.bindVertexArray(vao)
      gl.drawArrays(primitiveType, offset, count)
    }
  }
}
