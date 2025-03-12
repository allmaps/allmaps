import { setContext, getContext } from 'svelte'

import { validateGeoreferencedMap } from '@allmaps/annotation'

import { fetchMaps, checkSource, createSource } from '$lib/shared/api.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { GeoreferencedMapsByImageId, Source } from '$lib/types/shared.js'
import type { SourceState } from '$lib/state/source.svelte.js'

const API_KEY = Symbol('api')

export class ApiState {
  #lastSourceUrl: string | undefined

  #maps: GeoreferencedMap[] = $state([])

  #fetched = $state(false)

  #mapsByImageId = $derived.by(() => {
    const mapsByImageId: GeoreferencedMapsByImageId = {}

    this.#maps.forEach((map) => {
      if (!mapsByImageId[map.resource.id]) {
        mapsByImageId[map.resource.id] = []
      }

      mapsByImageId[map.resource.id].push(map)
    })

    return mapsByImageId
  })

  constructor(sourceState: SourceState) {
    $effect(() => {
      if (
        sourceState.source &&
        this.#lastSourceUrl !== sourceState.source?.url
      ) {
        this.#fetchMapsOrCreateSource(sourceState.source)
      }

      this.#lastSourceUrl = sourceState.source?.url
    })
  }

  async #fetchMapsOrCreateSource(source: Source) {
    try {
      this.#maps = await this.#fetchMaps(source)
    } catch {
      this.#maps = []

      this.#createSource(source)
    } finally {
      this.#fetched = true
    }
  }

  async #createSource(source: Source) {
    try {
      await checkSource(source)
    } catch {
      // If fetch fails, resource does not exist in Allmaps API
      // PUT source to API to create resource
      try {
        await createSource(source)
      } catch {
        console.error('Error creating source in Allmaps API:', source.url)
      }
    }
  }

  async #fetchMaps(source: Source) {
    const fetchedMaps = await fetchMaps(source)
    const mapOrMaps = validateGeoreferencedMap(fetchedMaps)

    if (Array.isArray(mapOrMaps)) {
      return mapOrMaps
    } else {
      return [mapOrMaps]
    }
  }

  get maps() {
    return this.#maps
  }

  get mapsByImageId() {
    return this.#mapsByImageId
  }

  get fetched() {
    return this.#fetched
  }
}

export function setApiState(sourceState: SourceState) {
  return setContext(API_KEY, new ApiState(sourceState))
}

export function getApiState() {
  const apiState = getContext<ReturnType<typeof setApiState>>(API_KEY)

  if (!apiState) {
    throw new Error('ApiState is not set')
  }

  return apiState
}
