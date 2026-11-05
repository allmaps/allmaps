import type { WarpedMapLayer } from '@allmaps/maplibre'
import type { shades } from '@allmaps/tailwind'

export type NarrationColor =
  | keyof typeof shades
  | `${keyof typeof shades}-${100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900}`
  | 'black'
  | 'white'

export type NarrationConfig = {
  basemapStyleUrl: string
  backgroundColor?: NarrationColor
  interactive?: boolean
}

export type NarrationMap = {
  url: string
  options?: Parameters<WarpedMapLayer['setMapOptions']>[1]
}

export type NarrationSlide = {
  title: string
  /** Trusted, author-written HTML. Plain text is also supported. */
  description: string
  links?: { label: string; href: string }[]
  attributions?: { label: string; href: string }[]
  warpedMaps: NarrationMap[]
  /** Show a slider that adjusts the opacity of this slide's warped maps. */
  showOpacitySlider?: boolean
  hideBasemap?: boolean
  useBearing?: boolean
  zoomOffset?: number
  location?: {
    center: [number, number]
    zoom: number
    bearing?: number
  }
}
