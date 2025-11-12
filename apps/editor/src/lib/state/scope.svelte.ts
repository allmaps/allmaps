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
  #apiBaseUrl: string
  #annotationsApiBaseUrl: string

  #sourceState: SourceState
  #mapsState: MapsState
  #mapsMergedState: MapsMergedState
  #projectionsState: ProjectionsState

  #scope = $state<Scope>('image')

  #hasImageScope = $state(true)
  #hasImagesScope = $derived.by(() => this.#sourceState.imageCount > 1)
  #hasMapScope = $derived.by(() => this.#mapsState.mapsCountForActiveImage > 0)
  #scopes = $derived.by<Scope[]>(() =>
    [
      this.#hasImagesScope ? ('images' as const) : undefined,
      this.#hasImageScope ? ('image' as const) : undefined,
      this.#hasMapScope ? ('map' as const) : undefined
    ].flatMap((scope) => scope ?? [])
  )

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
          this.#apiBaseUrl,
          this.#annotationsApiBaseUrl,
          this.#mapsState.maps,
          this.#projectionsState.projectionsById
        )
      }
    } else if (this.#scope === 'map') {
      const map = this.#mapsState.activeMap
      if (map) {
        return [
          toGeoreferencedMap(
            this.#apiBaseUrl,
            this.#annotationsApiBaseUrl,
            map,
            this.#projectionsState.projectionsById
          )
        ]
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
          getFullMapId(this.#annotationsApiBaseUrl, map.id)
        )
      }
    } else if (this.#scope === 'map') {
      const mapId = this.#mapsState.activeMapId
      if (mapId) {
        return [getFullMapId(this.#annotationsApiBaseUrl, mapId)]
      }
    }

    return []
  })

  // ScopeState keeps its own activeMapId. This is used when viewing maps from other images
  // (i.e. not from the current ShareDB connection) in the Results view
  #activeMapId = $state<string>()

  #annotation = $derived(generateAnnotation(this.#maps))

  constructor(
    apiBaseUrl: string,
    annotationsApiBaseUrl: string,
    sourceState: SourceState,
    mapsState: MapsState,
    mapsMergedState: MapsMergedState,
    projectionsState: ProjectionsState
  ) {
    this.#apiBaseUrl = apiBaseUrl
    this.#annotationsApiBaseUrl = annotationsApiBaseUrl

    this.#sourceState = sourceState
    this.#mapsState = mapsState
    this.#mapsMergedState = mapsMergedState
    this.#projectionsState = projectionsState

    $effect(() => {
      if (this.#mapsState.activeMapId) {
        this.#activeMapId = getFullMapId(
          annotationsApiBaseUrl,
          this.#mapsState.activeMapId
        )
      } else {
        this.#activeMapId = this.#mapIds[0]
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

  get activeMapIndex(): number | undefined {
    const index = this.#mapIds.findIndex((mapId) => mapId === this.#activeMapId)

    if (index !== -1) {
      return index
    }
  }

  get previousMapId() {
    const activeIndex = this.activeMapIndex
    if (activeIndex !== undefined) {
      return this.mapIds[
        (activeIndex - 1 + this.mapIds.length) % this.mapIds.length
      ]
    }
  }

  get nextMapId() {
    const activeIndex = this.activeMapIndex
    if (activeIndex !== undefined) {
      return this.mapIds[
        (activeIndex + 1 + this.mapIds.length) % this.mapIds.length
      ]
    }
  }

  get activeMapId(): string | undefined {
    return this.#activeMapId
  }

  set activeMapId(mapId: string | undefined) {
    if (mapId && this.#mapIds.includes(mapId)) {
      this.#activeMapId = mapId
    }
  }
}

export function setScopeState(
  apiBaseUrl: string,
  annotationsApiBaseUrl: string,
  sourceState: SourceState,
  mapsState: MapsState,
  mapsMergedState: MapsMergedState,
  projectionsState: ProjectionsState
) {
  return setContext(
    SCOPE_KEY,
    new ScopeState(
      apiBaseUrl,
      annotationsApiBaseUrl,
      sourceState,
      mapsState,
      mapsMergedState,
      projectionsState
    )
  )
}

export function getScopeState() {
  const scopeState = getContext<ReturnType<typeof setScopeState>>(SCOPE_KEY)

  if (!scopeState) {
    throw new Error('ScopeState is not set')
  }

  return scopeState
}
