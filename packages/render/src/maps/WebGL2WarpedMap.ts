import { throttle } from 'lodash-es'

import { isOverlapping } from '@allmaps/stdlib'
import { Map as GeoreferencedMap } from '@allmaps/annotation'

import TriangulatedWarpedMap from './TriangulatedWarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import { computeBboxTile } from '../shared/tiles.js'
import { applyTransform } from '../shared/matrix.js'
import { createBuffer } from '../shared/webgl2.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Transform } from '@allmaps/types'

import type { WarpedMapOptions } from '../shared/types.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'
import type { RenderOptions } from '../shared/types.js'

const THROTTLE_WAIT_MS = 100
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

export function createWebGL2WarpedMapFactory(
  gl: WebGL2RenderingContext,
  program: WebGLProgram
) {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    options?: Partial<WarpedMapOptions>
  ) => new WebGL2WarpedMap(mapId, georeferencedMap, gl, program, options)
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
  gl: WebGL2RenderingContext
  program: WebGLProgram

  vao: WebGLVertexArrayObject | null

  CachedTilesByTileUrl: Map<string, CachedTile<ImageBitmap>> = new Map()

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  cachedTilesTextureArray: WebGLTexture | null
  cachedTilesResourcePositionsAndDimensionsTexture: WebGLTexture | null
  cachedTilesScaleFactorsTexture: WebGLTexture | null

  projectedGeoToClipTransform: Transform | undefined

  throttledUpdateTextures: DebouncedFunc<typeof this.updateTextures>

  /**
   * Creates an instance of WebGL2WarpedMap.
   *
   * @constructor
   * @param {string} mapId - ID of the map
   * @param {GeoreferencedMap} georeferencedMap - Georeferenced map used to construct the WarpedMap
   * @param {WebGL2RenderingContext} gl - WebGL rendering context
   * @param {WebGLProgram} program - WebGL program
   * @param {Partial<WarpedMapOptions>} options - WarpedMapOptions
   */
  constructor(
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    options?: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)

    this.gl = gl
    this.program = program

    this.vao = gl.createVertexArray()

    this.cachedTilesTextureArray = gl.createTexture()
    this.cachedTilesScaleFactorsTexture = gl.createTexture()
    this.cachedTilesResourcePositionsAndDimensionsTexture = gl.createTexture()

    this.throttledUpdateTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  /**
   * Update the vertex buffers of this warped map
   *
   * @param {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayers' projectionTransform.
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
  addCachedTileAndUpdateTextures(cachedTile: CachedTile<ImageBitmap>) {
    this.CachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.throttledUpdateTextures()
  }

  /**
   * Remove cached tile from the textures of this map and update textures
   *
   * @param {string} tileUrl
   */
  removeCachedTileAndUpdateTextures(tileUrl: string) {
    this.CachedTilesByTileUrl.delete(tileUrl)
    this.throttledUpdateTextures()
  }

  dispose() {
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.cachedTilesTextureArray)
    this.gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.cachedTilesResourcePositionsAndDimensionsTexture)
  }

  private updateVertexBuffersInternal() {
    if (!this.vao || !this.projectedGeoToClipTransform) {
      return
    }

    this.gl.bindVertexArray(this.vao)

    // Resource triangle points

    const resourceTrianglePoints = this.resourceTrianglePoints
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(resourceTrianglePoints.flat()),
      2,
      'a_resourceTrianglePoint'
    )

    // Clip previous and new triangle points

    const clipPreviousTrianglePoints =
      this.projectedGeoPreviousTrianglePoints.map((point) => {
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

    const clipTrianglePoints = this.projectedGeoTrianglePoints.map((point) => {
      return applyTransform(
        this.projectedGeoToClipTransform as Transform,
        point
      )
    })
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(clipTrianglePoints.flat()),
      2,
      'a_clipTrianglePoint'
    )

    // Previous and new distortion
    // Note: we must update the distortion data even when we don't render distortions
    // to ensure this array buffer is of the correct length, for example when triangulation changes

    const previousTrianglePointsDistortion =
      this.previousTrianglePointsDistortion
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(previousTrianglePointsDistortion),
      1,
      'a_previousTrianglePointDistortion'
    )

    const trianglePointsDistortion = this.trianglePointsDistortion
    createBuffer(
      this.gl,
      this.program,
      new Float32Array(trianglePointsDistortion),
      1,
      'a_trianglePointDistortion'
    )

    // Triangle index

    const trianglePointsTriangleIndex = new Float32Array(
      this.resourceTrianglePoints.length
    ).map((_v, i) => Math.round((i - 1) / 3))

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

    if (!this.hasImageInfo()) {
      return
    }

    if (this.CachedTilesByTileUrl.size === 0) {
      return
    }

    let cachedTiles = [...this.CachedTilesByTileUrl.values()]

    // Only pack tiles that are inside the viewport (as drawn on the resource)
    // and don't differ too much in scale level from the optimal one at this viewport
    cachedTiles = cachedTiles.filter((cachedTile) => {
      return this.resourceViewportRingBbox
        ? isOverlapping(
            computeBboxTile(cachedTile.tile),
            this.resourceViewportRingBbox
          )
        : true
    })

    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)

    // Cached tiles texture array

    const maxTileWidth = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.width)
    )
    const maxTileHeight = Math.max(
      ...this.parsedImage.tileZoomLevels.map((size) => size.height)
    )

    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.cachedTilesTextureArray)

    gl.texImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      gl.RGBA,
      maxTileWidth,
      maxTileHeight,
      cachedTiles.length,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )
    for (let i = 0; i < cachedTiles.length; i++) {
      let imageBitmap = cachedTiles[i].data

      // Tiles are not guaranteed to respect the width and height
      // But the texture array requires the bitmaps to be of the specified size
      // So crop if needed
      if (
        imageBitmap.height > maxTileHeight ||
        imageBitmap.width > maxTileWidth
      ) {
        imageBitmap = await createImageBitmap(
          imageBitmap,
          0,
          0,
          maxTileHeight,
          maxTileHeight
        )
      }

      gl.texSubImage3D(
        gl.TEXTURE_2D_ARRAY,
        0,
        0,
        0,
        i,
        imageBitmap.width,
        imageBitmap.height,
        1,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        imageBitmap
      )
    }
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles resource positions and dimensions texture

    const cachedTilesResourcePositionsAndDimensions = cachedTiles.map(
      (cachedTile) => {
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
      this.cachedTilesResourcePositionsAndDimensionsTexture
    )
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA32I,
      1,
      cachedTiles.length,
      0,
      gl.RGBA_INTEGER,
      gl.INT,
      new Int32Array(cachedTilesResourcePositionsAndDimensions.flat())
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles scale factors texture

    const cachedTilesScaleFactors = cachedTiles.map(
      (cachedTile) => cachedTile.tile.tileZoomLevel.scaleFactor
    )

    gl.bindTexture(gl.TEXTURE_2D, this.cachedTilesScaleFactorsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      cachedTiles.length,
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
}
