import type { Image, Manifest, Collection } from '@allmaps/iiif-parser'
import type { Map, Annotation, AnnotationPage } from '@allmaps/annotation'

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
  parsed: Parsed
  annotations: unknown[]
}

export type Parsed =
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
  map: Map

  index: number
  // order: number
  // path: string

  annotation: Annotation | AnnotationPage

  renderOptions: RenderOptions
  state: MapState
}

export type MapState = {
  visible: boolean
  selected: boolean
  highlighted: boolean
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

export type ShowContextMenu = {
  event: MouseEvent
  feature: FeatureLike
}
