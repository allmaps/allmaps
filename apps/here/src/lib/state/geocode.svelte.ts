import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { reverseGeocodeLocality } from '$lib/shared/geocode.js'

import type { Point } from '@allmaps/types'

const GEOCODE_KEY = Symbol('geocode')

export class GeocodeState {
  #geocodeEarthKey: string

  #localityByLatLon = $state<SvelteMap<string, string | undefined>>(
    new SvelteMap()
  )

  constructor(geocodeEarthKey: string) {
    this.#geocodeEarthKey = geocodeEarthKey
  }

  #getKeyFromPoint(point: Point) {
    return `${point[0]},${point[1]}`
  }

  async fetchReverseGeocode(point: Point) {
    const key = this.#getKeyFromPoint(point)

    if (this.#localityByLatLon.has(key)) {
      return
    }

    const locality = await reverseGeocodeLocality(point, this.#geocodeEarthKey)
    this.#localityByLatLon.set(key, locality)
  }

  getReverseGeocode(point?: Point) {
    if (!point) {
      return
    }

    return this.#localityByLatLon.get(this.#getKeyFromPoint(point))
  }
}

export function setGeocodeState(geocodeEarthKey: string) {
  return setContext(GEOCODE_KEY, new GeocodeState(geocodeEarthKey))
}

export function getGeocodeState() {
  const geocodeState =
    getContext<ReturnType<typeof setGeocodeState>>(GEOCODE_KEY)

  if (!geocodeState) {
    throw new Error('GeocodeState is not set')
  }

  return geocodeState
}
