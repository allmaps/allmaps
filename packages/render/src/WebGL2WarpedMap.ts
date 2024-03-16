import potpack from 'potpack'

import { throttle } from 'lodash-es'

import { isOverlapping } from '@allmaps/stdlib'

import WarpedMap from './WarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'
import { computeBboxTile } from './shared/tiles.js'
import { applyTransform } from './shared/matrix.js'
import { createBuffer } from './shared/webgl2.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Transform } from '@allmaps/types'

import type { CachedTile } from './CacheableTile.js'
import type { RenderOptions } from './shared/types.js'

const THROTTLE_WAIT_MS = 100
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

// const MAX_SCALE_FACTOR_DIFFERENCE = 2

/**
 * Class for storing the WebGL2 information necessary to draw WarpedMaps
 *
 * @export
 * @class WebGL2WarpedMap
 * @typedef {WebGL2WarpedMap}
 * @extends {EventTarget}
 */
export default class WebGL2WarpedMap extends EventTarget {
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

  throttledUpdateTextures: DebouncedFunc<typeof this.updateTextures>

  /**
   * Creates an instance of WebGL2WarpedMap.
   *
   * @constructor
   * @param {WebGL2RenderingContext} gl - the WebGL2 rendering context
   * @param {WebGLProgram} program - the WebGL2 program
   * @param {WarpedMap} warpedMap - the warped map to render
   */
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

  /**
   * Update the vertex buffers of this warped map
   *
   * @param {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayer projectionTransform.
   */
  updateVertexBuffers(projectedGeoToClipTransform: Transform) {
    this.projectedGeoToClipTransform = projectedGeoToClipTransform
    this.updateVertexBuffersInternal()
  }

  /**
   * Add cached tile to the textures of this map and update textures
   *
   * @param {CachedTile} cachedTile
   */
  addCachedTileAndUpdateTextures(cachedTile: CachedTile) {
    this.CachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  /**
   * Remove cached tile from the textures of this map and update textes
   *
   * @param {string} tileUrl
   */
  removeCachedTileAndUpdateTextures(tileUrl: string) {
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

    // Resource Triangle Points

    const resourceTrianglePoints = this.warpedMap.resourceTrianglePoints
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(resourceTrianglePoints.flat()),
      2,
      'a_resourceTrianglePoint'
    )

    // Clip Previous and New Triangle Points

    const clipPreviousTrianglePoints =
      this.warpedMap.projectedGeoPreviousTrianglePoints.map((point) => {
        return applyTransform(
          this.projectedGeoToClipTransform as Transform,
          point
        )
      })
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(clipPreviousTrianglePoints.flat()),
      2,
      'a_clipPreviousTrianglePoint'
    )

    const clipTrianglePoints = this.warpedMap.projectedGeoTrianglePoints.map(
      (point) => {
        return applyTransform(
          this.projectedGeoToClipTransform as Transform,
          point
        )
      }
    )
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(clipTrianglePoints.flat()),
      2,
      'a_clipTrianglePoint'
    )

    // Previous and New Distortion

    if (this.warpedMap.distortionMeasure) {
      const previousTrianglePointsDistortion =
        this.warpedMap.previousTrianglePointsDistortion
      createBuffer(
        this.gl,
        this.program,
        new Float32Array(previousTrianglePointsDistortion),
        1,
        'a_previousTrianglePointDistortion'
      )

      const trianglePointsDistortion = this.warpedMap.trianglePointsDistortion
      createBuffer(
        this.gl,
        this.program,
        new Float32Array(trianglePointsDistortion),
        1,
        'a_trianglePointDistortion'
      )
    }

    // Triangle index

    let trianglePointsTriangleIndex = new Float32Array(
      this.warpedMap.resourceTrianglePoints.length
    )
    trianglePointsTriangleIndex = trianglePointsTriangleIndex.map((_v, i) => {
      return Math.round((i - 1) / 3)
    })
    createBuffer(
      this.gl,
      this.program,
      trianglePointsTriangleIndex,
      1,
      'a_triangleIndex'
    )
  }

  private async updateTextures() {
    const gl = this.gl

    if (this.CachedTilesByTileUrl.size === 0) {
      return
    }

    let cachedTiles = [...this.CachedTilesByTileUrl.values()]

    // Only pack tiles that are inside the viewport (as drawn on the resource)
    // And don't differ too much in scale level from the optimal one at this viewport
    cachedTiles = cachedTiles.filter((cachedTile) => {
      return this.warpedMap.resourceViewportRingBbox
        ? isOverlapping(
            computeBboxTile(cachedTile.tile),
            this.warpedMap.resourceViewportRingBbox
          )
        : true
    })
    // cachedTiles = cachedTiles.filter((cachedTile) => {
    //   return (
    //     Math.abs(
    //       cachedTile.tile.tileZoomLevel.scaleFactor -
    //         this.warpedMap.bestScaleFactor
    //     ) <= MAX_SCALE_FACTOR_DIFFERENCE
    //   )
    // })

    const CachedTilesByTileUrlCount = cachedTiles.length

    // console.log(
    //   'from',
    //   this.CachedTilesByTileUrl.size,
    //   'packing',
    //   CachedTilesByTileUrlCount
    // )

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
      const imageBitmap = cachedTiles[packedTile.index].imageBitmap
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        packedTile.x,
        packedTile.y,
        imageBitmap.width,
        imageBitmap.height,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        imageBitmap
      )
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

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.TEXTURESUPDATED))
  }
}
