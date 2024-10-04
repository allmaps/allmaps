import { throttle } from 'lodash-es'

import {
  hexToFractionalRgb,
  lineStringToLines,
  pointsAndPointsToLines
} from '@allmaps/stdlib'
import { Map as GeoreferencedMap } from '@allmaps/annotation'
import { black, blue, green, pink, white } from '@allmaps/tailwind'

import TriangulatedWarpedMap from './TriangulatedWarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import { applyTransform } from '../shared/matrix.js'
import { createBuffer } from '../shared/webgl2.js'
import { getTilesAtOtherScaleFactors } from '../shared/tiles.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Image } from '@allmaps/iiif-parser'
import type {
  ColorWithTransparancy,
  Line,
  Point,
  Tile,
  Transform
} from '@allmaps/types'

import type {
  LineLayer,
  PointLayer,
  WarpedMapOptions
} from '../shared/types.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'
import type { RenderOptions } from '../shared/types.js'

import { equalArray } from '@allmaps/stdlib'

const THROTTLE_UPDATE_TEXTURES_WAIT_MS = 200
const THROTTLE_UPDATE_TEXTURES_OPTIONS = {
  leading: true,
  trailing: true
}

const DEBUG = false // TODO: set using options
const RENDER_MAPS = true // TODO: set using options
const RENDER_LINES = false // TODO: set using options
const RENDER_POINTS = false // TODO: set using options

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

const DEFAULT_LINE_LAYER_VIEWPORT_SIZE = 6
const DEFAULT_LINE_LAYER_COLOR = [...hexToFractionalRgb(black), 1]
const DEFAULT_LINE_LAYER_VIEWPORT_BORDER_SIZE = 0
const DEFAULT_LINE_LAYER_BORDER_COLOR = [...hexToFractionalRgb(white), 1]

const DEFAULT_POINT_LAYER_VIEWPORT_SIZE = 16
const DEFAULT_POINT_LAYER_COLOR = [...hexToFractionalRgb(black), 1]
const DEFAULT_POINT_LAYER_VIEWPORT_BORDER_SIZE = 1
const DEFAULT_POINT_LAYER_BORDER_COLOR = [...hexToFractionalRgb(white), 1]

const TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 5
const TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 1

// TODO: this can go, we're not using this anymore!
const TEXTURE_DEPTH_BUFFER_RATIO = 0
// const TEXTURE_DEPTH_SHRINK_RATIO = 1 / 10

export function createWebGL2WarpedMapFactory(
  gl: WebGL2RenderingContext,
  mapsProgram: WebGLProgram,
  pointsProgram: WebGLProgram,
  linesProgram: WebGLProgram
) {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) =>
    new WebGL2WarpedMap(
      mapId,
      georeferencedMap,
      gl,
      mapsProgram,
      linesProgram,
      pointsProgram,
      options
    )
}

/**
 * Class for WarpedMaps that are rendered with WebGL 2
 *
 * @export
 * @class WebGL2WarpedMap
 * @typedef {WebGL2WarpedMap}
 * @extends {TriangulatedWarpedMap}
 */
export default class WebGL2WarpedMap extends TriangulatedWarpedMap {
  // De facto make this a WarpedMapWithImageInfo
  // (Multiple inhertance is not possible in TypeScript)
  declare imageId: string
  declare parsedImage: Image

  gl: WebGL2RenderingContext
  mapsProgram: WebGLProgram
  linesProgram: WebGLProgram
  pointsProgram: WebGLProgram

  mapsVao: WebGLVertexArrayObject | null = null
  linesVao: WebGLVertexArrayObject | null = null
  pointsVao: WebGLVertexArrayObject | null = null

  lineLayers: LineLayer[] = []
  pointLayers: PointLayer[] = []

  cachedTilesByTileUrl: Map<string, CachedTile<ImageData>> = new Map()
  cachedTilesForTexture: CachedTile<ImageData>[] = []
  textureTileUrls: string[] = []
  textureWidth: number = 0
  textureHeight: number = 0
  textureDepth: number = 0

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  cachedTilesTextureArray: WebGLTexture | null = null
  cachedTilesResourcePositionsAndDimensionsTexture: WebGLTexture | null = null
  cachedTilesScaleFactorsTexture: WebGLTexture | null = null

  pbo: WebGLBuffer | null

