import { throttle } from 'lodash-es'

import {
  hexToFractionalOpaqueRgba,
  lineStringToLines,
  mergeOptions,
  pointsAndPointsToLines,
  subSetArray
} from '@allmaps/stdlib'
import { GeoreferencedMap } from '@allmaps/annotation'
import {
  black,
  blue,
  green,
  pink,
  white,
  yellow,
  gray
} from '@allmaps/tailwind'

import { TriangulatedWarpedMap } from './TriangulatedWarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import {
  applyTransform,
  createTransform,
  invertTransform
} from '../shared/matrix.js'
import { createBuffer } from '../shared/webgl2.js'
import { getTilesAtOtherScaleFactors, tileKey } from '../shared/tiles.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Image } from '@allmaps/iiif-parser'
import type { Line, Point, Tile, Transform } from '@allmaps/types'

import type {
  LineLayer,
  PointLayer,
  SpecificWebGL2WarpedMapOptions,
  WebGL2RendererOptions,
  WebGL2WarpedMapOptions
} from '../shared/types.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'
import type { RenderOptions } from '../shared/types.js'

const THROTTLE_UPDATE_TEXTURES_WAIT_MS = 200
const THROTTLE_UPDATE_TEXTURES_OPTIONS = {
  leading: true,
  trailing: true
}

const defaultRenderLineLayerOptions = {
  viewportSize: 6,
  color: black,
  viewportBorderSize: 0,
  borderColor: white
}

const defaultRenderPointLayerOptions = {
  viewportSize: 16,
  color: black,
  viewportBorderSize: 1,
  borderColor: white
}

const defaultWebgl2WarpedMapOptions = {
  renderGcps: false,
  renderGcpsColor: blue,
  renderTransformedGcps: false,
  renderTransformedGcpsColor: pink,
  renderVectors: false,
  renderMask: false,
  renderMaskSize: 8,
  renderMaskColor: pink,
  renderFullMask: false,
  renderFullMaskSize: 8,
  renderFullMaskColor: green
}

const DEBUG = false

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

const TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 5
const TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 1

export function createWebGL2WarpedMapFactory(
  gl: WebGL2RenderingContext,
  mapProgram: WebGLProgram,
  linesProgram: WebGLProgram,
  pointsProgram: WebGLProgram
) {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WebGL2WarpedMapOptions>
  ) =>
    new WebGL2WarpedMap(
      mapId,
      georeferencedMap,
      gl,
      mapProgram,
      linesProgram,
      pointsProgram,
      options
    )
}

/**
 * Class for WarpedMaps that are rendered with WebGL 2
 */
export class WebGL2WarpedMap extends TriangulatedWarpedMap {
  // De facto make this a WarpedMapWithImageInfo
  // (Multiple inhertance is not possible in TypeScript)
  declare imageId: string
  declare parsedImage: Image

  webgl2WarpedMapOptions: SpecificWebGL2WarpedMapOptions

  gl: WebGL2RenderingContext
  mapProgram!: WebGLProgram
  linesProgram!: WebGLProgram
  pointsProgram!: WebGLProgram

  mapVao: WebGLVertexArrayObject | null = null
  linesVao: WebGLVertexArrayObject | null = null
  pointsVao: WebGLVertexArrayObject | null = null

  lineLayers: LineLayer[] = []
  pointLayers: PointLayer[] = []

  // Consider to store cachedTilesByTileKey as a quadtree for faster lookups
  cachedTilesByTileKey: Map<string, CachedTile<ImageData>>
  cachedTilesByTileUrl: Map<string, CachedTile<ImageData>>
  cachedTilesForTexture: CachedTile<ImageData>[] = []
  previousCachedTilesForTexture: CachedTile<ImageData>[] = []

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  cachedTilesTextureArray: WebGLTexture | null = null
  cachedTilesResourceOriginPointsAndDimensionsTexture: WebGLTexture | null =
    null
  cachedTilesScaleFactorsTexture: WebGLTexture | null = null

