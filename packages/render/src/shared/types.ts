import type { Color } from '@allmaps/types'

export type RemoveBackgroundOptions = Partial<{
  color: Color
  threshold: number
  hardness: number
}>

export type ColorizeOptions = Partial<{
  color: Color
}>

export type RenderOptions = Partial<{
  removeBackground?: RemoveBackgroundOptions
  colorize?: ColorizeOptions
}>
