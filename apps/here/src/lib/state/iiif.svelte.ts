import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { Manifest } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'

import { findManifests } from '$lib/shared/iiif.js'

import type { MapState } from '$lib/state/map.svelte.js'

const IIIF_KEY = Symbol('iiif')

export class IiifState {
  #mapState: MapState

  #manifestItems = $derived.by(() => {
    if (this.#mapState && this.#mapState.map) {
      return findManifests(this.#mapState.map.resource.partOf)
    }

    return []
  })

  #manifestIds = $derived(this.#manifestItems.map((item) => item.id))

  #parsedManifests = $state<SvelteMap<string, Manifest>>(new SvelteMap())

  constructor(mapState: MapState) {
    this.#mapState = mapState
  }

  async fetchParsedManifest(manifestId: string) {
    if (this.#parsedManifests.has(manifestId)) {
      return this.#parsedManifests.get(manifestId)
    }

    const manifest = await fetchJson(manifestId)
    const parsedManifest = Manifest.parse(manifest)

    this.#parsedManifests.set(manifestId, parsedManifest)

    return parsedManifest
  }

  // set map(map: GeoreferencedMap | undefined) {
  //   this.#map = map
  //   this.#parsedManifests = new SvelteMap()
  // }

  get manifestIds() {
    return this.#manifestIds
  }
}

export function setIiifState(mapState: MapState) {
  return setContext(IIIF_KEY, new IiifState(mapState))
}

export function getIiifState() {
  const iiifState = getContext<ReturnType<typeof setIiifState>>(IIIF_KEY)

  if (!iiifState) {
    throw new Error('IiifState is not set')
  }

  return iiifState
}
