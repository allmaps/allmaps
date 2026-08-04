import {
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
  red,
  darkblue
} from '@allmaps/tailwind'

import { TriangulatedWarpedMap } from './TriangulatedWarpedMap.js'
import {
  applyHomogeneousTransform,
  createHomogeneousTransform,
  invertHomogeneousTransform
} from '../shared/homogeneous-transform.js'
import { createBuffer } from '../shared/webgl2.js'
import { getTilesAtOtherScaleFactors, tileKey } from '../shared/tiles.js'
import { getCachedFractionalOpaqueRgba } from '../shared/colors-cache.js'

import type { Image } from '@allmaps/iiif-parser'
import type {
  Line,
  Point,
  Tile,
  HomogeneousTransform,
  Size
} from '@allmaps/types'

import type {
  LineGroup,
  PointGroup,
  AnimationOptions,
  SpecificWebGL2WarpedMapOptions,
  WebGL2WarpedMapOptions,
  WarpedMapListOptions,
  AnimationInternalOptions,
  ShouldRenderOptions,
  WebGL2WarpedMapWithoutGeoreferencedMapOptions
} from '../shared/types.js'
import type { CachedTile } from '../tilecache/CacheableTile.js'

const DEFAULT_RENDER_LINE_GROUP_OPTIONS = {
  viewportSize: 6,
  color: black,
  viewportBorderSize: 0,
  borderColor: white
}

const DEFAULT_RENDER_POINT_GROUP_OPTION = {
  viewportSize: 10,
  color: black,
  viewportBorderSize: 1,
  borderColor: white
}

const DEFAULT_SPECIFIC_WEBGL2_WARPED_MAP_OPTIONS: SpecificWebGL2WarpedMapOptions =
  {
    renderGcps: false,
    renderGcpsColor: blue,
    renderTransformedGcps: false,
    renderTransformedGcpsColor: pink,
    renderVectors: false,
    renderVectorsSize: 4,
    renderVectorsColor: black,
    renderFullMask: false,
    renderFullMaskSize: 4,
    renderFullMaskColor: green,
    renderMask: false,
    renderMaskSize: 4,
    renderMaskColor: pink,
    renderAppliedMask: false,
    renderAppliedMaskSize: 4,
    renderAppliedMaskColor: pink,
    opacity: 1,
    saturation: 1,
    removeColor: false,
    removeColorColor: black,
    removeColorThreshold: 0.3,
    removeColorHardness: 0.7,
    colorize: false,
    colorizeColor: pink,
    renderGrid: false,
    renderGridColor: black,
    distortionColor00: red,
    distortionColor01: darkblue,
    distortionColor1: green,
    distortionColor2: yellow,
    distortionColor3: red,
    debugTiles: false,
    debugTriangles: false
  }

const DEFAULT_SHOULD_RENDER_OPTIONS: ShouldRenderOptions = {
  checkOpacity: false
}

const TEXTURES_MAX_HIGHER_LOG2_SCALE_FACTOR_DIFF = 5
const TEXTURES_MAX_LOWER_LOG2_SCALE_FACTOR_DIFF = 1

// The tiles texture array depth is allocated in steps of this many layers, so
// that individual tile arrivals append into pre-allocated headroom instead of
// triggering a full (immutable) texStorage3D reallocation on every tile.
const TEXTURE_ARRAY_DEPTH_GROWTH = 8

export function createWebGL2WarpedMapFactory(
  gl: WebGL2RenderingContext,
  mapProgram: WebGLProgram,
  linesProgram: WebGLProgram,
  pointsProgram: WebGLProgram
) {
  return (
    mapId: string,
    georeferencedMap: GeoreferencedMap,
    listOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    mapOptions?: Partial<WebGL2WarpedMapOptions>
  ) =>
    new WebGL2WarpedMap(
      mapId,
      georeferencedMap,
      gl,
      mapProgram,
      linesProgram,
      pointsProgram,
      listOptions,
      mapOptions
    )
}

/**
 * Class for WarpedMaps that are rendered with WebGL 2
 */
export class WebGL2WarpedMap extends TriangulatedWarpedMap {
  declare mapOptions: Partial<WebGL2WarpedMapOptions>
  declare listOptions: Partial<WebGL2WarpedMapOptions>
  declare georeferencedMapOptions: Partial<WebGL2WarpedMapOptions>
  declare defaultOptions: WebGL2WarpedMapOptions
  declare options: WebGL2WarpedMapOptions

  // De facto make this a WarpedMapWithImage
  // (Multiple inhertance is not possible in TypeScript)
  declare imageId: string
  declare image: Image
  declare tileSize: Size

  gl: WebGL2RenderingContext
  mapProgram!: WebGLProgram
  linesProgram!: WebGLProgram
  pointsProgram!: WebGLProgram

  mapVao: WebGLVertexArrayObject | null = null
  linesVao: WebGLVertexArrayObject | null = null
  pointsVao: WebGLVertexArrayObject | null = null

  lineGroups: LineGroup[] = []
  pointGroups: PointGroup[] = []

