import type { Color } from '@allmaps/types'

import type FetchableMapTile from '../classes/FetchableTile.js'
import type CacheableTile from '../classes/CacheableTile.js'

import type { Size } from '@allmaps/types'

export type Renderer = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (...params: any[]) => any
}

export type GetImageData<T> = (data: Uint8ClampedArray) => T

export type GetImageDataValue<T> = (data: T, index: number) => number

export type GetImageDataSize<T> = (data: T) => Size

export type RemoveColorOptions = Partial<{
  color: Color
  threshold: number
  hardness: number
}>

export type ColorizeOptions = Partial<{
  color: Color
}>

export type RenderOptions = Partial<{
  removeColorOptions?: RemoveColorOptions
  colorizeOptions?: ColorizeOptions
}>

export type CachableTileFactory<T> = (
  fetchableMapTile: FetchableMapTile
) => CacheableTile<T>
