import type{ Map } from '@allmaps/annotation'

export interface UrlSourceOptions {
  sourceType: 'url'
  url: string
}

export interface StringSourceOptions {
  sourceType: 'string'
  string: string
}

export type Source = (UrlSourceOptions | StringSourceOptions) & {
  id: string
  json: any
}

export type SourceMap = {
  sourceId: string
  mapId: string
  map: Map
  order: number
}

export type SelectedMap = {
  mapId: string
  sourceId: string
  // path: string
  selected: boolean
  highlighted: boolean
  order: number
  orderInSelected?: number
}


export type RemoveBackgroundOptions = {
  enabled: boolean
  color: string
  threshold: number
  hardness: number
}

export type ColorizeOptions = {
  enabled: boolean
  color: string
}

export type RenderOptions = {
  opacity: number
  removeBackground: RemoveBackgroundOptions
  colorize: ColorizeOptions
}

