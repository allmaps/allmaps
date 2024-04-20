import type { Image, Manifest, Collection } from '@allmaps/iiif-parser'
import type { Map, Annotation, AnnotationPage } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'

import type { FeatureLike } from 'ol/Feature.js'

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
  json: unknown
  parsed: ParsedSource
  // error?: Error
  annotations: unknown[]
}

export type ParsedSource =
  | {
      type: 'annotation'
      maps: Map[]
    }
  | {
      type: 'iiif'
      iiif: Image | Manifest | Collection
    }

export type ViewerMap = {
  sourceId: string

  mapId: string
  error?: Error

  map: Map
  index: number

  annotation: Annotation | AnnotationPage

  opacity: number
  renderOptions: RenderOptions
  state: MapState
}

export type MapIDOrError = string | Error

export type MapState = {
  visible: boolean
  selected: boolean
  highlighted: boolean
  customResourceMask?: Point[]
}

export type RemoveBackgroundOptions = {
  color: string | null
  threshold: number
  hardness: number
}

export type ColorizeOptions = {
  enabled: boolean
  color: string | null
}

export type GridOptions = {
  enabled: boolean
}

export type RenderOptions = {
  removeBackground: RemoveBackgroundOptions
  colorize: ColorizeOptions
  grid: GridOptions
}

export type FeatureContextMenu = {
  event: MouseEvent
  feature: FeatureLike
}
