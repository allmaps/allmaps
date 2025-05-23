import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { Manifest } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'

import { findManifests } from '$lib/shared/iiif.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

const IIIF_KEY = Symbol('iiif')

export class IiifState {
  #map = $state.raw<GeoreferencedMap>()

  #manifestItems = $derived(
    this.#map ? findManifests(this.#map.resource.partOf) : []
  )
  #manifestIds = $derived(this.#manifestItems.map((item) => item.id))

  #parsedManifests = $state<SvelteMap<string, Manifest>>(new SvelteMap())

  constructor(map?: GeoreferencedMap) {
    this.#map = map
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

  set map(map: GeoreferencedMap | undefined) {
    this.#map = map
    this.#parsedManifests = new SvelteMap()
  }

  get map() {
    return this.#map
  }

  get manifestIds() {
    return this.#manifestIds
  }
}

export function setIiifState(map?: GeoreferencedMap) {
  return setContext(IIIF_KEY, new IiifState(map))
}

export function getUiState() {
  const iiifState = getContext<ReturnType<typeof setIiifState>>(IIIF_KEY)

  if (!iiifState) {
    throw new Error('IiifState is not set')
  }

  return iiifState
}
