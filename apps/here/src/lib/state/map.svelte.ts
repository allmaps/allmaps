import { setContext, getContext } from 'svelte'

import type { GeoreferencedMap } from '@allmaps/annotation'

const MAP_KEY = Symbol('map')

export class MapState {
  #map = $state.raw<GeoreferencedMap>()

  constructor(map?: GeoreferencedMap) {
    this.#map = map
  }

  set map(map: GeoreferencedMap | undefined) {
    this.#map = map
  }

  get map() {
    return this.#map
  }
}

export function setMapState(map?: GeoreferencedMap) {
  return setContext(MAP_KEY, new MapState(map))
}

export function getMapState() {
  const mapState = getContext<ReturnType<typeof setMapState>>(MAP_KEY)

  if (!mapState) {
    throw new Error('MapState is not set')
  }

  return mapState
}
