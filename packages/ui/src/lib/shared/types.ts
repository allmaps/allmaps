import type {
  mapMonsterColors,
  mapMonsterMoods
} from '$lib/shared/constants.js'

export type MapMonsterColor = (typeof mapMonsterColors)[number]
export type MapMonsterMood = (typeof mapMonsterMoods)[number]
