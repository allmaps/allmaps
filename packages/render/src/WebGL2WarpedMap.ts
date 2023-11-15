import potpack from 'potpack'
import { triangulate } from '@allmaps/triangulate'
import { computeBbox } from '@allmaps/stdlib'
import { throttle } from 'lodash-es'

import WarpedMap from './WarpedMap.js'
import { createBuffer } from './shared/webgl2.js'
import { applyTransform } from './shared/matrix.js'

import type CachedTile from './CachedTile.js'
import type { Transform } from '@allmaps/types'
import type { RenderOptions } from './shared/types.js'
import { Bbox } from '@allmaps/types'

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

  vertexBufferTransform: Transform | undefined

  resourceMaskTriangles: number[] = []
  transformedResourceMaskTriangles: Float32Array = new Float32Array()

  currentGeoMaskTriangles: number[] = []
  currentTransformedGeoMaskTriangles: Float32Array = new Float32Array()

  newGeoMaskTriangles: number[] = []
  newTransformedGeoMaskTriangles: Float32Array = new Float32Array()

  // TODO: do we need to keep this?
  // pixelTriangleIndex: Float32Array = new Float32Array() // DEV

  vao: WebGLVertexArrayObject | null

  tilesForTexture: Map<string, CachedTile> = new Map()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  tilesTexture: WebGLTexture | null
  scaleFactorsTexture: WebGLTexture | null
  tilePositionsTexture: WebGLTexture | null
  imagePositionsTexture: WebGLTexture | null

  throttledUpdateTextures: () => Promise<void> | undefined

  constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    warpedMap: WarpedMap
  ) {
    super()

    this.warpedMap = warpedMap

    this.gl = gl
    this.program = program

    this.updateTriangulation()

    this.tilesTexture = gl.createTexture()
    this.scaleFactorsTexture = gl.createTexture()
    this.tilePositionsTexture = gl.createTexture()
    this.imagePositionsTexture = gl.createTexture()

    this.vao = gl.createVertexArray()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  updateTriangulation(immediately = true) {
    const bbox: Bbox = computeBbox(this.warpedMap.resourceMask)
    const bboxDiameter: number = Math.sqrt(
      (bbox[2] - bbox[0]) ** 2 + (bbox[3] - bbox[1]) ** 2
    )

    const trianglesPositions = triangulate(
      this.warpedMap.resourceMask,
      bboxDiameter / DIAMETER_FRACTION
    ).flat()

    // TODO: apply 'projected' in names
    const newGeoMaskVertices = trianglesPositions.map((point) =>
      this.warpedMap.projectedTransformer.transformToGeo(
        point as [number, number]
      )
    )

    this.newGeoMaskTriangles = newGeoMaskVertices.flat()
    this.resourceMaskTriangles = trianglesPositions.flat()

    this.newTransformedGeoMaskTriangles = new Float32Array(
      this.newGeoMaskTriangles.length
    )

    this.transformedResourceMaskTriangles = new Float32Array(
      this.resourceMaskTriangles.length
    )

    if (immediately || !this.currentGeoMaskTriangles.length) {
      this.currentGeoMaskTriangles = this.newGeoMaskTriangles
      this.currentTransformedGeoMaskTriangles =
        this.newTransformedGeoMaskTriangles
    }
  }

  resetCurrentTriangles() {
    this.currentGeoMaskTriangles = this.newGeoMaskTriangles
    this.currentTransformedGeoMaskTriangles =
      this.newTransformedGeoMaskTriangles

    this.newGeoMaskTriangles = []
    this.newTransformedGeoMaskTriangles = new Float32Array()

    this.updateVertexBuffersInternal()
  }

  private updateVertexBuffersInternal() {
    if (this.vao && this.vertexBufferTransform) {
      this.gl.bindVertexArray(this.vao)

      for (
        let index = 0;
        index < this.currentGeoMaskTriangles.length;
        index += 2
      ) {
        const currentTransformedPoint = applyTransform(
          this.vertexBufferTransform,
          [
            this.currentGeoMaskTriangles[index],
            this.currentGeoMaskTriangles[index + 1]
          ]
        )

        this.currentTransformedGeoMaskTriangles[index] =
          currentTransformedPoint[0]
        this.currentTransformedGeoMaskTriangles[index + 1] =
          currentTransformedPoint[1]

        if (this.newGeoMaskTriangles.length) {
          // TODO: find a way to only do this during transition
          const transformedPoint = applyTransform(this.vertexBufferTransform, [
            this.newGeoMaskTriangles[index],
            this.newGeoMaskTriangles[index + 1]
          ])

          this.newTransformedGeoMaskTriangles[index] = transformedPoint[0]
          this.newTransformedGeoMaskTriangles[index + 1] = transformedPoint[1]
        }
      }

      for (
        let index = 0;
        index < this.resourceMaskTriangles.length;
        index += 2
      ) {
        // const transformedPoint = applyTransform(transform, [
        //   this.resourceMaskTriangles[index],
        //   this.resourceMaskTriangles[index + 1]
        // ])

        const transformedPoint = [
          this.resourceMaskTriangles[index],
          this.resourceMaskTriangles[index + 1]
        ]

        this.transformedResourceMaskTriangles[index] = transformedPoint[0]
        this.transformedResourceMaskTriangles[index + 1] = transformedPoint[1]
      }

      // DEV Compute triangle indeces, used for development purposes
      // this.pixelTriangleIndex = new Float32Array(
      //   this.resourceMaskTriangles.length
      // )

      // for (let index = 0; index < this.resourceMaskTriangles.length; index++) {
      //   this.pixelTriangleIndex[3 * index] = index
      //   this.pixelTriangleIndex[3 * index + 1] = index
      //   this.pixelTriangleIndex[3 * index + 2] = index
      // }

      createBuffer(
        this.gl,
        this.program,
        this.currentTransformedGeoMaskTriangles,
        2,
        'a_position_current'
      )

      if (this.newTransformedGeoMaskTriangles.length) {
        createBuffer(
          this.gl,
          this.program,
          this.newTransformedGeoMaskTriangles,
          2,
          'a_position_new'
        )
      }

      createBuffer(
        this.gl,
        this.program,
        this.transformedResourceMaskTriangles,
        2,
        'a_pixel_position'
      )

      // // DEV
      // createBuffer(
      //   this.gl,
      //   this.program,
      //   this.pixelTriangleIndex,
      //   1,
      //   'a_pixel_triangle_index'
      // )
    }
  }

  updateVertexBuffers(transform: Transform) {
    this.vertexBufferTransform = transform
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

  async updateTextures() {
    const gl = this.gl

    const tilesForTextureCount = this.tilesForTexture.size

    if (tilesForTextureCount === 0) {
      return
    }

    // else if (tilesForTextureCount > MAX_TILES) {
    //  throw new Error('too many tiles')
    // }

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

  dispose() {
    this.resourceMaskTriangles = []
    this.transformedResourceMaskTriangles = new Float32Array()
    this.currentGeoMaskTriangles = []
    this.currentTransformedGeoMaskTriangles = new Float32Array()
    this.newGeoMaskTriangles = []
    this.newTransformedGeoMaskTriangles = new Float32Array()

    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.tilesTexture)
    this.gl.deleteTexture(this.scaleFactorsTexture)
    this.gl.deleteTexture(this.tilePositionsTexture)
    this.gl.deleteTexture(this.imagePositionsTexture)
  }
}