  // Consider to store cachedTilesByTileKey as a quadtree for faster lookups
  cachedTilesByTileKey: Map<string, CachedTile<ImageBitmap>>
  cachedTilesByTileUrl: Map<string, CachedTile<ImageBitmap>>
  cachedTilesForTextureByTileUrl: Map<string, CachedTile<ImageBitmap>> =
    new Map()
  previousCachedTilesForTextureByTileUrl: Map<string, CachedTile<ImageBitmap>> =
    new Map()

  cachedTilesTextureArray: WebGLTexture | null = null
  cachedTilesResourceOriginPointsAndSizesTexture: WebGLTexture | null = null
  cachedTilesScaleFactorsTexture: WebGLTexture | null = null
  private cachedTilesTextureArrayAllocatedDepth = 0

  // Slot bookkeeping for incremental texture updates: each resident tile keeps
  // a fixed, packed layer (slot) in the texture array and lookup textures, so
  // an arriving tile is uploaded into a single slot rather than re-uploading
  // the whole map. cachedTilesByTextureSlot keeps slots packed (keys
  // 0..size-1); its size is textureSlotCount, used by the fragment shader to
  // bound its per-fragment loop (the allocated depth can be larger, see growth
  // above).
  private textureSlotsByTileUrl: Map<string, number> = new Map()
  private cachedTilesByTextureSlot: Map<number, CachedTile<ImageBitmap>> =
    new Map()
  textureSlotCount = 0

