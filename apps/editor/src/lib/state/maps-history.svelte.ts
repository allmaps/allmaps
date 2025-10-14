import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import type { SourceState } from '$lib/state/source.svelte'

import type { DbMap3 } from '$lib/types/maps.js'

const MAPS_HISTORY_KEY = Symbol('maps-history')

export class MapsHistoryState {
  #lastSourceUrl: string | undefined

  // TODO: also keep transformer for each map!
  // Or, use WarpedMap class
  #mapsByImageId: SvelteMap<string, DbMap3[]> = $state(new SvelteMap())

  constructor(sourceState: SourceState) {
    $effect(() => {
      if (this.#lastSourceUrl !== sourceState.source?.url) {
        this.#mapsByImageId.clear()
      }

      this.#lastSourceUrl = sourceState.source?.url
    })
  }

  saveMapsForImageId(imageId: string, maps: DbMap3[]) {
    this.#mapsByImageId.set(imageId, maps)
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }
}

export function setMapsHistoryState(sourceState: SourceState) {
  return setContext(MAPS_HISTORY_KEY, new MapsHistoryState(sourceState))
}

export function getMapsHistoryState() {
  const mapsHistoryState =
    getContext<ReturnType<typeof setMapsHistoryState>>(MAPS_HISTORY_KEY)

  if (!mapsHistoryState) {
    throw new Error('MapsHistoryState is not set')
  }

  return mapsHistoryState
}
