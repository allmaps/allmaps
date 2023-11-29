import potpack from 'potpack'

import { throttle } from 'lodash-es'

import WarpedMap from './WarpedMap.js'
import { createBuffer } from './shared/webgl2.js'
import { applyTransform } from './shared/matrix.js'

import type { CachedTile } from './CachedTile.js'
import type { RenderOptions } from './shared/types.js'
import type { Transform } from '@allmaps/types'

const THROTTLE_WAIT_MS = 50
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

export default class WebGL2WarpedMap {
  warpedMap: WarpedMap

  gl: WebGL2RenderingContext
  program: WebGLProgram

  vao: WebGLVertexArrayObject | null

  CachedTilesByTileUrl: Map<string, CachedTile> = new Map()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  packedTilesTexture: WebGLTexture | null
  packedTilesPositionsTexture: WebGLTexture | null
  packedTilesResourcePositionsAndDimensionsTexture: WebGLTexture | null
  packedTilesScaleFactorsTexture: WebGLTexture | null

  projectedGeoToClipTransform: Transform | undefined

  private throttledUpdateTextures: () => void | undefined

  constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    warpedMap: WarpedMap
  ) {
    this.warpedMap = warpedMap

    this.gl = gl
    this.program = program

    this.vao = gl.createVertexArray()

    this.packedTilesTexture = gl.createTexture()
    this.packedTilesScaleFactorsTexture = gl.createTexture()
    this.packedTilesPositionsTexture = gl.createTexture()
    this.packedTilesResourcePositionsAndDimensionsTexture = gl.createTexture()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  updateVertexBuffers(projectedGeoToClipTransform: Transform) {
    this.projectedGeoToClipTransform = projectedGeoToClipTransform
    this.updateVertexBuffersInternal()
  }

  addCachedTile(cachedTile: CachedTile) {
    this.CachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  removeCachedTile(tileUrl: string) {
    this.CachedTilesByTileUrl.delete(tileUrl)
    this.throttledUpdateTextures()
  }

  dispose() {
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.packedTilesTexture)
    this.gl.deleteTexture(this.packedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.packedTilesPositionsTexture)
    this.gl.deleteTexture(this.packedTilesResourcePositionsAndDimensionsTexture)
  }

  private updateVertexBuffersInternal() {
    if (!this.vao || !this.projectedGeoToClipTransform) {
      return
    }

    this.gl.bindVertexArray(this.vao)

    createBuffer(
      this.gl,
      this.program,
      new Float32Array(this.warpedMap.resourceTrianglePoints.flat()),
      2,
      'a_resourceTrianglePoint'
    )

    const clipCurrentTrianglePoints =
      this.warpedMap.projectedGeoCurrentTrianglePoints.map((point) => {
        return applyTransform(
          this.projectedGeoToClipTransform as Transform,
          point
        )
      })
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(clipCurrentTrianglePoints.flat()),
      2,
      'a_clipCurrentTrianglePoint'
    )

    const clipNewTrianglePoints =
      this.warpedMap.projectedGeoNewTrianglePoints.map((point) => {
        return applyTransform(
          this.projectedGeoToClipTransform as Transform,
          point
        )
      })
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(clipNewTrianglePoints.flat()),
      2,
      'a_clipNewTrianglePoint'
    )

    // For debugging purposes, a triangle index is passed.
    let triangleIndex = new Float32Array(
      this.warpedMap.resourceTrianglePoints.length
    )
    triangleIndex = triangleIndex.map((v, i) => {
      return Math.round((i - 1) / 3)
    })
    createBuffer(this.gl, this.program, triangleIndex, 1, 'a_triangleIndex')
  }

  private updateTextures() {
    const gl = this.gl

    const CachedTilesByTileUrlCount = this.CachedTilesByTileUrl.size

    if (CachedTilesByTileUrlCount === 0) {
      return
    }

    const cachedTiles = [...this.CachedTilesByTileUrl.values()]

    const packedTiles = cachedTiles.map((cachedTile, index) => ({
      w: cachedTile.imageBitmap.width,
      h: cachedTile.imageBitmap.height,
      // Calling potpack will add x and y properties
      // with the position of the tile's origin in the pack
      // By adding them here already, we'll make TypeScript happy!
      x: 0,
      y: 0,
      index
    }))

    const { w: packedTilesTextureWidth, h: packedTilesTextureHeight } =
      potpack(packedTiles)

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)

    // Packed Tiles Texture

    // if (Math.max(textureWidth, textureHeight) > MAX_TEXTURE_SIZE) {
    //   throw new Error('tile texture too large')
    // }

    gl.bindTexture(gl.TEXTURE_2D, this.packedTilesTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      packedTilesTextureWidth,
      packedTilesTextureHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )
    for (const packedTile of packedTiles) {
      // Fill with the TileImageBitmap of each packed tile
      const cachedTile = cachedTiles[packedTile.index]
      const tileImageBitmap = cachedTile.imageBitmap
      if (tileImageBitmap) {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          packedTile.x,
          packedTile.y,
          tileImageBitmap.width,
          tileImageBitmap.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          tileImageBitmap
        )
      }
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Packed Tiles Positions Texture

    const packedTilesPositions = packedTiles.map((packedTile) => [
      packedTile.x,
      packedTile.y
    ])

    gl.bindTexture(gl.TEXTURE_2D, this.packedTilesPositionsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RG32I,
      1,
      CachedTilesByTileUrlCount,
      0,
      gl.RG_INTEGER,
      gl.INT,
      new Int32Array(packedTilesPositions.flat())
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Packed Tiles Resource Positions And Dimensions Texture

    const packedTilesResourcePositionsAndDimensions = packedTiles.map(
      (packedTile) => {
        const cachedTile = cachedTiles[packedTile.index]
        // TODO: is this correct? Added to fix TypeScript error
        if (
          cachedTile &&
          cachedTile.imageRequest &&
          cachedTile.imageRequest.region
        ) {
          return [
            cachedTile.imageRequest.region.x,
            cachedTile.imageRequest.region.y,
            cachedTile.imageRequest.region.width,
            cachedTile.imageRequest.region.height
          ]
        }
      }
    ) as number[][]

    gl.bindTexture(
      gl.TEXTURE_2D,
      this.packedTilesResourcePositionsAndDimensionsTexture
    )
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32I,
      1,
      CachedTilesByTileUrlCount,
      0,
      gl.RGBA_INTEGER,
      gl.INT,
      new Int32Array(packedTilesResourcePositionsAndDimensions.flat())
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Packed Tiles Scale Factors Texture

    const packedTilesScaleFactors = packedTiles.map(
      ({ index }) => cachedTiles[index].tile.tileZoomLevel.scaleFactor
    )

    gl.bindTexture(gl.TEXTURE_2D, this.packedTilesScaleFactorsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      CachedTilesByTileUrlCount,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(packedTilesScaleFactors)
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }
}