  // About renderHomogeneousTransform and InvertedRenderHomogeneousTransform:
  // renderHomogeneousTransform is the product of:
  // - the viewport's projectedGeoToClipTransform (projected geo coordinates -> clip coordinates)
  // - the saved invertedRenderHomogeneousTransform (projected clip coordinates -> geo coordinates)
  // since updateVertexBuffers ('where to draw triangles') run with possibly a different Viewport then renderInternal ('drawing the triangles'), a difference caused by throttling, there needs to be an adjustment.
  // this adjustment is minimal: indeed, since invertedRenderHomogeneousTransform is set as the inverse of the viewport's projectedGeoToClipTransform in updateVertexBuffers()
  // this renderHomogeneousTransform is almost the identity transform [1, 0, 0, 1, 0, 0].
  invertedRenderHomogeneousTransform: HomogeneousTransform

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
    listOptions?: Partial<WarpedMapListOptions<WebGL2WarpedMap>>,
    mapOptions?: Partial<WebGL2WarpedMapOptions>
  ) {
    super(
      mapId,
      georeferencedMap,
      listOptions as Partial<WarpedMapListOptions<TriangulatedWarpedMap>>,
      mapOptions
    )

    this.cachedTilesByTileKey = new Map()
    this.cachedTilesByTileUrl = new Map()

    this.gl = gl
    this.initializeWebGL(mapProgram, linesProgram, pointsProgram)

    this.invertedRenderHomogeneousTransform = createHomogeneousTransform()
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
    this.cachedTilesResourceOriginPointsAndSizesTexture =
      this.gl.createTexture()
    this.cachedTilesTextureArrayAllocatedDepth = 0

    // The freshly created textures are empty, so reset the slot bookkeeping.
    this.textureSlotsByTileUrl.clear()
    this.cachedTilesByTextureSlot.clear()
    this.textureSlotCount = 0
  }

  /**
   * Get default options
   */
  static getDefaultOptions(): WebGL2WarpedMapOptions {
    return mergeOptions(
      DEFAULT_SPECIFIC_WEBGL2_WARPED_MAP_OPTIONS,
      super.getDefaultOptions()
    )
  }

  /**
   * Get default options without the options overwritten by the georeferenced map
   */
  static getDefaultWithoutGeoreferencedMapOptions(): WebGL2WarpedMapWithoutGeoreferencedMapOptions {
    return mergeOptions(
      DEFAULT_SPECIFIC_WEBGL2_WARPED_MAP_OPTIONS,
      super.getDefaultWithoutGeoreferencedMapOptions()
    )
  }

  /**
   * Set the defaultOptions
   */
  setDefaultOptions() {
    this.defaultOptions = WebGL2WarpedMap.getDefaultOptions()
  }

  /**
   * Set the list options
   *
   * @param listOptions - list options
   * @param animationOptions - Animation options
   */
  setListOptions(
    listOptions?: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions>
  ): object {
    return super.setListOptions(listOptions, animationOptions)
  }

  /**
   * Set the map-specific options
   *
   * @param mapOptions - Map-specific options
   * @param animationOptions - Animation options
   */
  setMapOptions(
    mapOptions?: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions & AnimationInternalOptions>
  ): object {
    return super.setMapOptions(mapOptions, animationOptions)
  }

  /**
   * Set the map-specific options, and the list options
   *
   * @param mapOptions - Map-specific options
   * @param listOptions - list options
   * @param animationOptions - Animation options
   */
  setMapAndListOptions(
    mapOptions?: Partial<WebGL2WarpedMapOptions>,
    listOptions?: Partial<WebGL2WarpedMapOptions>,
    animationOptions?: Partial<AnimationOptions & AnimationInternalOptions>
  ): object {
    return super.setMapAndListOptions(mapOptions, listOptions, animationOptions)
  }

  protected applyOptions(animationOptions?: Partial<AnimationOptions>) {
    const changedOptions = super.applyOptions(animationOptions)

    this.options.opacity =
      (this.listOptions?.opacity ?? this.defaultOptions.opacity) *
      (this.mapOptions?.opacity ?? 1)
    this.options.saturation =
      (this.listOptions?.saturation ?? this.defaultOptions.saturation) *
      (this.mapOptions?.saturation ?? 1)

    return changedOptions
  }

  shouldRenderMap(partialOptions?: Partial<ShouldRenderOptions>): boolean {
    const options = mergeOptions(DEFAULT_SHOULD_RENDER_OPTIONS, partialOptions)
    return (
      super.shouldRenderMap(partialOptions) &&
      this.options.renderMaps !== false &&
      (options.checkOpacity ? this.options.opacity !== 0 : true)
    )
  }

  shouldRenderLines(): boolean {
    return (
      super.shouldRenderLines() &&
      this.options.renderLines !== false &&
      (this.options.renderFullMask ||
        this.options.renderMask ||
        this.options.renderAppliedMask ||
        this.options.renderVectors)
    )
  }

  shouldRenderPoints(): boolean {
    return (
      super.shouldRenderPoints() &&
      this.options.renderPoints !== false &&
      (this.options.renderGcps || this.options.renderTransformedGcps)
    )
  }

  /**
   * Update the vertex buffers of this warped map
   *
   * @param projectedGeoToClipHomogeneousTransform - Transform from projected geo coordinates to webgl2 coordinates in the [-1, 1] range. Equivalent to OpenLayers' projectionTransform.
   */
  updateVertexBuffers(
    projectedGeoToClipHomogeneousTransform: HomogeneousTransform
  ) {
    this.invertedRenderHomogeneousTransform = invertHomogeneousTransform(
      projectedGeoToClipHomogeneousTransform
    )

    if (this.shouldRenderMap()) {
      this.updateVertexBuffersMap(projectedGeoToClipHomogeneousTransform)
    }
    if (this.shouldRenderLines()) {
      this.updateVertexBuffersLines(projectedGeoToClipHomogeneousTransform)
    }
    if (this.shouldRenderPoints()) {
      this.updateVertexBuffersPoints(projectedGeoToClipHomogeneousTransform)
    }
  }

  /**
   * Clear textures for this map
   */
  clearTextures() {
    const gl = this.gl

    gl.deleteTexture(this.cachedTilesTextureArray)
    this.cachedTilesTextureArray = gl.createTexture()
    this.cachedTilesTextureArrayAllocatedDepth = 0

    gl.deleteTexture(this.cachedTilesResourceOriginPointsAndSizesTexture)
    this.cachedTilesResourceOriginPointsAndSizesTexture = gl.createTexture()

    gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.cachedTilesScaleFactorsTexture = gl.createTexture()

    this.cachedTilesTextureArrayAllocatedDepth = 0

    this.cachedTilesForTextureByTileUrl.clear()
    this.previousCachedTilesForTextureByTileUrl.clear()

    this.textureSlotsByTileUrl.clear()
    this.cachedTilesByTextureSlot.clear()
    this.textureSlotCount = 0
  }

  /**
   * Add a cached tile to this map's tile set.
   *
   * This only records the tile; the actual texture upload happens later, in the
   * renderer's per-frame flush (which calls {@link updateTextures}), so uploads
   * stay bounded and frame-aligned instead of running on a per-map throttle.
   *
   * @param cachedTile
   */
  addCachedTile(cachedTile: CachedTile<ImageBitmap>) {
    this.cachedTilesByTileKey.set(cachedTile.fetchableTile.tileKey, cachedTile)
    this.cachedTilesByTileUrl.set(cachedTile.fetchableTile.tileUrl, cachedTile)
  }

  /**
   * Remove a cached tile from this map's tile set.
   *
   * As with {@link addCachedTile}, the texture is reconciled later in the
   * renderer's per-frame flush.
   *
   * @param tileUrl
   * @returns whether the tile was present (and hence textures need updating)
   */
  removeCachedTile(tileUrl: string): boolean {
    const cachedTile = this.cachedTilesByTileUrl.get(tileUrl)
    if (!cachedTile) {
      return false
    }
    this.cachedTilesByTileKey.delete(cachedTile.fetchableTile.tileKey)
    this.cachedTilesByTileUrl.delete(tileUrl)
    return true
  }

  destroy() {
    this.gl.deleteVertexArray(this.mapVao)
    this.gl.deleteVertexArray(this.linesVao)
    this.gl.deleteVertexArray(this.pointsVao)
    this.gl.deleteTexture(this.cachedTilesTextureArray)
    this.gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.gl.deleteTexture(this.cachedTilesResourceOriginPointsAndSizesTexture)

    super.destroy()
  }

  private setLineGroups() {
    this.lineGroups = []

    if (this.options.renderFullMask) {
      this.lineGroups.push({
        projectedGeoLines: lineStringToLines(
          this.projectedGeoTriangulationFullMask
        ),
        projectedGeoPreviousLines: lineStringToLines(
          this.projectedGeoPreviousTriangulationFullMask
        ),
        viewportSize: this.options.renderFullMaskSize,
        color: this.options.renderFullMaskColor,
        viewportBorderSize: this.options.renderFullMaskBorderSize,
        borderColor: this.options.renderFullMaskBorderColor
      })
    }

    if (this.options.renderAppliedMask) {
      this.lineGroups.push({
        projectedGeoLines: lineStringToLines(
          this.projectedGeoTriangulationAppliedMask
        ),
        projectedGeoPreviousLines: lineStringToLines(
          this.projectedGeoPreviousTriangulationAppliedMask
        ),
        viewportSize: this.options.renderAppliedMaskSize,
        color: this.options.renderAppliedMaskColor,
        viewportBorderSize: this.options.renderAppliedMaskBorderSize,
        borderColor: this.options.renderAppliedMaskBorderColor
      })
    }

    if (this.options.renderMask) {
      this.lineGroups.push({
        projectedGeoLines: lineStringToLines(
          this.projectedGeoTriangulationMask
        ),
        projectedGeoPreviousLines: lineStringToLines(
          this.projectedGeoPreviousTriangulationMask
        ),
        viewportSize: this.options.renderMaskSize,
        color: this.options.renderMaskColor,
        viewportBorderSize: this.options.renderMaskBorderSize,
        borderColor: this.options.renderMaskBorderColor
      })
    }

    if (this.options.renderVectors) {
      this.lineGroups.push({
        projectedGeoLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoTransformedResourcePoints
        ),
        projectedGeoPreviousLines: pointsAndPointsToLines(
          this.projectedGeoPoints,
          this.projectedGeoPreviousTransformedResourcePoints
        ),
        viewportSize: this.options.renderVectorsSize,
        color: this.options.renderVectorsColor,
        viewportBorderSize: this.options.renderVectorsBorderSize,
        borderColor: this.options.renderVectorsBorderColor
      })
    }
  }

  private setPointGroups() {
    this.pointGroups = []

    if (this.options.renderGcps) {
      this.pointGroups.push({
        projectedGeoPoints: this.projectedGeoPoints,
        viewportSize: this.options.renderGcpsSize,
        color: this.options.renderGcpsColor,
        viewportBorderSize: this.options.renderGcpsBorderSize,
        borderColor: this.options.renderGcpsBorderColor
      })
    }

    if (this.options.renderTransformedGcps) {
      this.pointGroups.push({
        projectedGeoPoints: this.projectedGeoTransformedResourcePoints,
        projectedGeoPreviousPoints:
          this.projectedGeoPreviousTransformedResourcePoints,
        viewportSize: this.options.renderTransformedGcpsSize,
        color: this.options.renderTransformedGcpsColor,
        viewportBorderSize: this.options.renderTransformedGcpsBorderSize,
        borderColor: this.options.renderTransformedGcpsBorderColor
      })
    }
  }

  private updateVertexBuffersMap(
    projectedGeoToClipHomogeneousTransform: HomogeneousTransform
  ) {
    if (!this.mapVao) {
      return
    }

    const gl = this.gl
    const program = this.mapProgram
    gl.bindVertexArray(this.mapVao)

    const resourceTrianglePointsFlat = new Float32Array(
      this.resourceTrianglePoints.length * 2
    )
    for (let i = 0; i < this.resourceTrianglePoints.length; i++) {
      const p = this.resourceTrianglePoints[i]
      resourceTrianglePointsFlat[i * 2] = p[0]
      resourceTrianglePointsFlat[i * 2 + 1] = p[1]
    }
    createBuffer(
      gl,
      program,
      resourceTrianglePointsFlat,
      2,
      'a_resourceTrianglePoint'
    )

    const clipPreviousTrianglePointsFlat = new Float32Array(
      this.projectedGeoPreviousTrianglePoints.length * 2
    )
    for (let i = 0; i < this.projectedGeoPreviousTrianglePoints.length; i++) {
      const transformed = applyHomogeneousTransform(
        projectedGeoToClipHomogeneousTransform,
        this.projectedGeoPreviousTrianglePoints[i]
      )
      clipPreviousTrianglePointsFlat[i * 2] = transformed[0]
      clipPreviousTrianglePointsFlat[i * 2 + 1] = transformed[1]
    }
    createBuffer(
      gl,
      program,
      clipPreviousTrianglePointsFlat,
      2,
      'a_clipPreviousTrianglePoint'
    )

    const clipTrianglePointsFlat = new Float32Array(
      this.projectedGeoTrianglePoints.length * 2
    )
    for (let i = 0; i < this.projectedGeoTrianglePoints.length; i++) {
      const transformed = applyHomogeneousTransform(
        projectedGeoToClipHomogeneousTransform,
        this.projectedGeoTrianglePoints[i]
      )
      clipTrianglePointsFlat[i * 2] = transformed[0]
      clipTrianglePointsFlat[i * 2 + 1] = transformed[1]
    }
    createBuffer(gl, program, clipTrianglePointsFlat, 2, 'a_clipTrianglePoint')

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

    const trianglePointsTriangleIndex = new Float32Array(
      this.resourceTrianglePoints.length
    )
    for (let i = 0; i < this.resourceTrianglePoints.length; i++) {
      trianglePointsTriangleIndex[i] = i
    }
    createBuffer(
      gl,
      program,
      trianglePointsTriangleIndex,
      1,
      'a_trianglePointIndex'
    )

    const trianglePointsInsideFlat = new Float32Array(
      this.trianglePointsInside.length
    )
    for (let i = 0; i < this.trianglePointsInside.length; i++) {
      trianglePointsInsideFlat[i] = this.trianglePointsInside[i] ? 1 : 0
    }
    createBuffer(
      gl,
      program,
      trianglePointsInsideFlat,
      1,
      'a_trianglePointInside'
    )
  }

  private updateVertexBuffersLines(
    projectedGeoToClipHomogeneousTransform: HomogeneousTransform
  ) {
    if (!this.linesVao) {
      return
    }

    const gl = this.gl
    const program = this.linesProgram
    gl.bindVertexArray(this.linesVao)

    this.setLineGroups()

    const clipSixPoints = this.lineGroups
      .reduce(
        (accumulator: Line[], lineGroup) =>
          accumulator.concat(lineGroup.projectedGeoLines),
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
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPoints.flat()),
      2,
      'a_clipPoint'
    )

    const clipSixOtherPoints = this.lineGroups
      .reduce(
        (accumulator: Line[], lineGroup) =>
          accumulator.concat(lineGroup.projectedGeoLines),
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
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixOtherPoints.flat()),
      2,
      'a_clipOtherPoint'
    )

    const clipSixPreviousPoints = this.lineGroups
      .reduce(
        (accumulator: Line[], lineGroup) =>
          accumulator.concat(
            lineGroup.projectedGeoPreviousLines || lineGroup.projectedGeoLines
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
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPreviousPoints.flat()),
      2,
      'a_clipPreviousPoint'
    )

    const clipSixPreviousOtherPoints = this.lineGroups
      .reduce(
        (accumulator: Line[], lineGroup) =>
          accumulator.concat(
            lineGroup.projectedGeoPreviousLines || lineGroup.projectedGeoLines
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
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipSixPreviousOtherPoints.flat()),
      2,
      'a_clipPreviousOtherPoint'
    )

    const sixIsOtherPoints = this.lineGroups.reduce(
      (accumulator: number[], lineGroup) =>
        accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) => [
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

    const sixNormalSigns = this.lineGroups.reduce(
      (accumulator: number[], lineGroup) =>
        accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) => [
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

    const viewportSizes = this.lineGroups.reduce(
      (accumulator: number[], lineGroup) =>
        accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              lineGroup.viewportSize ??
                DEFAULT_RENDER_LINE_GROUP_OPTIONS.viewportSize
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

    const colors = this.lineGroups.reduce(
      (accumulator: number[][], lineGroup) => {
        const color = getCachedFractionalOpaqueRgba(
          lineGroup.color ?? DEFAULT_RENDER_LINE_GROUP_OPTIONS.color
        )
        return accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(color)
          )
        )
      },
      []
    )
    createBuffer(gl, program, new Float32Array(colors.flat()), 4, 'a_color')

    const viewportBorderSizes = this.lineGroups.reduce(
      (accumulator: number[], lineGroup) =>
        accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(
              lineGroup.viewportBorderSize ??
                DEFAULT_RENDER_LINE_GROUP_OPTIONS.viewportBorderSize
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

    const borderColors = this.lineGroups.reduce(
      (accumulator: number[][], lineGroup) => {
        const color = getCachedFractionalOpaqueRgba(
          lineGroup.borderColor ?? DEFAULT_RENDER_LINE_GROUP_OPTIONS.borderColor
        )
        return accumulator.concat(
          lineGroup.projectedGeoLines.flatMap((_projectedGeoLine) =>
            Array(6).fill(color)
          )
        )
      },
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

  private updateVertexBuffersPoints(
    projectedGeoToClipHomogeneousTransform: HomogeneousTransform
  ) {
    if (!this.pointsVao) {
      return
    }

    const gl = this.gl
    const program = this.pointsProgram
    gl.bindVertexArray(this.pointsVao)

    this.setPointGroups()

    const clipPoints = this.pointGroups
      .reduce(
        (accumulator: Point[], pointGroup) =>
          accumulator.concat(pointGroup.projectedGeoPoints),
        []
      )
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipPoints.flat()),
      2,
      'a_clipPoint'
    )

    const clipPreviousPoints = this.pointGroups
      .reduce(
        (accumulator: Point[], pointGroup) =>
          accumulator.concat(
            pointGroup.projectedGeoPreviousPoints ||
              pointGroup.projectedGeoPoints
          ),
        []
      )
      .map((point) =>
        applyHomogeneousTransform(projectedGeoToClipHomogeneousTransform, point)
      )
    createBuffer(
      gl,
      program,
      new Float32Array(clipPreviousPoints.flat()),
      2,
      'a_clipPreviousPoint'
    )

    const viewportSizes = this.pointGroups.reduce(
      (accumulator: number[], pointGroup) =>
        accumulator.concat(
          pointGroup.projectedGeoPoints.map(
            (_projectedGeoPoint) =>
              pointGroup.viewportSize ??
              DEFAULT_RENDER_POINT_GROUP_OPTION.viewportSize
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

    const colors = this.pointGroups.reduce(
      (accumulator: number[][], pointGroup) => {
        const color = getCachedFractionalOpaqueRgba(
          pointGroup.color ?? DEFAULT_RENDER_POINT_GROUP_OPTION.color
        )
        return accumulator.concat(
          pointGroup.projectedGeoPoints.map((_projectedGeoPoint) => color)
        )
      },
      []
    )
    createBuffer(gl, program, new Float32Array(colors.flat()), 4, 'a_color')

    const viewportBorderSizes = this.pointGroups.reduce(
      (accumulator: number[], pointGroup) =>
        accumulator.concat(
          pointGroup.projectedGeoPoints.map(
            (_projectedGeoPoint) =>
              pointGroup.viewportBorderSize ??
              DEFAULT_RENDER_POINT_GROUP_OPTION.viewportBorderSize
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

    const borderColors = this.pointGroups.reduce(
      (accumulator: number[][], pointGroup) => {
        const color = getCachedFractionalOpaqueRgba(
          pointGroup.borderColor ??
            DEFAULT_RENDER_POINT_GROUP_OPTION.borderColor
        )
        return accumulator.concat(
          pointGroup.projectedGeoPoints.map((_projectedGeoPoint) => color)
        )
      },
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

  /**
   * Reconcile this map's resident texture slots with the tiles it currently
   * wants to show, uploading only what changed.
   *
   * Uploads are bounded: at most `maxUploads` tile uploads are performed per
   * call, across both swap-remove moves and new-tile additions. Any leftover is
   * reported as `backlog` so the renderer can drain it over subsequent frames,
   * keeping per-frame GPU upload cost bounded (and hence smooth). This is called
   * from the renderer's per-frame flush, not on a per-map throttle.
   *
   * @param maxUploads - Maximum number of tile uploads to perform this call
   * @returns the number of uploads performed and the number of tiles still
   *   waiting (removes + adds not yet processed); a non-zero backlog means this
   *   map should be flushed again on a later frame
   */
  updateTextures(maxUploads: number): {
    uploadsPerformed: number
    backlog: number
  } {
    if (!this.image) {
      return { uploadsPerformed: 0, backlog: 0 }
    }

    // Find out which tiles to include in texture
    this.updateCachedTilesForTextures()

    // Reconcile the resident texture slots with the desired set of tiles,
    // uploading only what changed instead of re-uploading every tile.

    // Desired tiles not yet resident (to add).
    const cachedTilesToAdd = [
      ...this.cachedTilesForTextureByTileUrl.values()
    ].filter(
      (cachedTile) =>
        !this.textureSlotsByTileUrl.has(cachedTile.fetchableTile.tileUrl)
    )
    // Resident tiles no longer desired (to remove).
    const tileUrlsToRemove: string[] = []
    for (const tileUrl of this.textureSlotsByTileUrl.keys()) {
      if (!this.cachedTilesForTextureByTileUrl.has(tileUrl)) {
        tileUrlsToRemove.push(tileUrl)
      }
    }

    // When nothing new needs adding and the desired set is only a (non-empty)
    // subset of the previous set — i.e. tiles were merely dropped — leave the
    // now-stale residents in place rather than doing expensive removals, until
    // the next tile is added. Also nothing to do when there are no tiles at all.
    // The cachedTilesToAdd.length === 0 term is essential once uploads are
    // capped: a tile deferred to a later frame (desired but not yet uploaded,
    // hence not resident) still shows up in cachedTilesToAdd, keeping it
    // non-empty. That stops this guard from firing on a frame where no new tile
    // arrived but deferred adds remain, which would otherwise strand them
    // un-uploaded; instead we fall through and drain them below.
    if (
      cachedTilesToAdd.length === 0 &&
      (this.cachedTilesForTextureByTileUrl.size === 0 ||
        subSetArray(
          [...this.previousCachedTilesForTextureByTileUrl.keys()],
          [...this.cachedTilesForTextureByTileUrl.keys()]
        ))
    ) {
      return { uploadsPerformed: 0, backlog: 0 }
    }

    let budget = maxUploads
    let uploadsPerformed = 0

    // Remove no-longer-desired tiles first, keeping cachedTilesByTextureSlot
    // packed by moving the last resident tile into each freed slot (swap-remove).
    // Each move is one upload and counts against the budget; leftover removals
    // are retried on a later frame.
    let removeIndex = 0
    for (; removeIndex < tileUrlsToRemove.length; removeIndex++) {
      if (budget <= 0) {
        break
      }
      const tileUrl = tileUrlsToRemove[removeIndex]
      const slot = this.textureSlotsByTileUrl.get(tileUrl)
      if (slot === undefined) {
        continue
      }
      this.textureSlotsByTileUrl.delete(tileUrl)
      const lastSlot = this.cachedTilesByTextureSlot.size - 1
      if (slot !== lastSlot) {
        const movedTile = this.cachedTilesByTextureSlot.get(lastSlot)!
        this.cachedTilesByTextureSlot.set(slot, movedTile)
        this.textureSlotsByTileUrl.set(movedTile.fetchableTile.tileUrl, slot)
        this.uploadTileToSlot(movedTile, slot)
        budget -= 1
        uploadsPerformed += 1
      }
      this.cachedTilesByTextureSlot.delete(lastSlot)
    }
    const remainingRemoves = tileUrlsToRemove.length - removeIndex

    // Add tiles that aren't resident yet, appending them into free slots,
    // bounded by the remaining budget. Leftover additions are retried later.
    const cachedTilesToAddNow =
      budget > 0 ? cachedTilesToAdd.slice(0, budget) : []
    if (cachedTilesToAddNow.length > 0) {
      const requiredDepth =
        this.cachedTilesByTextureSlot.size + cachedTilesToAddNow.length
      if (requiredDepth > this.cachedTilesTextureArrayAllocatedDepth) {
        // Grow in steps so single arrivals append into headroom instead of
        // reallocating every time. reallocateTextures re-uploads the tiles
        // currently in cachedTilesByTextureSlot (the existing residents) into the
        // fresh texture; the tiles in cachedTilesToAddNow are appended (and
        // uploaded) only in the loop below, so they are not yet in
        // cachedTilesByTextureSlot here and are not uploaded twice. Keep the
        // cachedTilesByTextureSlot.set() below this call to preserve that.
        const depth =
          Math.ceil(requiredDepth / TEXTURE_ARRAY_DEPTH_GROWTH) *
          TEXTURE_ARRAY_DEPTH_GROWTH
        this.reallocateTextures(depth)
      }
      for (const cachedTile of cachedTilesToAddNow) {
        const slot = this.cachedTilesByTextureSlot.size
        this.cachedTilesByTextureSlot.set(slot, cachedTile)
        this.textureSlotsByTileUrl.set(cachedTile.fetchableTile.tileUrl, slot)
        this.uploadTileToSlot(cachedTile, slot)
        budget -= 1
        uploadsPerformed += 1
      }
    }
    const remainingAdds = cachedTilesToAdd.length - cachedTilesToAddNow.length

    this.textureSlotCount = this.cachedTilesByTextureSlot.size

    return {
      uploadsPerformed,
      backlog: remainingRemoves + remainingAdds
    }
  }

  /**
   * (Re)allocate the tiles texture array and the two lookup textures at the
   * given depth, then re-upload all currently resident tiles into their slots.
   *
   * texStorage3D is immutable, so growing the depth requires a fresh texture
   * object. This only runs when the number of resident tiles crosses a
   * TEXTURE_ARRAY_DEPTH_GROWTH boundary, not on every tile arrival.
   */
  private reallocateTextures(depth: number) {
    const gl = this.gl
    const width = this.tileSize[0]
    const height = this.tileSize[1]

    // Cached tiles texture array
    gl.deleteTexture(this.cachedTilesTextureArray)
    this.cachedTilesTextureArray = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.cachedTilesTextureArray)
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, width, height, depth)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles resource origin points and sizes texture (4 rows per slot).
    // A previous version used gl.RGBA_INTEGER as this texture's format.
    // However, this seemed to cause Chrome to crash on some systems while
    // zooming in and out. Using gl.RED_INTEGER and multiplying the height by 4
    // to account for the 4 values per tile seems to fix the issue.
    gl.deleteTexture(this.cachedTilesResourceOriginPointsAndSizesTexture)
    this.cachedTilesResourceOriginPointsAndSizesTexture = gl.createTexture()
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.cachedTilesResourceOriginPointsAndSizesTexture
    )
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      depth * 4,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(depth * 4)
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    // Cached tiles scale factors texture (1 row per slot)
    gl.deleteTexture(this.cachedTilesScaleFactorsTexture)
    this.cachedTilesScaleFactorsTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, this.cachedTilesScaleFactorsTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.R32I,
      1,
      depth,
      0,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array(depth)
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.cachedTilesTextureArrayAllocatedDepth = depth

    // Re-upload the resident tiles into the freshly allocated textures.
    for (const [slot, cachedTile] of this.cachedTilesByTextureSlot) {
      this.uploadTileToSlot(cachedTile, slot)
    }
  }

  /**
   * Upload a single tile into its slot: its ImageBitmap into the texture array
   * layer, and its resource origin/size and scale factor into the lookup
   * textures.
   */
  private uploadTileToSlot(cachedTile: CachedTile<ImageBitmap>, slot: number) {
    const gl = this.gl
    // The tile may have been released (its ImageBitmap closed) while briefly
    // still referenced by a slot, just before the next reconcile removes it.
    // In that case there is nothing to upload; the slot is cleaned up then.
    const source = cachedTile.data as ImageBitmap | undefined
    if (!source) {
      return
    }

    const region = cachedTile.fetchableTile.options?.imageRequest?.region
    if (!region) {
      throw new Error('Missing resource origin points and sizes')
    }

    // The texture size is the largest available size in the image's
    // tileZoomLevels (since the image could be served in multiple sizes).
    // The size of the source is determined when fetching tiles and getting the
    // optimal tileZoomLevel based on the scale derived from the viewport.
    // Hence, the source could be smaller then the texture. This is not a
    // problem in se, but sub-optimal if the difference is large. (Also note
    // that if the resource is only on part of the image, the source is still
    // its the full size.)
    if (source.width > this.tileSize[0] || source.height > this.tileSize[1]) {
      throw new Error("Cached tile doesn't fit in texture")
    }

    // Cached tiles texture array
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4)
    // Ensure no PIXEL_UNPACK_BUFFER is bound so the DOM-source texSubImage3D
    // overload is used (uploading directly from the ImageBitmap).
    gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, null)
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.cachedTilesTextureArray)
    gl.texSubImage3D(
      gl.TEXTURE_2D_ARRAY,
      0,
      0,
      0,
      slot,
      source.width,
      source.height,
      1,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      source
    )

    // Cached tiles resource origin points and sizes texture (4 rows per slot)
    gl.bindTexture(
      gl.TEXTURE_2D,
      this.cachedTilesResourceOriginPointsAndSizesTexture
    )
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      slot * 4,
      1,
      4,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array([region.x, region.y, region.width, region.height])
    )

    // Cached tiles scale factors texture (1 row per slot)
    gl.bindTexture(gl.TEXTURE_2D, this.cachedTilesScaleFactorsTexture)
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      slot,
      1,
      1,
      gl.RED_INTEGER,
      gl.INT,
      new Int32Array([cachedTile.fetchableTile.tile.tileZoomLevel.scaleFactor])
    )
  }

  private updateCachedTilesForTextures() {
    // Select tiles form tileCache that should be included in the texture
    const cachedTiles = []
    const cachedTilesAtOtherScaleFactors = []
    const overviewCachedTiles = []
    const spriteCachedTiles = []

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

    // Include tiles from sprites
    spriteCachedTiles.push(
      ...Array.from(this.cachedTilesByTileUrl.values()).filter((cachedTile) =>
        cachedTile.isTileFromSprites()
      )
    )

    // Try to include tiles that are at overview zoomlevel
    for (const fetchableTile of this.overviewFetchableTilesForViewport) {
      const cachedTile = this.cachedTilesByTileUrl.get(fetchableTile.tileUrl)
      if (cachedTile) {
        // If they are available, consider to include them,
        // if this map's cached tiles don't already cover the entire zoomlevel
        const tileZoomLevelTilesCount = this.tileZoomLevelForViewport
          ? this.tileZoomLevelForViewport.rows *
            this.tileZoomLevelForViewport.columns
          : undefined
        if (
          cachedTiles.length === 0 ||
          (tileZoomLevelTilesCount &&
            cachedTiles.length < tileZoomLevelTilesCount)
        ) {
          overviewCachedTiles.push(cachedTile)
        }
      }
    }

    const cachedTilesForTextures = [
      ...cachedTiles,
      ...cachedTilesAtOtherScaleFactors,
      ...spriteCachedTiles,
      ...overviewCachedTiles
    ]

    // Making tiles unique by tileUrl
    const cachedTilesForTextureByTileUrl: Map<
      string,
      CachedTile<ImageBitmap>
    > = new Map()
    cachedTilesForTextures.forEach((cachedTile) =>
      cachedTilesForTextureByTileUrl.set(
        cachedTile.fetchableTile.tileUrl,
        cachedTile
      )
    )

    this.previousCachedTilesForTextureByTileUrl =
      this.cachedTilesForTextureByTileUrl
    this.cachedTilesForTextureByTileUrl = cachedTilesForTextureByTileUrl
  }

  private getCachedTilesAtOtherScaleFactors(
    tile: Tile
  ): CachedTile<ImageBitmap>[] {
    if (this.cachedTilesByTileUrl.size === 0) {
      return []
    }
    if (!this.tileZoomLevelForViewport) {
      return []
    }

    const cachedTiles = []
    for (tile of getTilesAtOtherScaleFactors(
      tile,
      this.image,
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
  private tileToCachedTile(tile: Tile): CachedTile<ImageBitmap> | undefined {
    return this.cachedTilesByTileKey.get(tileKey(tile))
  }

  private tileInCachedTiles(tile: Tile): boolean {
    return this.cachedTilesByTileKey.has(tileKey(tile))
  }
}
