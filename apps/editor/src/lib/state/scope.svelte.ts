import { setContext, getContext } from 'svelte'

import { generateAnnotation } from '@allmaps/annotation'

import {
  getFullMapId,
  toGeoreferencedMap,
  toGeoreferencedMaps
} from '$lib/shared/maps.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { ProjectionsState } from '@allmaps/components/state'

import type { SourceState } from '$lib/state/source.svelte'
import type { MapsState } from '$lib/state/maps.svelte'
import type { MapsMergedState } from '$lib/state/maps-merged.svelte'

import type { Scope } from '$lib/types/shared.js'

const SCOPE_KEY = Symbol('scope')

export class ScopeState {
  #sourceState: SourceState
  #mapsState: MapsState
  #mapsMergedState: MapsMergedState
  #projectionsState: ProjectionsState

  #scope = $state<Scope>('image')

  #hasMapScope
  #hasImageScope = $state(true)
  #hasImagesScope
  #scopes

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

  #maps = $derived.by<GeoreferencedMap[]>(() => {
    if (this.#scope === 'images') {
      return this.#mapsMergedState.maps
    } else if (this.#scope === 'image') {
      if (this.#mapsState.maps) {
        return toGeoreferencedMaps(
          this.#mapsState.maps,
          this.#projectionsState.projectionsById
        )
      }
    } else if (this.#scope === 'map') {
      const map = this.#mapsState.activeMap
      if (map) {
        return [toGeoreferencedMap(map, this.#projectionsState.projectionsById)]
      }
    }

    return []
  })

  #mapIds = $derived.by<string[]>(() => {
    if (this.#scope === 'images') {
      return this.#mapsMergedState.maps.flatMap((map) => (map.id ? map.id : []))
    } else if (this.#scope === 'image') {
      if (this.#mapsState.maps) {
        return Object.values(this.#mapsState.maps).map((map) =>
          getFullMapId(map.id)
        )
      }
    } else if (this.#scope === 'map') {
      const map = this.#mapsState.activeMap
      if (map) {
        return [getFullMapId(map.id)]
      }
    }

    return []
  })

  #annotation = $derived(generateAnnotation(this.#maps))

  constructor(
    sourceState: SourceState,
    mapsState: MapsState,
    mapsMergedState: MapsMergedState,
    projectionsState: ProjectionsState
  ) {
    this.#sourceState = sourceState
    this.#mapsState = mapsState
    this.#mapsMergedState = mapsMergedState
    this.#projectionsState = projectionsState

    this.#hasImagesScope = $derived(this.#sourceState.imageCount > 1)
    this.#hasMapScope = $derived(this.#mapsState.mapsCountForActiveImage > 0)

    this.#scopes = $derived<Scope[]>(
      [
        this.#hasImagesScope ? ('images' as const) : undefined,
        this.#hasImageScope ? ('image' as const) : undefined,
        this.#hasMapScope ? ('map' as const) : undefined
      ].flatMap((scope) => scope ?? [])
    )
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

  get scopes() {
    return this.#scopes
  }

  get maps() {
    return this.#maps
  }

  get mapIds() {
    return this.#mapIds
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
  mapsMergedState: MapsMergedState,
  projectionsState: ProjectionsState
) {
  return setContext(
    SCOPE_KEY,
    new ScopeState(sourceState, mapsState, mapsMergedState, projectionsState)
  )
}

export function getScopeState() {
  const scopeState = getContext<ReturnType<typeof setScopeState>>(SCOPE_KEY)

  if (!scopeState) {
    throw new Error('ScopeState is not set')
  }

  return scopeState
}
