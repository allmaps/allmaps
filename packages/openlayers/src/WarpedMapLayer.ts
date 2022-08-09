import Layer from 'ol/layer/Layer.js'
import type { FrameState } from 'ol/PluggableMap.js'

import { throttle } from 'lodash-es'

import { OLCustomEvent } from './OLCustomEvent.js'
import { WarpedMapEventTypes } from './WarpedMapEventType.js'

// @ts-ignore
import vertexShaderSource from './shaders/vertex-shader.glsl?raw'
// @ts-ignore
import fragmentShaderSource from './shaders/fragment-shader.glsl?raw'

import type { WarpedMapSource } from './WarpedMapSource.js'
import { WarpedMapWebGLRenderer } from './WarpedMapWebGLRenderer.js'

type Size = [number, number]
type Extent = [number, number, number, number]

export class WarpedMapLayer extends Layer {
  source: WarpedMapSource | null = null
  container: HTMLElement
  canvas: HTMLCanvasElement | null = null
  canvasSize: [number, number] = [0, 0]

  gl: WebGL2RenderingContext | null = null
  program: WebGLProgram | null = null

  backgroundColor = [0, 0, 0]
  backgroundColorThreshold = 0

  uboBuffers: Map<string, WebGLBuffer> = new Map()
  uboVariableInfo: Map<string, Map<string, { index: number; offset: number }>> =
    new Map()

  warpedMapWebGLRenderers: Map<string, WarpedMapWebGLRenderer> = new Map()
  mapIdsInExtent: Set<string> = new Set()

  throttledUpdateNeededTiles

