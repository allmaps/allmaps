import { z } from 'zod'
import { TilesetSchema } from '../schemas/shared.js'

export type Tileset = z.infer<typeof TilesetSchema>

export type Fit = 'cover' | 'contain'

export type Region = {
  x: number
  y: number
  width: number
  height: number
}

export type Size = {
  width: number
  height: number
}

export type ImageRequest = {
  region?: Region
  size?: Size
}

export type MajorVersion = 1 | 2 | 3

export type TileZoomLevel = {
  scaleFactor: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  columns: number
  rows: number
}

export type ProfileProperties = {
  supportsAnyRegionAndSize: boolean
  maxWidth?: number
  maxHeight?: number
  maxArea?: number
}

export type LanguageString = {
  [language: string]: string[]
}

export type MetadataItem = {
  label: LanguageString
  value: LanguageString
}

export type Metadata = MetadataItem[]

export type FetchFunction = (url: string) => Promise<unknown>

export type FetchNextOptions = {
  maxDepth?: number
  fetchManifests?: boolean
  fetchImages?: boolean
}

export type FetchNextResults<Item> = {
  item: Item
  depth: number
  parent: {
    uri: string
    type: string
  }
}
