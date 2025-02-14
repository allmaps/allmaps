import { setContext, getContext } from 'svelte'

import { generateAnnotation } from '@allmaps/annotation'

import { toGeoreferencedMap, toGeoreferencedMaps } from '$lib/shared/maps.js'

import type { SourceState } from '$lib/state/source.svelte'
import type { MapsState } from '$lib/state/maps.svelte'
import type { MapsMergedState } from '$lib/state/maps-merged.svelte'

import type { Scope } from '$lib/types/shared.js'

const SCOPE_KEY = Symbol('scope')

export class ScopeState {
  #sourceState: SourceState
  #mapsState: MapsState
  #mapsMergedState: MapsMergedState

  #scope = $state<Scope>('image')

  #hasImagesScope = $state<boolean>(true)

  #allmapsId = $derived.by(() => {
    if (this.#scope === 'images' && this.#sourceState.source) {
      // TODO: Collections are not stored in database!
      return `${this.#sourceState.source?.type}s/${this.#sourceState.source?.allmapsId}`
    } else if (
      this.#scope === 'image' &&
      this.#sourceState.activeImageAllmapsId
    ) {
      return `images/${this.#sourceState.activeImageAllmapsId}`
    } else if (this.#scope === 'map' && this.#mapsState.activeMapId) {
      return `maps/${this.#mapsState.activeMapId}`
    }
  })

  #annotation = $derived.by(() => {
    if (this.#scope === 'images') {
      return generateAnnotation(this.#mapsMergedState.maps)
    } else if (this.#scope === 'image') {
      if (this.#mapsState.maps) {
        return generateAnnotation(toGeoreferencedMaps(this.#mapsState.maps))
      }
    } else if (this.#scope === 'map') {
      const map = this.#mapsState.activeMap
      if (map) {
        return generateAnnotation(toGeoreferencedMap(map))
      }
    }

    return generateAnnotation([])
  })

  constructor(
    sourceState: SourceState,
    mapsState: MapsState,
    mapsMergedState: MapsMergedState
  ) {
    this.#sourceState = sourceState
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

  get annotation() {
    return this.#annotation
  }

  get allmapsId() {
    return this.#allmapsId
  }

  get mapsCount(): number {
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
