import { setContext, getContext } from 'svelte'

import type { SourceState } from '$lib/state/source.svelte'
import type { MapsState } from '$lib/state/maps.svelte'
import type { MapsMergedState } from '$lib/state/maps-merged.svelte'

import type { Scope } from '$lib/types/shared.js'

const SCOPE_KEY = Symbol('scope')

export class ScopeState {
  #mapsState: MapsState
  #mapsMergedState: MapsMergedState

  #scope = $state<Scope>('image')

  #hasImagesScope = $state<boolean>(true)

  constructor(
    sourceState: SourceState,
    mapsState: MapsState,
    mapsMergedState: MapsMergedState
  ) {
    this.#mapsState = mapsState
    this.#mapsMergedState = mapsMergedState

    $effect(() => {
      if (sourceState.source) {
        if (sourceState.source.type === 'image') {
          this.#hasImagesScope = false
        } else {
          this.#hasImagesScope = true
        }
      }
    })
  }

  get hasImagesScope() {
    return this.#hasImagesScope
  }

  set scope(scope: Scope) {
    this.#scope = scope
  }

  get scope() {
    return this.#scope
  }

  get mapsCountForScope(): number {
    if (this.#scope === 'images') {
      return this.#mapsMergedState.maps.length
    } else if (this.#scope === 'image') {
      if (this.#mapsState.maps) {
        return Object.values(this.#mapsState.maps).length
      }
    } else if (this.#scope === 'map') {
      if (this.#mapsState.activeMap) {
        return 1
      }
    }

    return 0
  }
}

export function setScopeState(
  sourceState: SourceState,
  mapsState: MapsState,
  mapsMergedState: MapsMergedState
) {
  return setContext(
    SCOPE_KEY,
    new ScopeState(sourceState, mapsState, mapsMergedState)
  )
}

export function getScopeState() {
  const scopeState = getContext<ReturnType<typeof setScopeState>>(SCOPE_KEY)

  if (!scopeState) {
    throw new Error('ScopeState is not set')
  }

  return scopeState
}
