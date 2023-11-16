import potpack from 'potpack'

import { triangulate } from '@allmaps/triangulate'
import { geometryToDiameter } from '@allmaps/stdlib'
import { throttle } from 'lodash-es'

import WarpedMap from './WarpedMap.js'
import { createBuffer } from './shared/webgl2.js'
import { applyTransform } from './shared/matrix.js'

import type CachedTile from './CachedTile.js'
import type { RenderOptions } from './shared/types.js'
import type { Point, Transform } from '@allmaps/types'

const THROTTLE_WAIT_MS = 50
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

// TODO: Consider making this tunable by the user.
const DIAMETER_FRACTION = 40

export default class WebGL2WarpedMap extends EventTarget {
  warpedMap: WarpedMap

  gl: WebGL2RenderingContext
  program: WebGLProgram

  vao: WebGLVertexArrayObject | null

  tilesForTexture: Map<string, CachedTile> = new Map()

  tilesTexture: WebGLTexture | null
  scaleFactorsTexture: WebGLTexture | null
  tilePositionsTexture: WebGLTexture | null
  imagePositionsTexture: WebGLTexture | null

  resourceTrianglePoints: Point[] = []
  projectedGeoCurrentTrianglePoints: Point[] = []
  projectedGeoNewTrianglePoints: Point[] = []

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  projectionTransform: Transform | undefined

  private throttledUpdateTextures: () => Promise<void> | undefined

  constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    warpedMap: WarpedMap
  ) {
    super()

    this.warpedMap = warpedMap

    this.gl = gl
    this.program = program

    this.vao = gl.createVertexArray()

    this.tilesTexture = gl.createTexture()
    this.scaleFactorsTexture = gl.createTexture()
    this.tilePositionsTexture = gl.createTexture()
    this.imagePositionsTexture = gl.createTexture()

    this.updateTriangulation()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  updateTriangulation(immediately = true) {
    this.resourceTrianglePoints = triangulate(
      this.warpedMap.resourceMask,
      geometryToDiameter(this.warpedMap.resourceMask) / DIAMETER_FRACTION
    ).flat() as Point[]

    this.projectedGeoNewTrianglePoints = this.resourceTrianglePoints.map(
      (point) =>
        this.warpedMap.projectedTransformer.transformToGeo(point as Point)
    )

    if (immediately || !this.projectedGeoCurrentTrianglePoints.length) {
      this.projectedGeoCurrentTrianglePoints =
        this.projectedGeoNewTrianglePoints
    }
  }

  resetCurrentTrianglePoints() {
    this.projectedGeoCurrentTrianglePoints = this.projectedGeoNewTrianglePoints
    this.projectedGeoNewTrianglePoints = []
    this.updateVertexBuffersInternal()
  }

  updateVertexBuffers(projectionTransform: Transform) {
    this.projectionTransform = projectionTransform
    this.updateVertexBuffersInternal()
  }

  addCachedTile(tileUrl: string, cachedTile: CachedTile) {
    this.tilesForTexture.set(tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  removeCachedTile(tileUrl: string) {
    this.tilesForTexture.delete(tileUrl)
    this.throttledUpdateTextures()
  }

  dispose() {
    this.resourceTrianglePoints = []
    this.projectedGeoCurrentTrianglePoints = []
    this.projectedGeoNewTrianglePoints = []

    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.tilesTexture)
    this.gl.deleteTexture(this.scaleFactorsTexture)
    this.gl.deleteTexture(this.tilePositionsTexture)
    this.gl.deleteTexture(this.imagePositionsTexture)
  }

  private async updateTextures() {
    // This is a costly function, so it's throttled using throttledUpdateTextures()
    const gl = this.gl

    const tilesForTextureCount = this.tilesForTexture.size

    if (tilesForTextureCount === 0) {
      return
    }

    const tilesForTexture = [...this.tilesForTexture.values()]

    const packedTiles = tilesForTexture.map((tile, index) => ({
      w: tile.imageBitmap?.width || 0,
      h: tile.imageBitmap?.height || 0,
      // calling potpack will add x and y properties
      // By adding them here already, we'll make TypeScript happy!
      x: 0,
      y: 0,
      index
    }))

    // Potpack modifies the tiles array and overwrites the x, y row/column
    // values with the texture position in pixel values
    const { w: textureWidth, h: textureHeight } = potpack(packedTiles)

    const scaleFactors = packedTiles.map(
      ({ index }) => tilesForTexture[index].tile.zoomLevel.scaleFactor
    )

    gl.bindTexture(gl.TEXTURE_2D, this.scaleFactorsTexture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      tilesForTextureCount,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(scaleFactors)
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // if (Math.max(textureWidth, textureHeight) > MAX_TEXTURE_SIZE) {
    //   throw new Error('tile texture too large')
    // }

    gl.bindTexture(gl.TEXTURE_2D, this.tilesTexture)

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      textureWidth,
      textureHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )

    for (const packedTile of packedTiles) {
      const index = packedTile.index
      const cachedTile = tilesForTexture[index]

      const tileImageBitmap = cachedTile.imageBitmap

      if (tileImageBitmap) {
        const textureX = packedTile.x
        const textureY = packedTile.y

        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          textureX,
          textureY,
          tileImageBitmap.width,
          tileImageBitmap.height,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          tileImageBitmap
        )
      }
    }

    const tilePositions = packedTiles.map((packedTile) => [
      packedTile.x,
      packedTile.y
    ])

    gl.bindTexture(gl.TEXTURE_2D, this.tilePositionsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RG32I,
      1,
      tilesForTextureCount,
      0,
      gl.RG_INTEGER,
      gl.INT,
      new Int32Array(tilePositions.flat())
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    const imagePositions: number[][] = []

    packedTiles.forEach(({ index }) => {
      const tile = tilesForTexture[index]

      // TODO: is this correct? Added to fix TypeScript error
      if (tile && tile.imageRequest && tile.imageRequest.region) {
        imagePositions.push([
          tile.imageRequest.region.x,
          tile.imageRequest.region.y,
          tile.imageRequest.region.width,
          tile.imageRequest.region.height
        ])
      }
    })

    gl.bindTexture(gl.TEXTURE_2D, this.imagePositionsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32I,
      1,
      tilesForTextureCount,
      0,
      gl.RGBA_INTEGER,
      gl.INT,
      new Int32Array(imagePositions.flat())
    )

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  }

  private updateVertexBuffersInternal() {
    // This is a costly function, so it's throttled in render as part of throttledPrepareRender()
    if (!this.vao || !this.projectionTransform) {
      return
    }

    this.gl.bindVertexArray(this.vao)

    const resourceTriangleCoordinates = new Float32Array(
      this.resourceTrianglePoints.flat()
    )
    createBuffer(
      this.gl,
      this.program,
      resourceTriangleCoordinates,
      2,
      'a_resource_triangle_coordinates'
    )

    const webGL2CurrentTrianglePoints =
      this.projectedGeoCurrentTrianglePoints.map((point) => {
        return applyTransform(this.projectionTransform as Transform, point)
      })
    const webGL2CurrentTriangleCoordinates = new Float32Array(
      webGL2CurrentTrianglePoints.flat()
    )
    createBuffer(
      this.gl,
      this.program,
      webGL2CurrentTriangleCoordinates,
      2,
      'a_webgl2_current_triangle_coordinates'
    )

    if (this.projectedGeoNewTrianglePoints.length) {
      // TODO: find a way to only do this during transition

      const webGL2NewTrianglePoints = this.projectedGeoNewTrianglePoints.map(
        (point) => {
          return applyTransform(this.projectionTransform as Transform, point)
        }
      )
      const webGL2NewTriangleCoordinates = new Float32Array(
        webGL2NewTrianglePoints.flat()
      )
      createBuffer(
        this.gl,
        this.program,
        webGL2NewTriangleCoordinates,
        2,
        'a_webgl2_new_triangle_coordinates'
      )
    }

    // For debugging purposes, a triangle index is passed.
    let triangleIndex = new Float32Array(this.resourceTrianglePoints.length)
    triangleIndex = triangleIndex.map((v, i) => {
      return Math.round((i - 1) / 3)
    })
    createBuffer(this.gl, this.program, triangleIndex, 1, 'a_triangle_index')
  }
}
