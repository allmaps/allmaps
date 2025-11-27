import { GeoreferencedMap } from '@allmaps/annotation'
import type {
  Point,
  Line,
  Size,
  FetchFn,
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
  geoPoint?: Point
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
  gcps: Gcp[]
  resourceMask: Ring
  transformationType: TransformationType
  internalProjection: Projection
  projection: Projection
  visible: boolean
  applyMask: boolean
  distortionMeasure: DistortionMeasure | undefined
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
  renderGcpsColor?: string
  renderGcpsSize?: number
  renderGcpsBorderColor?: string
  renderGcpsBorderSize?: number
  renderTransformedGcps: boolean
  renderTransformedGcpsColor?: string
  renderTransformedGcpsSize?: number
  renderTransformedGcpsBorderColor?: string
  renderTransformedGcpsBorderSize?: number
  renderVectors: boolean
  renderVectorsColor?: string
  renderVectorsSize?: number
  renderVectorsBorderColor?: string
  renderVectorsBorderSize?: number
  renderFullMask: boolean
  renderFullMaskColor?: string
  renderFullMaskSize?: number
  renderFullMaskBorderColor?: string
  renderFullMaskBorderSize?: number
  renderAppliableMask: boolean
  renderAppliableMaskColor?: string
  renderAppliableMaskSize?: number
  renderAppliableMaskBorderColor?: string
  renderAppliableMaskBorderSize?: number
  renderMask: boolean
  renderMaskColor?: string
  renderMaskSize?: number
  renderMaskBorderColor?: string
  renderMaskBorderSize?: number
  opacity: number
  saturation: number
  removeColor: boolean
  removeColorColor: string
  removeColorThreshold: number
  removeColorHardness: number
  colorize: boolean
  colorizeColor: string
  distortionColor00: string
  distortionColor01: string
  distortionColor1: string
  distortionColor2: string
  distortionColor3: string
  renderGrid: boolean
  renderGridColor: string
  debugTriangles: boolean
  debugTriangulation: boolean
  debugTiles: boolean
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
export type WarpedMapListOptions = SpecificWarpedMapListOptions &
  Partial<WebGL2WarpedMapOptions>

export type SpecificBaseRenderOptions = object
export type BaseRenderOptions = SpecificBaseRenderOptions & WarpedMapListOptions
export type SpecificWebGL2RenderOptions = object
export type WebGL2RenderOptions = SpecificWebGL2RenderOptions &
  BaseRenderOptions
export type CanvasRenderOptions = BaseRenderOptions
export type IntArrayRenderOptions = BaseRenderOptions

export type TileCacheOptions = {
  fetchFn: FetchFn
}

// The options when setting options
export type AnimationOptions = {
  animate: boolean
}
export type AnimationOptionsInternal = {
  optionKeysPossiblyChanged: string[]
  optionKeysToOmit: string[]
  init: boolean
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
  listOptions?: Partial<WarpedMapListOptions>,
  mapOptions?: Partial<WarpedMapOptions>
) => W

export type CachableTileFactory<D> = (
  fetchableTile: FetchableTile,
  fetchFn?: FetchFn
) => CacheableTile<D>

export type RenderLineGroupOptions = {
  viewportSize: number
  color: string
  viewportBorderSize: number
  borderColor: string
}

export type RenderPointGroupOptions = {
  viewportSize: number
  color: string
  viewportBorderSize: number
  borderColor: string
}

export type LineGroup = {
  projectedGeoLines: Line[]
  projectedGeoPreviousLines?: Line[]
} & Partial<RenderLineGroupOptions>

export type PointGroup = {
  projectedGeoPoints: Point[]
  projectedGeoPreviousPoints?: Point[]
} & Partial<RenderPointGroupOptions>

export type MapPruneInfo = {
  tileZoomLevelForViewport?: TileZoomLevel
  overviewTileZoomLevelForViewport?: TileZoomLevel
  resourceViewportRingBboxForViewport?: Bbox
}

export type MapPruneConstants = {
  maxHigherLog2ScaleFactorDiff: number
  maxLowerLog2ScaleFactorDiff: number
}
