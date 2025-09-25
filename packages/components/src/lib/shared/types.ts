import type { Component } from 'svelte'

import { mapMonsterColors, mapMonsterMoods } from '$lib/shared/constants.js'

export type MapMonsterColor = (typeof mapMonsterColors)[number]
export type MapMonsterMood = (typeof mapMonsterMoods)[number]

export type SelectBaseItem = {
  value: string
  label: string
  Icon?: Component
  disabled?: boolean
}

export type ComboboxBaseItem = {
  value: string
  label: string
  Icon?: Component
  disabled?: boolean
}
