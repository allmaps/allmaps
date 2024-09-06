import { Map as GeoreferencedMap } from '@allmaps/annotation'

import type FetchableTile from '../tilecache/FetchableTile.js'
import type CacheableTile from '../tilecache/CacheableTile.js'

import type {
  Size,
  FetchFn,
  ImageInformations,
  Color,
  Bbox
} from '@allmaps/types'
import type { TransformationType } from '@allmaps/transform'

export type TransformationOptions = {
  type: TransformationType
  options?: unknown
}

export type WarpedMapOptions = {
  fetchFn: FetchFn
  // TODO: this option needs a better name:
  imageInformations: ImageInformations
  visible: boolean
  transformation: TransformationOptions
}

export type WarpedMapListOptions = {
  fetchFn: FetchFn
  createRTree: boolean
  imageInformations: ImageInformations
  transformation: TransformationOptions
}

// TODO: consider to pass these options separately (since most WarpedMapOptions are optional)
export type RendererOptions = WarpedMapListOptions &
  WarpedMapOptions & {
    imageInformations: ImageInformations
    fetchFn: FetchFn
  }

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

export type MapPruneInfo = {
  currentBestScaleFactor: number
  currentResourceViewportRingBbox: Bbox
}

export type MapsPruneInfo = Map<string, MapPruneInfo>
