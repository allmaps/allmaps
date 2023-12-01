import type { Color } from '@allmaps/types'

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