  constructor(options: {}) {
    options = options || {}

    super(options)

    this.source = this.getSource() as WarpedMapSource
    if (this.source) {
      this.source.on(
        // @ts-ignore
        WarpedMapEventTypes.WARPEDMAPADDED,
        this.warpedMapAdded.bind(this)
      )

      this.source.on(
        // @ts-ignore
        WarpedMapEventTypes.WARPEDMAPENTEREXTENT,
        this.warpedMapEnterExtent.bind(this)
      )

      this.source.on(
        // @ts-ignore
        WarpedMapEventTypes.WARPEDMAPLEAVEEXTENT,
        this.warpedMapLeaveExtent.bind(this)
      )
      // @ts-ignore
      this.source.on(WarpedMapEventTypes.TILENEEDED, this.tileNeeded.bind(this))

      this.source.on(
        // @ts-ignore
        WarpedMapEventTypes.TILEUNNEEDED,
        this.tileUnneeded.bind(this)
      )

      this.throttledUpdateNeededTiles = throttle(
        this.source.updateNeededTiles.bind(this.source),
        100
      )
    }

    const container = document.createElement('div')
    this.container = container

    container.style.position = 'absolute'
    container.style.width = '100%'
    container.style.height = '100%'
    container.classList.add('ol-layer')
    container.classList.add('allmaps-warped-layer3')
    const canvas = document.createElement('canvas')

    canvas.style.position = 'absolute'
    canvas.style.left = '0'

    canvas.style.width = '100%'
    canvas.style.height = '100%'

    container.appendChild(canvas)

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true })

    if (!gl) {
      throw new Error('WebGL 2 not available')
    }

    const resizeObserver = new ResizeObserver(this.onResize.bind(this))
    resizeObserver.observe(canvas, { box: 'content-box' })

    this.canvas = canvas
    this.gl = gl

    const vertexShader = this.createShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource
    )
    const fragmentShader = this.createShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource
    )

    this.program = this.createProgram(gl, vertexShader, fragmentShader)

    // this.createSettingsUniformBufferObject()
    // this.createTransformerUniformBufferObject()

    gl.disable(gl.DEPTH_TEST)
  }

  createSettingsUniformBufferObject() {
    this.createUniformBufferObject('Settings', ['u_opacity'])
  }

  createTransformerUniformBufferObject() {
    // this.createUniformBufferObject('Transformer', [
    //   'u_x2Mean',
    //   'u_y2Mean',
    //   'u_adfFromGeoX',
    //   'u_adfFromGeoY'
    // ])
    // TODO: add data to buffer directly?
  }

  createUniformBufferObject(
    uniformBlockName: string,
    uboVariableNames: string[]
  ) {
    // TODO: are all unneeded webgl objects properly deleted?

    // Adapted from
    // https://gist.github.com/jialiang/2880d4cc3364df117320e8cb324c2880

    const gl = this.gl
    const program = this.program

    if (!gl || !program) {
      return
    }

    const blockIndex = gl.getUniformBlockIndex(program, uniformBlockName)

    // Get the size of the Uniform Block in bytes
    const blockSize = gl.getActiveUniformBlockParameter(
      program,
      blockIndex,
      gl.UNIFORM_BLOCK_DATA_SIZE
    )

    // Create Uniform Buffer to store our data
    const uboBuffer = gl.createBuffer()

    if (!uboBuffer) {
      throw new Error('Unable to create uniform buffer object')
    }

    // Bind it to tell WebGL we are working on this buffer
    gl.bindBuffer(gl.UNIFORM_BUFFER, uboBuffer)

    // Allocate memory for our buffer equal to the size of our Uniform Block
    // We use dynamic draw because we expect to respecify the contents of the buffer frequently
    gl.bufferData(gl.UNIFORM_BUFFER, blockSize, gl.DYNAMIC_DRAW)

    // Unbind buffer when we're done using it for now
    // Good practice to avoid unintentionally working on it
    gl.bindBuffer(gl.UNIFORM_BUFFER, null)

    // Bind the buffer to a binding point
    // Think of it as storing the buffer into a special UBO ArrayList
    // The second argument is the index you want to store your Uniform Buffer in
    // Let's say you have 2 unique UBO, you'll store the first one in index 0 and the second one in index 1
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, uboBuffer)

    // Get the respective index of the member variables inside our Uniform Block
    const uboVariableIndices: number[] | null = gl.getUniformIndices(
      program,
      uboVariableNames
    ) as number[] | null

    if (!uboVariableIndices) {
      throw new Error('Unable to get uniform indices')
    }

    // Get the offset of the member variables inside our Uniform Block in bytes
    const uboVariableOffsets = gl.getActiveUniforms(
      program,
      uboVariableIndices,
      gl.UNIFORM_OFFSET
    )

    // Create an object to map each variable name to its respective index and offset
    const uboVariableInfo = new Map()

    uboVariableNames.forEach((name, index) => {
      uboVariableInfo.set(name, {
        index: uboVariableIndices[index],
        offset: uboVariableOffsets[index]
      })
    })

    this.uboVariableInfo.set(uniformBlockName, uboVariableInfo)

    const index = gl.getUniformBlockIndex(program, uniformBlockName)
    gl.uniformBlockBinding(program, index, 0)

    this.uboBuffers.set(uniformBlockName, uboBuffer)
  }

  warpedMapAdded(event: OLCustomEvent) {
    const { mapId, image, transformer, triangles } = event.detail

    const gl = this.gl
    const program = this.program

    if (gl && program) {
      const warpedMapWebGLRenderer = new WarpedMapWebGLRenderer(
        gl,
        program,
        mapId,
        {
          image,
          transformer,
          triangles
        }
      )
      this.warpedMapWebGLRenderers.set(mapId, warpedMapWebGLRenderer)

      warpedMapWebGLRenderer.on(
        // @ts-ignore
        WarpedMapEventTypes.TILELOADED,
        this.tileLoaded.bind(this)
      )
    }

    this.changed()
  }

  warpedMapEnterExtent(event: OLCustomEvent) {
    const { mapId } = event.detail
    this.mapIdsInExtent.add(mapId)

    // const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
    // TODO: set visible
  }

  warpedMapLeaveExtent(event: OLCustomEvent) {
    const { mapId } = event.detail
    this.mapIdsInExtent.delete(mapId)

    // const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
    // TODO: set invisible
  }

  tileNeeded(event: OLCustomEvent) {
    const { mapId, url, tile, imageRequest } = event.detail

    const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
    warpedMapWebGLRenderer?.addTileNeeded(url, tile, imageRequest)
  }

  tileUnneeded(event: OLCustomEvent) {
    const { mapId, url } = event.detail

    const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)
    warpedMapWebGLRenderer?.deleteTileNeeded(url)
  }

  tileLoaded(event: OLCustomEvent) {
    this.changed()
  }

  createShader(
    gl: WebGL2RenderingContext,
    type: WebGLRenderingContextBase['VERTEX_SHADER'],
    source: string
  ): WebGLShader {
    // TODO: are all unneeded webgl objects properly deleted?

    const shader = gl.createShader(type)

    if (shader) {
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
      if (success) {
        return shader
      } else {
        const message = gl.getShaderInfoLog(shader)
        gl.deleteShader(shader)
        throw new Error('Failed to compile shader: ' + message)
      }
    } else {
      throw new Error('Failed to create shader')
    }
  }

  createProgram(
    gl: WebGL2RenderingContext,
    vertexShader: WebGLShader,
    fragmentShader: WebGLShader
  ): WebGLProgram {
    // TODO: are all unneeded webgl objects properly deleted?

    const program = gl.createProgram()

    if (program) {
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      const success = gl.getProgramParameter(program, gl.LINK_STATUS)
      if (success) {
        return program
      } else {
        const message = gl.getProgramInfoLog(program)
        gl.deleteProgram(program)
        throw new Error('Failed to link program: ' + message)
      }
    } else {
      throw new Error('Failed to create program')
    }
  }

  onResize(entries: ResizeObserverEntry[]) {
    // From https://webgl2fundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
    for (const entry of entries) {
      let width = entry.contentRect.width
      let height = entry.contentRect.height

      let dpr = window.devicePixelRatio
      if (entry.devicePixelContentBoxSize) {
        // NOTE: Only this path gives the correct answer
        // The other paths are imperfect fallbacks
        // for browsers that don't provide anyway to do this
        width = entry.devicePixelContentBoxSize[0].inlineSize
        height = entry.devicePixelContentBoxSize[0].blockSize
        dpr = 1 // it's already in width and height
      } else if (entry.contentBoxSize) {
        if (entry.contentBoxSize[0]) {
          width = entry.contentBoxSize[0].inlineSize
          height = entry.contentBoxSize[0].blockSize
        }
      }

      const displayWidth = Math.round(width * dpr)
      const displayHeight = Math.round(height * dpr)

      this.canvasSize = [displayWidth, displayHeight]
    }

    this.changed()
  }

  resizeCanvas(canvas: HTMLCanvasElement, [width, height]: [number, number]) {
    const needResize = canvas.width !== width || canvas.height !== height

    if (needResize) {
      canvas.width = width
      canvas.height = height
    }

    return needResize
  }

  hexToRgb(hex: string) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? [
          parseInt(result[1], 16) / 256,
          parseInt(result[2], 16) / 256,
          parseInt(result[3], 16) / 256
        ]
      : null
  }

  hideBackgroundColor(
    hexBackgroundColor?: string,
    backgroundColorThreshold?: number
  ) {
    if (hexBackgroundColor) {
      const backgroundColor = this.hexToRgb(hexBackgroundColor)
      if (backgroundColor) {
        this.backgroundColor = backgroundColor
      }
    }

    if (backgroundColorThreshold) {
      this.backgroundColorThreshold = backgroundColorThreshold
    }

    this.changed()
  }

  disposeInternal() {
    for (let warpedMapWebGLRenderer of this.warpedMapWebGLRenderers.values()) {
      warpedMapWebGLRenderer.dispose()
    }

    if (this.gl) {
      for (let uboBuffer of this.uboBuffers.values()) {
        this.gl.deleteBuffer(uboBuffer)
      }

      this.gl.deleteProgram(this.program)
      this.gl.getExtension('WEBGL_lose_context')?.loseContext()
    }

    super.disposeInternal()
  }

  render(frameState: FrameState, target: HTMLElement): HTMLElement {
    if (this.canvas) {
      this.resizeCanvas(this.canvas, this.canvasSize)
    }

    if (frameState.extent) {
      const extent: Extent = frameState.extent as Extent

      const viewportSize: Size = [
        frameState.size[0] * window.devicePixelRatio,
        frameState.size[1] * window.devicePixelRatio
      ]

      if (this.throttledUpdateNeededTiles) {
        this.throttledUpdateNeededTiles(
          viewportSize,
          extent,
          frameState.coordinateToPixelTransform
        )
      }
    }

    if (this.gl && this.program) {
      const gl = this.gl

      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)

      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.useProgram(this.program)

      const opacityLocation = gl.getUniformLocation(this.program, 'u_opacity')
      gl.uniform1f(opacityLocation, this.getOpacity())

      const backgroundColorLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColor'
      )
      gl.uniform3fv(backgroundColorLocation, this.backgroundColor)

      const backgroundColorThresholdLocation = gl.getUniformLocation(
        this.program,
        'u_backgroundColorThreshold'
      )
      gl.uniform1f(
        backgroundColorThresholdLocation,
        this.backgroundColorThreshold
      )

      // const settingsUboBuffer = this.uboBuffers.get('Settings')
      // const settingsUboVariableInfo = this.uboVariableInfo.get('Settings')

      // gl.bindBuffer(gl.UNIFORM_BUFFER, settingsUboBuffer)

      // gl.bufferSubData(
      //   gl.UNIFORM_BUFFER,
      //   settingsUboVariableInfo.get('u_opacity').offset,
      //   new Float32Array([this.getOpacity()]),
      //   0
      // )

      // gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, settingsUboBuffer)
      // gl.bindBuffer(gl.UNIFORM_BUFFER, null)

      const viewportSizeLocation = gl.getUniformLocation(
        this.program,
        'u_viewportSize'
      )
      gl.uniform2f(
        viewportSizeLocation,
        Math.round(gl.canvas.width / window.devicePixelRatio),
        Math.round(gl.canvas.height / window.devicePixelRatio)
      )

      // Warped maps jiggle when zoomed in. This is probably caused by converting
      // 64 bit numbers in frameState.coordinateToPixelTransform to 32 bit floats in the vertex shader.
      // See:
      // https://segmentfault.com/a/1190000040332266/en
      // https://blog.mapbox.com/rendering-big-geodata-on-the-fly-with-geojson-vt-4e4d2a5dd1f2
      const coordinateToPixelTransformLocation = gl.getUniformLocation(
        this.program,
        'u_coordinateToPixelTransform'
      )
      gl.uniform1fv(
        coordinateToPixelTransformLocation,
        frameState.coordinateToPixelTransform
      )

      const devicePixelRatioLocation = gl.getUniformLocation(
        this.program,
        'u_devicePixelRatio'
      )
      gl.uniform1f(devicePixelRatioLocation, window.devicePixelRatio)

      const pixelToCoordinateTransformLocation = gl.getUniformLocation(
        this.program,
        'u_pixelToCoordinateTransform'
      )

      gl.uniform1fv(
        pixelToCoordinateTransformLocation,
        frameState.pixelToCoordinateTransform
      )

      for (let mapId of this.mapIdsInExtent) {
        const warpedMapWebGLRenderer = this.warpedMapWebGLRenderers.get(mapId)

        if (!warpedMapWebGLRenderer) {
          break
        }

        const transformer = warpedMapWebGLRenderer.transformer

        const x2MeanLocation = gl.getUniformLocation(this.program, 'u_x2Mean')
        gl.uniform1f(x2MeanLocation, transformer.x2Mean)

        const y2MeanLocation = gl.getUniformLocation(this.program, 'u_y2Mean')
        gl.uniform1f(y2MeanLocation, transformer.y2Mean)

        const adfFromGeoXLocation = gl.getUniformLocation(
          this.program,
          'u_adfFromGeoX'
        )
        gl.uniform3f(
          adfFromGeoXLocation,
          transformer.adfFromGeoX[0],
          transformer.adfFromGeoX[1],
          transformer.adfFromGeoX[2]
        )

        const adfFromGeoYLocation = gl.getUniformLocation(
          this.program,
          'u_adfFromGeoY'
        )
        gl.uniform3f(
          adfFromGeoYLocation,
          transformer.adfFromGeoY[0],
          transformer.adfFromGeoY[1],
          transformer.adfFromGeoY[2]
        )

        const u_tilesTextureLocation = gl.getUniformLocation(
          this.program,
          'u_tilesTexture'
        )
        gl.uniform1i(u_tilesTextureLocation, 0)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, warpedMapWebGLRenderer.tilesTexture)

        const u_tilePositionsTextureLocation = gl.getUniformLocation(
          this.program,
          'u_tilePositionsTexture'
        )
        gl.uniform1i(u_tilePositionsTextureLocation, 1)
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(
          gl.TEXTURE_2D,
          warpedMapWebGLRenderer.tilePositionsTexture
        )

        const u_imagePositionsTextureLocation = gl.getUniformLocation(
          this.program,
          'u_imagePositionsTexture'
        )
        gl.uniform1i(u_imagePositionsTextureLocation, 2)
        gl.activeTexture(gl.TEXTURE2)
        gl.bindTexture(
          gl.TEXTURE_2D,
          warpedMapWebGLRenderer.imagePositionsTexture
        )

        const u_scaleFactorsTextureLocation = gl.getUniformLocation(
          this.program,
          'u_scaleFactorsTexture'
        )
        gl.uniform1i(u_scaleFactorsTextureLocation, 3)
        gl.activeTexture(gl.TEXTURE3)
        gl.bindTexture(
          gl.TEXTURE_2D,
          warpedMapWebGLRenderer.scaleFactorsTexture
        )

        const vao = warpedMapWebGLRenderer.vao
        const triangles = warpedMapWebGLRenderer.triangles

        const primitiveType = this.gl.TRIANGLES
        const offset = 0
        const count = triangles.length / 2

        gl.bindVertexArray(vao)
        gl.drawArrays(primitiveType, offset, count)
      }
    }

    return this.container
  }
}
