import type { GeoreferencedMap } from '@allmaps/annotation'
import type { GeojsonLineString, GeojsonFeature } from '@allmaps/types'

export type CompassMode = 'image' | 'north' | 'follow-orientation' | 'custom'

export type Orientation = {
  alpha: number | null
  beta: number | null
  gamma: number | null
  absolute: boolean
}

export type MapWithImageInfo = {
  mapId: string
  map: GeoreferencedMap
  imageInfo: unknown
}

export type FetchedImageInfo =
  | {
      state: 'fetching'
    }
  | {
      state: 'error'
      error: Error
    }
  | {
      state: 'success'
      imageInfo: unknown
    }

export type ParamKey = 'geojson' | 'color' | 'from'

export type Params = { [key in ParamKey]?: string | null }

export type GeojsonRoute = {
  url: string
  error?: string
  route?: GeojsonLineString
  markers: GeojsonFeature[]
}

export type PopoverContents = {
  title?: string
  image?: string
  url?: string
  description?: string
}
