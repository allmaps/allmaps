import { GeoreferencedMap } from '@allmaps/annotation'

import type { FetchableTile } from '../tilecache/FetchableTile.js'
import type { CacheableTile } from '../tilecache/CacheableTile.js'

import type {
  Point,
  Line,
  Size,
  FetchFn,
  ImageInformations,
  Color,
  Bbox,
  TileZoomLevel
} from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'
import type { Projection } from '@allmaps/project'

export type SelectionOptions = {
  onlyVisible: boolean
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
  fetchFn: FetchFn
  // TODO: this option needs a better name:
  imageInformations: ImageInformations
  visible: boolean
  applyMask: boolean
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
}
export type TriangulatedWarpedMapOptions = WarpedMapOptions
export type SpecificWebGL2WarpedMapOptions = {
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
  renderMask: boolean
  renderMaskSize?: number
  renderMaskColor?: string
  renderMaskBorderSize?: number
  renderMaskBorderColor?: string
  renderFullMask: boolean
  renderFullMaskSize?: number
  renderFullMaskColor?: string
  renderFullMaskBorderSize?: number
  renderFullMaskBorderColor?: string
}
export type WebGL2WarpedMapOptions = SpecificWebGL2WarpedMapOptions &
  TriangulatedWarpedMapOptions

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

export type WarpedMapListOptions = {
  createRTree: boolean
} & WarpedMapOptions

export type BaseRendererOptions = WarpedMapListOptions & WarpedMapOptions

export type WebGL2RendererOptions = {
  renderMaps: boolean
  renderLines: boolean
  renderPoints: boolean
  debugMaps: boolean
} & WebGL2WarpedMapOptions &
  BaseRendererOptions
export type CanvasRendererOptions = BaseRendererOptions
export type IntArrayRendererOptions = BaseRendererOptions

export type WarpedMapLayerOptions = WebGL2RendererOptions

export type TileCacheOptions = {
  fetchFn: FetchFn
}

export type Renderer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (...params: any[]) => any
}

export type GetImageData<D> = (data: Uint8ClampedArray) => D

export type GetImageDataValue<D> = (data: D, index: number) => number

export type GetImageDataSize<D> = (data: D) => Size

export type RemoveColorOptions = Partial<{
  color: Color
  threshold: number
  hardness: number
}>

export type ColorizeOptions = Partial<{
  color: Color
}>

export type GridOptions = Partial<{
  enabled: boolean
}>

// TODO: don't make partial, extend with other rendering options
export type RenderOptions = Partial<{
  removeColorOptions?: RemoveColorOptions
  colorizeOptions?: ColorizeOptions
  gridOptions?: GridOptions
}>

export type WarpedMapFactory<W> = (
  mapId: string,
  georeferencedMap: GeoreferencedMap,
  options?: Partial<WarpedMapOptions>
) => W

export type CachableTileFactory<D> = (
  fetchableTile: FetchableTile,
  fetchFn?: FetchFn
) => CacheableTile<D>

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
