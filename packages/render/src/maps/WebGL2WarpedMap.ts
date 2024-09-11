import { throttle } from 'lodash-es'

import { Map as GeoreferencedMap } from '@allmaps/annotation'

import TriangulatedWarpedMap from './TriangulatedWarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import { applyTransform } from '../shared/matrix.js'
import { createBuffer } from '../shared/webgl2.js'
import {
  equalTileByRowColumnScaleFactor,
  getTilesAtOtherScaleFactors
} from '../shared/tiles.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Tile, Transform } from '@allmaps/types'

import type { WarpedMapOptions } from '../shared/types.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'
import type { RenderOptions } from '../shared/types.js'
import { equalArray } from '@allmaps/stdlib'

const THROTTLE_WAIT_MS = 100
const THROTTLE_OPTIONS = {
  leading: true,
  trailing: true
}

const DEFAULT_OPACITY = 1
const DEFAULT_SATURATION = 1

const TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 5
const TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 1

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

  vao: WebGLVertexArrayObject | null = null

  cachedTilesByTileUrl: Map<string, CachedTile<ImageBitmap>> = new Map()
  previousTextureTileUrls: string[] = []

  opacity: number = DEFAULT_OPACITY
  saturation: number = DEFAULT_SATURATION
  renderOptions: RenderOptions = {}

  cachedTilesTextureArray: WebGLTexture | null = null
  cachedTilesResourcePositionsAndDimensionsTexture: WebGLTexture | null = null
  cachedTilesScaleFactorsTexture: WebGLTexture | null = null

  projectedGeoToClipTransform: Transform | undefined

  clearTextures: DebouncedFunc<typeof this.updateTextures>

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

    this.initializeWebGL(program)

    this.cachedTilesTextureArray = gl.createTexture()
    this.cachedTilesScaleFactorsTexture = gl.createTexture()
    this.cachedTilesResourcePositionsAndDimensionsTexture = gl.createTexture()

    this.clearTextures = throttle(
      this.updateTextures.bind(this),
      THROTTLE_WAIT_MS,
      THROTTLE_OPTIONS
    )
  }

  initializeWebGL(program: WebGLProgram) {
    this.program = program

    this.vao = this.gl.createVertexArray()

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
    this.updateVertexBuffersInternal()
  }

  /**
   * Add cached tile to the textures of this map and update textures
   *
   * @param {CachedTile} cachedTile
   */
  addCachedTileAndUpdateTextures(cachedTile: CachedTile<ImageBitmap>) {
    this.cachedTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    this.clearTextures()
  }

  /**
   * Remove cached tile from the textures of this map and update textures
   *
   * @param {string} tileUrl
   */
  removeCachedTileAndUpdateTextures(tileUrl: string) {
    this.cachedTilesByTileUrl.delete(tileUrl)
    this.clearTextures()
  }

  cancelThrottledFunctions() {
    this.clearTextures.cancel()
  }

  destroy() {
    this.gl.deleteVertexArray(this.vao)
    this.gl.deleteTexture(this.cachedTilesTextureArray)
    this.gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.cachedTilesResourcePositionsAndDimensionsTexture)

    this.cancelThrottledFunctions()

    super.destroy()
  }

  private updateVertexBuffersInternal() {
    if (!this.vao || !this.projectedGeoToClipTransform) {
      return
    }

    this.gl.bindVertexArray(this.vao)

    // Resource triangle points
    createBuffer(
      this.gl,
      this.program,
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
      this.gl,
      this.program,
      new Float32Array(clipPreviousTrianglePoints.flat()),
      2,
      'a_clipPreviousTrianglePoint'
    )

    const clipTrianglePoints = this.projectedGeoTrianglePoints.map((point) =>
      applyTransform(this.projectedGeoToClipTransform as Transform, point)
    )

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

    createBuffer(
      this.gl,
      this.program,
      new Float32Array(this.previousTrianglePointsDistortion),
      1,
      'a_previousTrianglePointDistortion'
    )

    createBuffer(
      this.gl,
      this.program,
      new Float32Array(this.trianglePointsDistortion),
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
  private tileToCachedTile(tile: Tile): CachedTile<ImageBitmap> | undefined {
    return Array.from(this.cachedTilesByTileUrl.values()).find((cachedTile) =>
      equalTileByRowColumnScaleFactor(cachedTile.tile, tile)
    )
  }

  private tileInCachedTiles(tile: Tile): boolean {
    return Array.from(this.cachedTilesByTileUrl.values())
      .map((cachedTile) =>
        equalTileByRowColumnScaleFactor(cachedTile.tile, tile)
      )
      .some((b) => b)
  }

  private getCachedTilesAtOtherScaleFactors(
    tile: Tile
  ): CachedTile<ImageBitmap>[] {
    if (this.cachedTilesByTileUrl.size == 0) {
      return []
    }

    if (!this.hasImageInfo()) {
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

  private async updateTextures() {
    const gl = this.gl

    if (!this.hasImageInfo()) {
      return
    }

    const textureTiles = this.getTextureTiles()

    // Don't update if same request as before
    // This prevents the event TEXTURESUPDATED from being fired
    // Which would otherwise trigger an infinite loop
    if (
      equalArray(
        textureTiles.map((textureTile) => textureTile.tileUrl),
        this.previousTextureTileUrls
      )
    ) {
      return
    }

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
      textureTiles.length,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    )
    for (let i = 0; i < textureTiles.length; i++) {
      const imageBitmap = textureTiles[i].data

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

    const cachedTilesResourcePositionsAndDimensions = textureTiles.map(
      (textureTile) => {
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
      textureTiles.length,
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

    const cachedTilesScaleFactors = textureTiles.map(
      (textureTile) => textureTile.tile.tileZoomLevel.scaleFactor
    )

    gl.bindTexture(gl.TEXTURE_2D, this.cachedTilesScaleFactorsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      textureTiles.length,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(cachedTilesScaleFactors)
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.previousTextureTileUrls = textureTiles.map(
      (textureTile) => textureTile.tileUrl
    )

    this.dispatchEvent(new WarpedMapEvent(WarpedMapEventType.TEXTURESUPDATED))
  }

  getTextureTiles() {
    // Select tiles for tileCache that make sense for this map
    // Either because they are requested, or because they are it's parents or children
    const requestedCachedTiles = []
    const otherTileZoomLevelsCachedTiles = []

    for (const fetchableTile of this.currentFetchableTiles) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        requestedCachedTiles.push(cachedTile)
      } else {
        for (const cachedTile of this.getCachedTilesAtOtherScaleFactors(
          fetchableTile.tile
        )) {
          otherTileZoomLevelsCachedTiles.push(cachedTile)
        }
      }
    }

    // Select tiles for tileCache that are at overview zoomlevel
    const overviewCachedTiles = []

    for (const fetchableTile of this.currentOverviewFetchableTiles) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        overviewCachedTiles.push(cachedTile)
      }
    }

    let textureTiles = [
      ...requestedCachedTiles,
      ...otherTileZoomLevelsCachedTiles,
      ...overviewCachedTiles
    ]

    // Making textureTiles unique by tileUrl
    const textureTilesByTileUrl: Map<
      string,
      CachedTile<ImageBitmap>
    > = new Map()
    textureTiles.forEach((cachedTile) =>
      textureTilesByTileUrl.set(cachedTile.tileUrl, cachedTile)
    )
    textureTiles = [...textureTilesByTileUrl.values()]

    return textureTiles
  }
}
