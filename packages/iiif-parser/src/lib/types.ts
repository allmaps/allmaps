import { z } from 'zod'
import { TilesetSchema } from '../schemas/shared.js'

export type Tileset = z.infer<typeof TilesetSchema>

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

//   "label": {
//     "en": [
//       "Whistler's Mother",
//       "Arrangement in Grey and Black No. 1: The Artist's Mother"
//     ],
//     "fr": [
//       "Arrangement en gris et noir no 1",
//       "Portrait de la mère de l'artiste",
//       "La Mère de Whistler"
//     ],
//     "none": [ "Whistler (1871)" ]
//   }