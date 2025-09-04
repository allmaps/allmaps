import { z } from 'zod'
import { TilesetSchema } from '../schemas/shared.js'

export type { Fit } from '@allmaps/types'

export type Tileset = z.infer<typeof TilesetSchema>

export type MajorVersion = 1 | 2 | 3

export type ProfileProperties = {
  supportsAnyRegionAndSize: boolean
  maxWidth?: number
  maxHeight?: number
  maxArea?: number
}

export type LanguageString = {
  [language: string]: (string | number | boolean)[]
}

export type MetadataItem = {
  label: LanguageString
  value: LanguageString
}

export type Metadata = MetadataItem[]

export type FetchNextOptions = {
  maxDepth?: number
  fetchCollections?: boolean
  fetchManifests?: boolean
  fetchImages?: boolean
  fetchFn: typeof fetch
}

export type FetchNextResults<Item> = {
  item: Item
  depth: number
  parent: {
    uri: string
    type: string
  }
}

export type NavDate = Date
export type NavPlace = object

export type Summary = LanguageString
export type RequiredStatement = MetadataItem

export type Homepage = {
  id: string
  type?: string
  label?: LanguageString
  format?: string
  language?: string | string[]
}[]

export type Rendering = {
  id: string
  type?: string
  label?: LanguageString
  format?: string
}[]

export type Thumbnail = {
  id: string
  type?: string
  format?: string
  width?: number
  height?: number
}[]

export type SeeAlso = {
  id: string
  type?: string
  format?: string
  profile?: string
}[]

export type Annotations = {
  id: string
  type: 'AnnotationPage'
  // items?: object[]
}[]
