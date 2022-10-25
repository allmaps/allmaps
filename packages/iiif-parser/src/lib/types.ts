import { z } from 'zod'
import { TilesetSchema } from '../schemas/shared.js'

export type Tileset = z.infer<typeof TilesetSchema>

export type Fit = 'cover' | 'contain'

export interface Region {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface ImageRequest {
  region?: Region
  size?: Size
}

export type MajorVersion = 2 | 3

export interface TileZoomLevel {
  scaleFactor: number
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  columns: number
  rows: number
}

export interface ProfileProperties {
  supportsAnyRegionAndSize: boolean
  maxWidth?: number
  maxHeight?: number
  maxArea?: number
}

export interface LanguageString {
  [language: string]: string[]
}

export interface MetadataItem {
  label: LanguageString
  value: LanguageString
}

export type Metadata = MetadataItem[]

export type FetchFunction = (url: string) => Promise<any>

export interface FetchNextOptions {
  maxDepth?: number
  fetchManifests?: boolean
  fetchImages?: boolean
}

export interface FetchNextResults<Item> {
  item: Item
  depth: number
  parent: {
    uri: string
    type: string
  }
}
