import { GeoreferencedMap } from '@allmaps/annotation'
import type {
  Point,
  Line,
  Size,
  FetchFn,
  ImageInfoByMapId,
  Color,
  Bbox,
  TileZoomLevel,
  Ring,
  Gcp
} from '@allmaps/types'
import type { DistortionMeasure, TransformationType } from '@allmaps/transform'
import type { Projection } from '@allmaps/project'

import type { FetchableTile } from '../tilecache/FetchableTile.js'
import type { CacheableTile } from '../tilecache/CacheableTile.js'
import type { WarpedMap } from '../maps/WarpedMap.js'
import type { WebGL2WarpedMap } from '../webgl2.js'
import type { TriangulatedWarpedMap } from '../maps/TriangulatedWarpedMap.js'

export type SelectionOptions = {
  onlyVisible?: boolean
  mapIds?: Iterable<string>
  geoBbox?: Bbox
}

export type ProjectionOptions = {
  projection: Projection
}

export type TransformationOptions = {
  type: TransformationType
  options?: unknown
}

export type WarpedMapOptions = {
  fetchFn?: FetchFn
  imageInfoByMapId?: ImageInfoByMapId
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure?: DistortionMeasure
}
export type SpecificTriangulatedWarpedMapOptions = {
  resourceResolution?: number
  distortionMeasures: DistortionMeasure[]
}
export type TriangulatedWarpedMapOptions =
  SpecificTriangulatedWarpedMapOptions & WarpedMapOptions
export type SpecificWebGL2WarpedMapOptions = {
  renderMaps?: boolean
  renderLines?: boolean
  renderPoints?: boolean
  renderGcps: boolean
  renderGcpsSize?: number
  renderGcpsColor?: string
  renderGcpsBorderSize?: number
  renderGcpsBorderColor?: string
  renderTransformedGcps: boolean
  renderTransformedGcpsSize?: number
  renderTransformedGcpsColor?: string
  renderTransformedGcpsBorderSize?: number
  renderTransformedGcpsBorderColor?: string
  renderVectors: boolean
  renderVectorsSize?: number
  renderVectorsColor?: string
  renderVectorsBorderSize?: number
  renderVectorsBorderColor?: string
  renderFullMask: boolean
  renderFullMaskSize?: number
  renderFullMaskColor?: string
  renderFullMaskBorderSize?: number
  renderFullMaskBorderColor?: string
  renderClipMask: boolean
  renderClipMaskSize?: number
  renderClipMaskColor?: string
  renderClipMaskBorderSize?: number
  renderClipMaskBorderColor?: string
  renderMask: boolean
  renderMaskSize?: number
  renderMaskColor?: string
  renderMaskBorderSize?: number
  renderMaskBorderColor?: string
  opacity: number
  saturation: number
  removeColor: boolean
  removeColorColor: Color
  removeColorThreshold: number
  removeColorHardness: number
  colorize: boolean
  colorizeColor: Color
  distortionColor00: string
  distortionColor01: string
  distortionColor1: string
  distortionColor2: string
  distortionColor3: string
  grid: boolean
  gridColor: string
  debugTriangles: false
  debugTriangulation: false
  debugTiles: false
}
export type WebGL2WarpedMapOptions = SpecificWebGL2WarpedMapOptions &
  TriangulatedWarpedMapOptions

export type GetWarpedMapOptions<W extends WarpedMap> = W extends WebGL2WarpedMap
  ? WebGL2WarpedMapOptions
  : W extends TriangulatedWarpedMap
    ? TriangulatedWarpedMapOptions
    : W extends WarpedMap
      ? WarpedMapOptions
      : never

export type SpecificWarpedMapListOptions = {
  createRTree: boolean
  rtreeUpdatedOptions: string[]
  animatedOptions: string[]
}
export type WarpedMapListOptions<WO extends WarpedMapOptions> =
  SpecificWarpedMapListOptions & Partial<WO>

export type BaseRenderOptions = {}
export type SpecificWebGL2RenderOptions = {}
export type WebGL2RenderOptions = SpecificWebGL2RenderOptions &
  BaseRenderOptions &
  WarpedMapListOptions<WebGL2WarpedMapOptions>
export type CanvasRenderOptions<WO extends WarpedMapOptions> =
  BaseRenderOptions & WarpedMapListOptions<WO>
export type IntArrayRenderOptions<WO extends WarpedMapOptions> =
  BaseRenderOptions & WarpedMapListOptions<WO>

export type WarpedMapLayerOptions = WebGL2RenderOptions

export type TileCacheOptions = {
  fetchFn: FetchFn
}

// The options when setting options
export type SetOptionsOptions = {
  omit: string[]
  init: boolean
  animate: boolean
}

export type Renderer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (...params: any[]) => any
}

export type GetImageData<D> = (data: Uint8ClampedArray) => D

export type GetImageDataValue<D> = (data: D, index: number) => number

export type GetImageDataSize<D> = (data: D) => Size

export type WarpedMapFactory<W> = (
  mapId: string,
  georeferencedMap: GeoreferencedMap,
  options?: Partial<WarpedMapOptions>
) => W

export type CachableTileFactory<D> = (
  fetchableTile: FetchableTile,
  fetchFn?: FetchFn
) => CacheableTile<D>

export type RenderLineLayerOptions = {
  viewportSize: number
  color: string
  viewportBorderSize: number
  borderColor: string
}

export type RenderPointLayerOptions = {
  viewportSize: number
  color: string
  viewportBorderSize: number
  borderColor: string
}

export type LineLayer = {
  projectedGeoLines: Line[]
  projectedGeoPreviousLines?: Line[]
} & Partial<RenderLineLayerOptions>

export type PointLayer = {
  projectedGeoPoints: Point[]
  projectedGeoPreviousPoints?: Point[]
} & Partial<RenderPointLayerOptions>

export type MapPruneInfo = {
  tileZoomLevelForViewport?: TileZoomLevel
  overviewTileZoomLevelForViewport?: TileZoomLevel
  resourceViewportRingBboxForViewport?: Bbox
}

export type MapPruneConstants = {
  maxHigherLog2ScaleFactorDiff: number
  maxLowerLog2ScaleFactorDiff: number
}
