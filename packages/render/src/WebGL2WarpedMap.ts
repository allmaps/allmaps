import potpack from 'potpack'
import earcut from 'earcut'
import { throttle } from 'lodash-es'

import { createBuffer } from './shared/webgl2.js'

import type { WarpedMap, CachedTile, RenderOptions } from './shared/types.js'

const THROTTLE_WAIT_MS = 50

const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

export default class WebGL2WarpedMap extends EventTarget {
  warpedMap: WarpedMap

  gl: WebGL2RenderingContext
  program: WebGLProgram

  imageWidth: number
  imageHeight: number

  triangles: number[]
  vao: WebGLVertexArrayObject | null

  tilesForTexture: Map<string, CachedTile> = new Map()
  // tileImageBitmapsByUrl: Map<string, ImageBitmap> = new Map()

  renderOptions: RenderOptions = {}

  //   currentScaleFactor?: number = undefined
  //   previousScaleFactor?: number = undefined

  //   currentScaleFactorTiles: Map<string, NeededTile> = new Map()
  //   previousScaleFactorTiles: Map<string, NeededTile> = new Map()

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

    this.imageWidth = warpedMap.parsedImage.width
    this.imageHeight = warpedMap.parsedImage.height

    const flattened = earcut.flatten(warpedMap.geoMask.coordinates)
    const vertexIndices = earcut(
      flattened.vertices,
      flattened.holes,
      flattened.dimensions
    )

    this.triangles = vertexIndices
      .map((index) => [
        flattened.vertices[index * 2],
        flattened.vertices[index * 2 + 1]
      ])
      .flat()

    this.tilesTexture = gl.createTexture()
    this.scaleFactorsTexture = gl.createTexture()
    this.tilePositionsTexture = gl.createTexture()
    this.imagePositionsTexture = gl.createTexture()

    this.vao = gl.createVertexArray()
    gl.bindVertexArray(this.vao)

    if (this.vao) {
      createBuffer(gl, program, this.triangles, 2, 'a_position')
    }

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  addCachedTile(tileUrl: string, cachedTile: CachedTile) {
    this.tilesForTexture.set(tileUrl, cachedTile)

    // TODO: throttle calls to updateTextures?
    this.throttledUpdateTextures()
    // this.updateTextures()
  }

  removeCachedTile(tileUrl: string) {
    this.tilesForTexture.delete(tileUrl)
    // this.tileImageBitmapsByUrl.delete(tileUrl)

    // TODO: throttle calls to updateTextures?
    this.throttledUpdateTextures()
    // this.updateTextures()
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
      w: tile.imageData?.width || 0,
      h: tile.imageData?.height || 0,
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

    for (let packedTile of packedTiles) {
      const index = packedTile.index
      const cachedTile = tilesForTexture[index]

      const tileImageBitmap = cachedTile.imageBitmap
      console.log(tileImageBitmap)

      // let tileImageBitmap = this.tileImageBitmapsByUrl.get(cachedTile.url)
      // if (!tileImageBitmap && cachedTile.imageData) {
      //   tileImageBitmap = await createImageBitmap(cachedTile.imageData)
      //   this.tileImageBitmapsByUrl.set(cachedTile.url, tileImageBitmap)
      // }

      if (tileImageBitmap) {
        const textureX = packedTile.x
        const textureY = packedTile.y

        //   textureWidth,
        // textureHeight,

        //   100 = 0..99

        //   textureX = 0
        //   tileImageBitmap.width = 10 ===
        //   0 - 9

        if (textureX + tileImageBitmap.width > textureWidth) {
          console.log(textureX, tileImageBitmap.width, textureWidth)
        }

        if (textureY + tileImageBitmap.height > textureHeight) {
          console.log(textureY, tileImageBitmap.height, textureHeight)
        }

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

  //   dispose() {
  //     this.gl.deleteTexture(this.tilesTexture)
  //     this.gl.deleteTexture(this.scaleFactorsTexture)
  //     this.gl.deleteTexture(this.tilePositionsTexture)
  //     this.gl.deleteTexture(this.imagePositionsTexture)
  //   }
}
