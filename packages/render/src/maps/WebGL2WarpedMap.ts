import potpack from 'potpack'

import { throttle } from 'lodash-es'

import { isOverlapping } from '@allmaps/stdlib'
import { Map as GeoreferencedMap } from '@allmaps/annotation'

import TriangulatedWarpedMap from './TriangulatedWarpedMap.js'
import { WarpedMapEvent, WarpedMapEventType } from '../shared/events.js'
import { computeBboxTile } from '../shared/tiles.js'
import { applyTransform } from '../shared/matrix.js'
import { createBuffer } from '../shared/webgl2.js'

import type { DebouncedFunc } from 'lodash-es'

import type { Line, Transform } from '@allmaps/types'

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
  program: WebGLProgram,
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
      program,
      pointsProgram,
      linesProgram,
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
  gl: WebGL2RenderingContext
  program: WebGLProgram
  pointsProgram: WebGLProgram
  linesProgram: WebGLProgram

  mapsVao: WebGLVertexArrayObject | null
  pointsVao: WebGLVertexArrayObject | null
  linesVao: WebGLVertexArrayObject | null

  CachedTilesByTileUrl: Map<string, CachedTile<ImageBitmap>> = new Map()

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
    pointsProgram: WebGLProgram,
    linesProgram: WebGLProgram,
    options?: Partial<WarpedMapOptions>
  ) {
    super(mapId, georeferencedMap, options)

    this.gl = gl
    this.program = program
    this.pointsProgram = pointsProgram
    this.linesProgram = linesProgram

    this.mapsVao = gl.createVertexArray()
    this.pointsVao = gl.createVertexArray()
    this.linesVao = gl.createVertexArray()

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
   * @param {Transform} projectedGeoToClipTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayers' projectionTransform.
   */
  updateVertexBuffers(projectedGeoToClipTransform: Transform) {
    this.projectedGeoToClipTransform = projectedGeoToClipTransform
    this.updateVertexBuffersMaps()
    this.updateVertexBuffersLines()
    this.updateVertexBuffersPoints()
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
    this.gl.deleteVertexArray(this.mapsVao)
    this.gl.deleteVertexArray(this.pointsVao)
    this.gl.deleteVertexArray(this.linesVao)
    this.gl.deleteTexture(this.packedTilesTexture)
    this.gl.deleteTexture(this.packedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.packedTilesPositionsTexture)
    this.gl.deleteTexture(this.packedTilesResourcePositionsAndDimensionsTexture)
  }

  private updateVertexBuffersMaps() {
    if (!this.mapsVao || !this.projectedGeoToClipTransform) {
      return
    }

    this.gl.bindVertexArray(this.mapsVao)

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
    ).map((_v, i) => {
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

  private updateVertexBuffersLines() {
    if (!this.linesVao) {
      return
    }

    this.gl.bindVertexArray(this.linesVao)

    // GCP lines

    const projectedGeoLines = this.projectedGeoPoints.map(
      (projectedGeoPoint, index) =>
        [
          projectedGeoPoint,
          this.projectedGeoTransformedResourcePoints[index]
        ] as Line
    )

    const sixProjectedGeoPoints = projectedGeoLines
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
      this.gl,
      this.linesProgram,
      new Float32Array(sixProjectedGeoPoints.flat()),
      2,
      'a_projectedGeoPoint'
    )

    const sixProjectedGeoOtherPoints = projectedGeoLines
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
      this.gl,
      this.linesProgram,
      new Float32Array(sixProjectedGeoOtherPoints.flat()),
      2,
      'a_projectedGeoOtherPoint'
    )

    const sixIsOtherPoints = projectedGeoLines
      .map((_projectedGeoLine) => [0, 0, 1, 0, 0, 1])
      .flat()

    createBuffer(
      this.gl,
      this.linesProgram,
      new Float32Array(sixIsOtherPoints.flat()),
      1,
      'a_isOtherPoint'
    )

    const sixNormalSigns = projectedGeoLines
      .map((_projectedGeoLine) => [+1, -1, +1, +1, -1, +1])
      .flat()

    createBuffer(
      this.gl,
      this.linesProgram,
      new Float32Array(sixNormalSigns.flat()),
      1,
      'a_normalSign'
    )
  }

  private updateVertexBuffersPoints() {
    if (!this.pointsVao) {
      return
    }

    this.gl.bindVertexArray(this.pointsVao)

    // Ground controle points

    const projectedGeoPoints = this.projectedGcps.map(
      (projectedGcp) => projectedGcp.geo
    )
    createBuffer(
      this.gl,
      this.pointsProgram,
      new Float32Array(projectedGeoPoints.flat()),
      2,
      'a_projectedGeoPoint'
    )
  }

  private async updateTextures() {
    const gl = this.gl

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

    const CachedTilesByTileUrlCount = cachedTiles.length

    const packedTiles = cachedTiles.map((cachedTile, index) => ({
      w: cachedTile.data.width,
      h: cachedTile.data.height,
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

    // Packed tiles texture

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
      const imageBitmap = cachedTiles[packedTile.index].data
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

    // Packed tiles resource positions and dimensions texture

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

    // Packed tiles scale factors texture

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
