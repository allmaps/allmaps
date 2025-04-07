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
  ColorWithTransparancy,
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
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
}

export type WarpedMapListOptions = {
  createRTree: boolean
} & WarpedMapOptions

export type RendererOptions = WarpedMapListOptions & WarpedMapOptions

export type WebGL2RendererOptions = RendererOptions
export type CanvasRendererOptions = RendererOptions
export type IntArrayRendererOptions = RendererOptions

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
  viewportSize?: number
  color?: ColorWithTransparancy
  viewportBorderSize?: number
  borderColor?: ColorWithTransparancy
}

export type PointLayer = {
  projectedGeoPoints: Point[]
  projectedGeoPreviousPoints?: Point[]
  viewportSize?: number
  color?: ColorWithTransparancy
  viewportBorderSize?: number
  borderColor?: ColorWithTransparancy
}

export type MapPruneInfo = {
  tileZoomLevelForViewport?: TileZoomLevel
  overviewTileZoomLevelForViewport?: TileZoomLevel
  resourceViewportRingBboxForViewport?: Bbox
}

export type MapPruneConstants = {
  maxHigherLog2ScaleFactorDiff: number
  maxLowerLog2ScaleFactorDiff: number
}
