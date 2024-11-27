import type {
  mapMonsterColors,
  mapMonsterMoods
} from '$lib/shared/constants.js'

import type { GeojsonPoint } from '@allmaps/types'

export type MapMonsterColor = (typeof mapMonsterColors)[number]
export type MapMonsterMood = (typeof mapMonsterMoods)[number]

export type GeocoderGeoJsonFeature = {
  geometry: GeojsonPoint
  properties: { label: string; alt?: string }
}