  projectedGeoToClipTransform: Transform | undefined

  private throttledUpdateTextures: DebouncedFunc<typeof this.updateTextures>

  /**
   * Creates an instance of WebGL2WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param {WebGL2RenderingContext} gl - WebGL rendering context
   * @param {WebGLProgram} mapsProgram - WebGL program
   * @param {Partial<WarpedMapOptions>} options - WarpedMapOptions
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    gl: WebGL2RenderingContext,
    mapsProgram: WebGLProgram,
    linesProgram: WebGLProgram,
    pointsProgram: WebGLProgram,
    options?: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)

    this.gl = gl
    // TODO: could these be removed since set in initializeWebGL()?
    this.mapsProgram = mapsProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    this.initializeWebGL(mapsProgram, linesProgram, pointsProgram)

    this.cachedTilesTextureArray = gl.createTexture()
    this.cachedTilesScaleFactorsTexture = gl.createTexture()
    this.cachedTilesResourcePositionsAndDimensionsTexture = gl.createTexture()

    this.pbo = gl.createBuffer()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_UPDATE_TEXTURES_WAIT_MS,
      THROTTLE_UPDATE_TEXTURES_OPTIONS
    )
  }

  initializeWebGL(
    mapsProgram: WebGLProgram,
    linesProgram: WebGLProgram,
    pointsProgram: WebGLProgram
  ) {
    this.mapsProgram = mapsProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    this.mapsVao = this.gl.createVertexArray()
    this.linesVao = this.gl.createVertexArray()
    this.pointsVao = this.gl.createVertexArray()

    this.cachedTilesTextureArray = this.gl.createTexture()
    this.cachedTilesScaleFactorsTexture = this.gl.createTexture()
    this.cachedTilesResourcePositionsAndDimensionsTexture =
      this.gl.createTexture()
  }

  /**
   * Update the vertex buffers of this warped map
   *
   * @param {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayers' projectionTransform.
   */
  updateVertexBuffers(projectedGeoToClipTransform: Transform) {
    this.projectedGeoToClipTransform = projectedGeoToClipTransform

    if (RENDER_MAPS) {
      this.updateVertexBuffersMaps()
    }
    if (RENDER_LINES) {
      this.updateVertexBuffersLines()
    }
    if (RENDER_POINTS) {
      this.updateVertexBuffersPoints()
    }
  }

  /**
   * Clear textures for this map
   */
  clearTextures() {
    // TODO: implement clearing of texture: maybe a 1x1x1 texture that's empty
    this.throttledUpdateTextures()
  }

  /**
   * Add cached tile to the textures of this map and update textures
   *
   * @param {CachedTile} cachedTile
   */
  addCachedTileAndUpdateTextures(cachedTile: CachedTile<ImageData>) {
    this.cachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  /**
   * Remove cached tile from the textures of this map and update textures
   *
   * @param {string} tileUrl
   */
  removeCachedTileAndUpdateTextures(tileUrl: string) {
    this.cachedTilesByTileUrl.delete(tileUrl)
    this.throttledUpdateTextures()
  }

  cancelThrottledFunctions() {
    this.throttledUpdateTextures.cancel()
  }

  destroy() {
    this.gl.deleteVertexArray(this.mapsVao)
    this.gl.deleteVertexArray(this.linesVao)
    this.gl.deleteVertexArray(this.pointsVao)
    this.gl.deleteTexture(this.cachedTilesTextureArray)
    this.gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.cachedTilesResourcePositionsAndDimensionsTexture)

    this.cancelThrottledFunctions()

    super.destroy()
  }

