import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { toGeoreferencedMap } from '$lib/shared/maps.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { SourceState } from '$lib/state/source.svelte'
import type { MapsState } from '$lib/state/maps.svelte'

const MAPS_HISTORY_KEY = Symbol('maps-history')

export class MapsHistoryState {
  #lastSourceUrl: string | undefined

  #mapsByImageId: SvelteMap<string, GeoreferencedMap[]> = $state(
    new SvelteMap()
  )

  constructor(sourceState: SourceState, mapsState: MapsState) {
    $effect(() => {
      if (this.#lastSourceUrl !== sourceState.source?.url) {
        this.#mapsByImageId.clear()
      }

      this.#lastSourceUrl = sourceState.source?.url
    })

    $effect(() => {
      if (mapsState.connectedImageId && mapsState.maps) {
        const maps = Object.values(mapsState.maps).map(toGeoreferencedMap)
        this.#mapsByImageId.set(mapsState.connectedImageId, maps)
      }
    })
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }
}

export function setMapsHistoryState(
  sourceState: SourceState,
  mapsState: MapsState
) {
  return setContext(
    MAPS_HISTORY_KEY,
    new MapsHistoryState(sourceState, mapsState)
  )
}

export function getMapsHistoryState() {
  const mapsHistoryState =
    getContext<ReturnType<typeof setMapsHistoryState>>(MAPS_HISTORY_KEY)

  if (!mapsHistoryState) {
    throw new Error('MapsHistoryState is not set')
  }

  return mapsHistoryState
}
