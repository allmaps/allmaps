import type { GeoreferencedMap } from '@allmaps/annotation'

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