  private setLineLayers() {
    this.lineLayers = [
      {
        projectedGeoLines: lineStringToLines(this.projectedGeoLongerMask),
        projectedGeoPreviousLines: lineStringToLines(
          this.projectedGeoPreviousLongerMask
        ),
        viewportSize: 8,
        color: [...hexToFractionalRgb(pink), 1]
      },
      {
        projectedGeoLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoTransformedResourcePoints
        ),
        projectedGeoPreviousLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoPreviousTransformedResourcePoints
        ),
        color: [...hexToFractionalRgb(black), 1],
        borderColor: [...hexToFractionalRgb(white), 1]
      }
    ]

    if (DEBUG) {
      this.lineLayers = this.lineLayers.concat([
        {
          projectedGeoLines: lineStringToLines(this.projectedGeoFullMask),
          color: [...hexToFractionalRgb(green), 1]
        }
      ])
    }
  }

  private setPointLayers() {
    this.pointLayers = [
      {
        projectedGeoPoints: this.projectedGeoPoints,
        color: [...hexToFractionalRgb(blue), 1]
      },
      {
        projectedGeoPoints: this.projectedGeoTransformedResourcePoints,
        projectedGeoPreviousPoints:
          this.projectedGeoPreviousTransformedResourcePoints,
        color: [...hexToFractionalRgb(pink), 1]
      }
    ]
  }

  private updateVertexBuffersMaps() {
    if (!this.mapsVao || !this.projectedGeoToClipTransform) {
      return
    }

    const gl = this.gl
    const program = this.mapsProgram
    gl.bindVertexArray(this.mapsVao)

    // Resource triangle points
    createBuffer(
      gl,
      program,
      new Float32Array(this.resourceTrianglePoints.flat()),
      2,
      'a_resourceTrianglePoint'
    )

    // Clip previous and new triangle points

    const clipPreviousTrianglePoints =
      this.projectedGeoPreviousTrianglePoints.map((point) =>
        applyTransform(this.projectedGeoToClipTransform as Transform, point)
      )

    createBuffer(
      gl,
      program,
      new Float32Array(clipPreviousTrianglePoints.flat()),
      2,
      'a_clipPreviousTrianglePoint'
    )

    const clipTrianglePoints = this.projectedGeoTrianglePoints.map((point) =>
      applyTransform(this.projectedGeoToClipTransform as Transform, point)
    )

    createBuffer(
      gl,
      program,
      new Float32Array(clipTrianglePoints.flat()),
      2,
      'a_clipTrianglePoint'
    )

    // Previous and new distortion
    // Note: we must update the distortion data even when we don't render distortions
    // to ensure this array buffer is of the correct length, for example when triangulation changes

    createBuffer(
      gl,
      program,
      new Float32Array(this.previousTrianglePointsDistortion),
      1,
      'a_previousTrianglePointDistortion'
    )

    createBuffer(
      gl,
      program,
      new Float32Array(this.trianglePointsDistortion),
      1,
      'a_trianglePointDistortion'
    )

    // Triangle Point index

    const trianglePointsTriangleIndex = new Float32Array(
      this.resourceTrianglePoints.length
    ).map((_v, i) => {
      return i
    })
    createBuffer(
      gl,
      program,
      trianglePointsTriangleIndex,
      1,
      'a_trianglePointIndex'
    )
  }

  private updateVertexBuffersLines() {
    if (!this.linesVao) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.bindVertexArray(this.linesVao)

    this.setLineLayers()

    const sixProjectedGeoPoints = this.lineLayers
      .reduce(
        (accumulator: Line[], lineLayer) =>
          accumulator.concat(lineLayer.projectedGeoLines),
        []
      )
      .map((projectedGeoLine) => [
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[1]
      ])
      .flat()
    createBuffer(
      gl,
      program,
      new Float32Array(sixProjectedGeoPoints.flat()),
      2,
      'a_projectedGeoPoint'
    )

    const sixProjectedGeoOtherPoints = this.lineLayers
      .reduce(
        (accumulator: Line[], lineLayer) =>
          accumulator.concat(lineLayer.projectedGeoLines),
        []
      )
      .map((projectedGeoLine) => [
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[0]
      ])
      .flat()
    createBuffer(
      gl,
      program,
      new Float32Array(sixProjectedGeoOtherPoints.flat()),
      2,
      'a_projectedGeoOtherPoint'
    )

    const sixProjectedGeoPreviousPoints = this.lineLayers
      .reduce(
        (accumulator: Line[], lineLayer) =>
          accumulator.concat(
            lineLayer.projectedGeoPreviousLines || lineLayer.projectedGeoLines
          ),
        []
      )
      .map((projectedGeoLine) => [
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[1]
      ])
      .flat()
    createBuffer(
      gl,
      program,
      new Float32Array(sixProjectedGeoPreviousPoints.flat()),
      2,
      'a_projectedGeoPreviousPoint'
    )

    const sixProjectedGeoPreviousOtherPoints = this.lineLayers
      .reduce(
        (accumulator: Line[], lineLayer) =>
          accumulator.concat(
            lineLayer.projectedGeoPreviousLines || lineLayer.projectedGeoLines
          ),
        []
      )
      .map((projectedGeoLine) => [
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[1],
        projectedGeoLine[0],
        projectedGeoLine[0],
        projectedGeoLine[0]
      ])
      .flat()
    createBuffer(
      gl,
      program,
      new Float32Array(sixProjectedGeoPreviousOtherPoints.flat()),
      2,
      'a_projectedGeoPreviousOtherPoint'
    )

    const sixIsOtherPoints = this.lineLayers.reduce(
      (accumulator: number[], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) => [
            0, 0, 1, 0, 0, 1
          ])
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(sixIsOtherPoints),
      1,
      'a_isOtherPoint'
    )

    const sixNormalSigns = this.lineLayers.reduce(
      (accumulator: number[], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) => [
            +1, -1, +1, +1, -1, +1
          ])
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(sixNormalSigns),
      1,
      'a_normalSign'
    )

    const viewportSizes = this.lineLayers.reduce(
      (accumulator: number[], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              Object.prototype.hasOwnProperty.call(lineLayer, 'viewportSize') // Note: using hasOwnPropery to ensure 0 is passed as 0
                ? lineLayer.viewportSize
                : DEFAULT_LINE_LAYER_VIEWPORT_SIZE
            )
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(viewportSizes),
      1,
      'a_viewportSize'
    )

    const colors = this.lineLayers.reduce(
      (accumulator: number[][], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              Object.prototype.hasOwnProperty.call(lineLayer, 'color')
                ? lineLayer.color
                : DEFAULT_LINE_LAYER_COLOR
            )
          )
        ),
      []
    )
    createBuffer(gl, program, new Float32Array(colors.flat()), 4, 'a_color')

    const viewportBorderSizes = this.lineLayers.reduce(
      (accumulator: number[], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              lineLayer.viewportBorderSize ||
                DEFAULT_LINE_LAYER_VIEWPORT_BORDER_SIZE
            )
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(viewportBorderSizes),
      1,
      'a_viewportBorderSize'
    )

    const borderColors = this.lineLayers.reduce(
      (accumulator: number[][], lineLayer) =>
        accumulator.concat(
          lineLayer.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              Object.prototype.hasOwnProperty.call(lineLayer, 'borderColor')
                ? lineLayer.borderColor
                : DEFAULT_LINE_LAYER_BORDER_COLOR
            )
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(borderColors.flat()),
      4,
      'a_borderColor'
    )
  }

  private updateVertexBuffersPoints() {
    if (!this.pointsVao) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.bindVertexArray(this.pointsVao)

    this.setPointLayers()

    const projectedGeoPoints = this.pointLayers.reduce(
      (accumulator: Point[], pointLayer) =>
        accumulator.concat(pointLayer.projectedGeoPoints),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(projectedGeoPoints.flat()),
      2,
      'a_projectedGeoPoint'
    )

    const projectedGeoPreviousPoints = this.pointLayers.reduce(
      (accumulator: Point[], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPreviousPoints || pointLayer.projectedGeoPoints
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(projectedGeoPreviousPoints.flat()),
      2,
      'a_projectedGeoPreviousPoint'
    )

    const viewportSizes = this.pointLayers.reduce(
      (accumulator: number[], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPoints.map((_projectedGeoPoint) =>
            Object.prototype.hasOwnProperty.call(pointLayer, 'viewportSize')
              ? (pointLayer.viewportSize as number)
              : DEFAULT_POINT_LAYER_VIEWPORT_SIZE
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(viewportSizes),
      1,
      'a_viewportSize'
    )

    const colors = this.pointLayers.reduce(
      (accumulator: number[][], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPoints.map((_projectedGeoPoint) =>
            Object.prototype.hasOwnProperty.call(pointLayer, 'color')
              ? (pointLayer.color as ColorWithTransparancy)
              : DEFAULT_POINT_LAYER_COLOR
          )
        ),
      []
    )
    createBuffer(gl, program, new Float32Array(colors.flat()), 4, 'a_color')

    const viewportBorderSizes = this.pointLayers.reduce(
      (accumulator: number[], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPoints.map(
            (_projectedGeoPoint) =>
              pointLayer.viewportBorderSize ||
              DEFAULT_POINT_LAYER_VIEWPORT_BORDER_SIZE
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(viewportBorderSizes),
      1,
      'a_viewportBorderSize'
    )

    const borderColors = this.pointLayers.reduce(
      (accumulator: number[][], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPoints.map((_projectedGeoPoint) =>
            Object.prototype.hasOwnProperty.call(pointLayer, 'borderColor')
              ? (pointLayer.borderColor as ColorWithTransparancy)
              : DEFAULT_POINT_LAYER_BORDER_COLOR
          )
        ),
      []
    )
    createBuffer(
      gl,
      program,
      new Float32Array(borderColors.flat()),
      4,
      'a_borderColor'
    )
  }

  private async updateTextures() {
    const gl = this.gl

    // Find out which tiles to include in texture
    this.updateCachedTilesForTextures()

    // Don't update if same request as before
    // This prevents the event TEXTURESUPDATED from being fired
    // Which would otherwise trigger an infinite loop
    if (
      equalArray(
        this.cachedTilesForTexture.map((textureTile) => textureTile.tileUrl),
        this.textureTileUrls
      )
    ) {
      return
    }

    // Cached tiles texture array

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.cachedTilesTextureArray)

    // Check if a new texture should be recreated

    const requiredTextureWidth = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.width)
    )
    const requiredTextureHeigt = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.height)
    )
    let requiredTextureDepth = this.cachedTilesForTexture.length

    // TODO: this can go, we're not using this anymore!
    const newTexture = true
    // requiredTextureWidth != this.textureWidth ||
    // requiredTextureHeigt != this.textureHeight ||
    // requiredTextureDepth > this.textureDepth ||
    // requiredTextureDepth <
    //   Math.floor(this.textureDepth * TEXTURE_DEPTH_SHRINK_RATIO)

    if (newTexture) {
      const textureDepthBuffer = Math.floor(
        requiredTextureDepth * TEXTURE_DEPTH_BUFFER_RATIO
      )
      requiredTextureDepth = requiredTextureDepth + textureDepthBuffer
      this.textureTileUrls = new Array(requiredTextureDepth)

      gl.texImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        gl.RGBA,
        requiredTextureWidth,
        requiredTextureHeigt,
        requiredTextureDepth,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      )

      this.textureWidth = requiredTextureWidth
      this.textureHeight = requiredTextureHeigt
      this.textureDepth = requiredTextureDepth
    }
    for (let i = 0; i < this.cachedTilesForTexture.length; i++) {
      // TODO: this can go, we're not using this anymore!
      // If the texture already exists and
      // this cached tile for the texture is the same as
      // the tile already in the texture at this location,
      // then don't draw it again
      if (
        !newTexture &&
        this.cachedTilesForTexture[i].tileUrl == this.textureTileUrls[i]
      ) {
        continue
      }

      this.textureTileUrls[i] = this.cachedTilesForTexture[i].tileUrl

      const imageData = this.cachedTilesForTexture[i].data

      // Using Pixel Buffer Objects to write to textures asynchonously

      // Bind to the PBO
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, this.pbo)

      // Allocate space in the PBO for the texture data
      gl.bufferData(
        gl.PIXEL_UNPACK_BUFFER,
        requiredTextureWidth * requiredTextureHeigt * 4,
        gl.STREAM_DRAW
      )

      // Upload data into the PBO
      gl.bufferSubData(gl.PIXEL_UNPACK_BUFFER, 0, imageData.data)

      // Bind the texture and asynchronously copy data from the PBO to the texture
      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        i,
        imageData.width,
        imageData.height,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        0 // 0 indicates that we are loading from the PBO
      )

      // Unbind the PBO
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null)
    }
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles resource positions and dimensions texture

    const cachedTilesResourcePositionsAndDimensions =
      this.cachedTilesForTexture.map((textureTile) => {
        if (
          textureTile &&
          textureTile.imageRequest &&
          textureTile.imageRequest.region
        ) {
          return [
            textureTile.imageRequest.region.x,
            textureTile.imageRequest.region.y,
            textureTile.imageRequest.region.width,
            textureTile.imageRequest.region.height
          ]
        }
      }) as number[][]

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.cachedTilesResourcePositionsAndDimensionsTexture
    )

    // A previous verions used gl.RGBA_INTEGER as this texture's format
    // However, this seemed to cause Chrome to crash on some systems while
    // zooming in and out. Using gl.RED_INTEGER and multiplying the width by 4
    // to account for the 4 values per tile seems to fix the issue.
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      this.cachedTilesForTexture.length * 4,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(cachedTilesResourcePositionsAndDimensions.flat())
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles scale factors texture

    const cachedTilesScaleFactors = this.cachedTilesForTexture.map(
      (textureTile) => textureTile.tile.tileZoomLevel.scaleFactor
    )

    gl.bindTexture(gl.TEXTURE_2D, this.cachedTilesScaleFactorsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      this.cachedTilesForTexture.length,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(cachedTilesScaleFactors)
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.TEXTURESUPDATED))
  }

  private updateCachedTilesForTextures() {
    // Select tiles form tileCache that should be included in the texture
    const requestedCachedTiles = []
    const requestedCachedTilesAtOtherScaleFactors = []
    const overviewCachedTiles = []

    // Try to include tiles that were requested
    for (const fetchableTile of this.currentFetchableTiles) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        // If they are available, include them
        requestedCachedTiles.push(cachedTile)
      } else {
        // If they are not available, include their parents or children if they are available
        for (const cachedTile of this.getCachedTilesAtOtherScaleFactors(
          fetchableTile.tile
        )) {
          requestedCachedTilesAtOtherScaleFactors.push(cachedTile)
        }
      }
    }

    // Try to include tiles that are at overview zoomlevel
    for (const fetchableTile of this.currentOverviewFetchableTiles) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        // If they are available, include them
        overviewCachedTiles.push(cachedTile)
      }
    }

    let cachedTilesForTextures = [
      ...requestedCachedTiles,
      ...requestedCachedTilesAtOtherScaleFactors,
      ...overviewCachedTiles
    ]

    // Making tiles unique by tileUrl
    const cachedTilesForTexturesByTileUrl: Map<
      string,
      CachedTile<ImageData>
    > = new Map()
    cachedTilesForTextures.forEach((cachedTile) =>
      cachedTilesForTexturesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    )
    cachedTilesForTextures = [...cachedTilesForTexturesByTileUrl.values()]

    // TODO: this can go, we're not using this anymore!
    // Reorder tiles to align with previous cachedTilesForTextures
    // So we can later skip writing tiles that are already in texture
    for (
      let i = 0;
      i < Math.min(this.textureTileUrls.length, cachedTilesForTextures.length);
      i++
    ) {
      const index = cachedTilesForTextures.findIndex(
        (textureTile) => this.textureTileUrls[i] == textureTile.tileUrl
      )
      if (index >= 0) {
        const movedTextureTile = cachedTilesForTextures[index]
        cachedTilesForTextures[index] = cachedTilesForTextures[i]
        cachedTilesForTextures[i] = movedTextureTile
      }
    }

    this.cachedTilesForTexture = cachedTilesForTextures

    return
  }

  private getCachedTilesAtOtherScaleFactors(
    tile: Tile
  ): CachedTile<ImageData>[] {
    if (this.cachedTilesByTileUrl.size == 0) {
      return []
    }

    const cachedTiles = []
    for (tile of getTilesAtOtherScaleFactors(
      tile,
      this.parsedImage,
      this.currentBestScaleFactor,
      TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF,
      TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF,
      this.tileInCachedTiles.bind(this) // Only consider tiles in cache,
    )) {
      const cachedTile = this.tileToCachedTile(tile)
      if (cachedTile) {
        cachedTiles.push(cachedTile)
      } else {
        throw new Error("Tile supposed to be in cache isn't.")
      }
    }

    return cachedTiles
  }

  private tileToTileUrl(tile: Tile): string {
    const imageRequest = this.parsedImage.getIiifTile(
      tile.tileZoomLevel,
      tile.column,
      tile.row
    )
    return this.parsedImage.getImageUrl(imageRequest)
  }

  private tileToCachedTile(tile: Tile): CachedTile<ImageData> | undefined {
    return this.cachedTilesByTileUrl.get(this.tileToTileUrl(tile))
  }

  private tileInCachedTiles(tile: Tile): boolean {
    return this.cachedTilesByTileUrl.has(this.tileToTileUrl(tile))
  }
}