  // About renderTransform and InvertedRenderTransform:
  // renderTransform is the product of:
  // - the viewport's projectedGeoToClipTransform (projected geo coordinates -> clip coordinates)
  // - the saved invertedRenderTransform (projected clip coordinates -> geo coordinates)
  // since updateVertexBuffers ('where to draw triangles') run with possibly a different Viewport then renderInternal ('drawing the triangles'), a difference caused by throttling, there needs to be an adjustment.
  // this adjustment is minimal: indeed, since invertedRenderTransform is set as the inverse of the viewport's projectedGeoToClipTransform in updateVertexBuffers()
  // this renderTransform is almost the identity transform [1, 0, 0, 1, 0, 0].
  invertedRenderTransform: Transform

  private throttledUpdateTextures: DebouncedFunc<typeof this.updateTextures>

  /**
   * Creates an instance of WebGL2WarpedMap.
   *
   * @constructor
   * @param mapId - ID of the map
   * @param georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param gl - WebGL rendering context
   * @param mapProgram - WebGL program for map
   * @param options - WarpedMapOptions
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    gl: WebGL2RenderingContext,
    mapProgram: WebGLProgram,
    linesProgram: WebGLProgram,
    pointsProgram: WebGLProgram,
    options?: Partial<WebGL2WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)

    this.cachedTilesByTileKey = new Map()
    this.cachedTilesByTileUrl = new Map()

    this.webgl2WarpedMapOptions = mergeOptions(
      defaultWebgl2WarpedMapOptions,
      options
    )

    this.gl = gl
    this.initializeWebGL(mapProgram, linesProgram, pointsProgram)

    this.invertedRenderTransform = createTransform()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_UPDATE_TEXTURES_WAIT_MS,
      THROTTLE_UPDATE_TEXTURES_OPTIONS
    )
  }

  initializeWebGL(
    mapProgram: WebGLProgram,
    linesProgram: WebGLProgram,
    pointsProgram: WebGLProgram
  ) {
    this.mapProgram = mapProgram
    this.linesProgram = linesProgram
    this.pointsProgram = pointsProgram

    this.mapVao = this.gl.createVertexArray()
    this.linesVao = this.gl.createVertexArray()
    this.pointsVao = this.gl.createVertexArray()

    this.cachedTilesTextureArray = this.gl.createTexture()
    this.cachedTilesScaleFactorsTexture = this.gl.createTexture()
    this.cachedTilesResourceOriginPointsAndDimensionsTexture =
      this.gl.createTexture()
  }

  /**
   * Update the vertex buffers of this warped map
   *
   * @param projectedGeoToClipTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayers' projectionTransform.
   */
  updateVertexBuffers(
    projectedGeoToClipTransform: Transform,
    partialWebgl2RendererOptions: Partial<WebGL2RendererOptions>
  ) {
    this.invertedRenderTransform = invertTransform(projectedGeoToClipTransform)

    if (partialWebgl2RendererOptions.renderMaps) {
      this.updateVertexBuffersMap(projectedGeoToClipTransform)
    }
    if (partialWebgl2RendererOptions.renderLines) {
      this.updateVertexBuffersLines(projectedGeoToClipTransform)
    }
    if (partialWebgl2RendererOptions.renderPoints) {
      this.updateVertexBuffersPoints(projectedGeoToClipTransform)
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
   * @param cachedTile
   */
  addCachedTileAndUpdateTextures(cachedTile: CachedTile<ImageData>) {
    this.cachedTilesByTileKey.set(cachedTile.tileKey, cachedTile)
    this.cachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  /**
   * Remove cached tile from the textures of this map and update textures
   *
   * @param tileUrl
   */
  removeCachedTileAndUpdateTextures(tileUrl: string) {
    const cachedTile = this.cachedTilesByTileUrl.get(tileUrl)
    if (cachedTile) {
      this.cachedTilesByTileKey.delete(cachedTile.tileKey)
    }
    this.cachedTilesByTileUrl.delete(tileUrl)
    this.throttledUpdateTextures()
  }

  cancelThrottledFunctions() {
    this.throttledUpdateTextures.cancel()
  }

  destroy() {
    this.gl.deleteVertexArray(this.mapVao)
    this.gl.deleteVertexArray(this.linesVao)
    this.gl.deleteVertexArray(this.pointsVao)
    this.gl.deleteTexture(this.cachedTilesTextureArray)
    this.gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.gl.deleteTexture(
      this.cachedTilesResourceOriginPointsAndDimensionsTexture
    )

    this.cancelThrottledFunctions()

    super.destroy()
  }

  private setLineLayers() {
    this.lineLayers = []

    if (this.webgl2WarpedMapOptions.renderVectors) {
      this.lineLayers.push({
        projectedGeoLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoTransformedResourcePoints
        ),
        projectedGeoPreviousLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoPreviousTransformedResourcePoints
        ),
        viewportSize: this.webgl2WarpedMapOptions.renderVectorsSize,
        color: this.webgl2WarpedMapOptions.renderVectorsColor,
        viewportBorderSize: this.webgl2WarpedMapOptions.renderVectorsBorderSize,
        borderColor: this.webgl2WarpedMapOptions.renderVectorsBorderColor
      })
    }

    if (this.webgl2WarpedMapOptions.renderMask) {
      this.lineLayers.push({
        projectedGeoLines: lineStringToLines(
          this.projectedGeoTriangulationMask
        ),
        projectedGeoPreviousLines: lineStringToLines(
          this.projectedGeoPreviousTriangulationMask
        ),
        viewportSize: this.webgl2WarpedMapOptions.renderMaskSize,
        color: this.webgl2WarpedMapOptions.renderMaskColor,
        viewportBorderSize: this.webgl2WarpedMapOptions.renderMaskBorderSize,
        borderColor: this.webgl2WarpedMapOptions.renderMaskBorderColor
      })
    }

    if (this.webgl2WarpedMapOptions.renderFullMask) {
      this.lineLayers.push({
        projectedGeoLines: lineStringToLines(this.projectedGeoFullMask),
        viewportSize: this.webgl2WarpedMapOptions.renderFullMaskSize,
        color: this.webgl2WarpedMapOptions.renderFullMaskColor,
        viewportBorderSize:
          this.webgl2WarpedMapOptions.renderFullMaskBorderSize,
        borderColor: this.webgl2WarpedMapOptions.renderFullMaskBorderColor
      })
    }
  }

  private setPointLayers() {
    this.pointLayers = []

    if (this.webgl2WarpedMapOptions.renderGcps) {
      this.pointLayers.push({
        projectedGeoPoints: this.projectedGeoPoints,
        viewportSize: this.webgl2WarpedMapOptions.renderGcpsSize,
        color: this.webgl2WarpedMapOptions.renderGcpsColor,
        viewportBorderSize: this.webgl2WarpedMapOptions.renderGcpsBorderSize,
        borderColor: this.webgl2WarpedMapOptions.renderGcpsBorderColor
      })
    }

    if (this.webgl2WarpedMapOptions.renderTransformedGcps) {
      this.pointLayers.push({
        projectedGeoPoints: this.projectedGeoTransformedResourcePoints,
        projectedGeoPreviousPoints:
          this.projectedGeoPreviousTransformedResourcePoints,
        viewportSize: this.webgl2WarpedMapOptions.renderTransformedGcpsSize,
        color: this.webgl2WarpedMapOptions.renderTransformedGcpsColor,
        viewportBorderSize:
          this.webgl2WarpedMapOptions.renderTransformedGcpsBorderSize,
        borderColor:
          this.webgl2WarpedMapOptions.renderTransformedGcpsBorderColor
      })
    }

    if (DEBUG) {
      this.pointLayers.push({
        projectedGeoPoints: this.projectedGeoPreviousTrianglePoints,
        color: gray
      })
      this.pointLayers.push({
        projectedGeoPoints: this.projectedGeoTrianglePoints,
        color: yellow
      })
    }
  }

  private updateVertexBuffersMap(projectedGeoToClipTransform: Transform) {
    if (!this.mapVao) {
      return
    }

    const gl = this.gl
    const program = this.mapProgram
    gl.bindVertexArray(this.mapVao)

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
        applyTransform(projectedGeoToClipTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipPreviousTrianglePoints.flat()),
      2,
      'a_clipPreviousTrianglePoint'
    )

    const clipTrianglePoints = this.projectedGeoTrianglePoints.map((point) =>
      applyTransform(projectedGeoToClipTransform, point)
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

  private updateVertexBuffersLines(projectedGeoToClipTransform: Transform) {
    if (!this.linesVao) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.bindVertexArray(this.linesVao)

    this.setLineLayers()

    const clipSixPoints = this.lineLayers
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
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPoints.flat()),
      2,
      'a_clipPoint'
    )

    const clipSixOtherPoints = this.lineLayers
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
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixOtherPoints.flat()),
      2,
      'a_clipOtherPoint'
    )

    const clipSixPreviousPoints = this.lineLayers
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
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPreviousPoints.flat()),
      2,
      'a_clipPreviousPoint'
    )

    const clipSixPreviousOtherPoints = this.lineLayers
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
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPreviousOtherPoints.flat()),
      2,
      'a_clipPreviousOtherPoint'
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
              lineLayer.viewportSize ??
                defaultRenderLineLayerOptions.viewportSize
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
              hexToFractionalOpaqueRgba(
                lineLayer.color ?? defaultRenderLineLayerOptions.color
              )
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
              lineLayer.viewportBorderSize ??
                defaultRenderLineLayerOptions.viewportBorderSize
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
              hexToFractionalOpaqueRgba(
                lineLayer.borderColor ??
                  defaultRenderLineLayerOptions.borderColor
              )
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

  private updateVertexBuffersPoints(projectedGeoToClipTransform: Transform) {
    if (!this.pointsVao) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.bindVertexArray(this.pointsVao)

    this.setPointLayers()

    const clipPoints = this.pointLayers
      .reduce(
        (accumulator: Point[], pointLayer) =>
          accumulator.concat(pointLayer.projectedGeoPoints),
        []
      )
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipPoints.flat()),
      2,
      'a_clipPoint'
    )

    const clipPreviousPoints = this.pointLayers
      .reduce(
        (accumulator: Point[], pointLayer) =>
          accumulator.concat(
            pointLayer.projectedGeoPreviousPoints ||
              pointLayer.projectedGeoPoints
          ),
        []
      )
      .map((point) => applyTransform(projectedGeoToClipTransform, point))
    createBuffer(
      gl,
      program,
      new Float32Array(clipPreviousPoints.flat()),
      2,
      'a_clipPreviousPoint'
    )

    const viewportSizes = this.pointLayers.reduce(
      (accumulator: number[], pointLayer) =>
        accumulator.concat(
          pointLayer.projectedGeoPoints.map(
            (_projectedGeoPoint) =>
              pointLayer.viewportSize ??
              defaultRenderPointLayerOptions.viewportSize
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
            hexToFractionalOpaqueRgba(
              pointLayer.color ?? defaultRenderPointLayerOptions.color
            )
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
              pointLayer.viewportBorderSize ??
              defaultRenderPointLayerOptions.viewportBorderSize
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
            hexToFractionalOpaqueRgba(
              pointLayer.borderColor ??
                defaultRenderPointLayerOptions.borderColor
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

  private async updateTextures() {
    const gl = this.gl

    // Find out which tiles to include in texture
    this.updateCachedTilesForTextures()

    // Don't update if same request is (non-null) subset of previous request
    // This reduces (expensive) texture updates when just reducing the number of tiles
    // (But keeps them when all tiles are gone to free up texture)
    // And blocking updates on equal requests is important to
    // prevent triggering an infinite loop
    // caused by the TEXTURESUPDATED event at the end
    if (
      this.cachedTilesForTexture.length !== 0 &&
      subSetArray(
        this.previousCachedTilesForTexture.map(
          (textureTile) => textureTile.tileUrl
        ),
        this.cachedTilesForTexture.map((textureTile) => textureTile.tileUrl)
      )
    ) {
      return
    }

    // Cached tiles texture array

    const requiredTextureWidth = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.width)
    )
    const requiredTextureHeigt = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.height)
    )
    const requiredTextureDepth = this.cachedTilesForTexture.length

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.cachedTilesTextureArray)

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

    for (let i = 0; i < this.cachedTilesForTexture.length; i++) {
      const imageData = this.cachedTilesForTexture[i].data

      const pbo = gl.createBuffer()
      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, pbo)
      gl.bufferData(gl.PIXEL_UNPACK_BUFFER, imageData.data, gl.STATIC_DRAW)

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
        0
      )

      gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null)
    }

    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles resource origin points and dimensions texture

    const cachedTilesResourceOriginPointsAndDimensions =
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
      this.cachedTilesResourceOriginPointsAndDimensionsTexture
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
      new Int32Array(cachedTilesResourceOriginPointsAndDimensions.flat())
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
    const cachedTiles = []
    const cachedTilesAtOtherScaleFactors = []
    const overviewCachedTiles = []

    // Try to include tiles that were requested
    for (const fetchableTile of this.fetchableTilesForViewport) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        // If they are available, include them
        cachedTiles.push(cachedTile)
      } else {
        // If they are not available, include their parents or children if they are available
        for (const cachedTile of this.getCachedTilesAtOtherScaleFactors(
          fetchableTile.tile
        )) {
          cachedTilesAtOtherScaleFactors.push(cachedTile)
        }
      }
    }

    // Try to include tiles that are at overview zoomlevel
    for (const fetchableTile of this.overviewFetchableTilesForViewport) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        // If they are available, consider to include them
        const tileZoolLevelTilesCount = this.tileZoomLevelForViewport
          ? this.tileZoomLevelForViewport.rows *
            this.tileZoomLevelForViewport.columns
          : undefined
        // If this map's cached tiles don't already cover the entire zoomlevel
        if (
          cachedTiles.length == 0 ||
          (tileZoolLevelTilesCount &&
            cachedTiles.length < tileZoolLevelTilesCount)
        ) {
          overviewCachedTiles.push(cachedTile)
        }
      }
    }

    let cachedTilesForTextures = [
      ...cachedTiles,
      ...cachedTilesAtOtherScaleFactors,
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

    this.previousCachedTilesForTexture = this.cachedTilesForTexture
    this.cachedTilesForTexture = cachedTilesForTextures

    return
  }

  private getCachedTilesAtOtherScaleFactors(
    tile: Tile
  ): CachedTile<ImageData>[] {
    if (this.cachedTilesByTileUrl.size == 0) {
      return []
    }
    if (!this.tileZoomLevelForViewport) {
      return []
    }

    const cachedTiles = []
    for (tile of getTilesAtOtherScaleFactors(
      tile,
      this.parsedImage,
      this.tileZoomLevelForViewport.scaleFactor,
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

  // Lookup by tileKey (zoomlevel, row, column) instead of tileUrl
  // Because computing the tileUrl for every tile is expensive
  private tileToCachedTile(tile: Tile): CachedTile<ImageData> | undefined {
    return this.cachedTilesByTileKey.get(tileKey(tile))
  }

  private tileInCachedTiles(tile: Tile): boolean {
    return this.cachedTilesByTileKey.has(tileKey(tile))
  }
}
