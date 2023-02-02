import { writable, derived } from 'svelte/store'

import { addAnnotation, removeAnnotation } from '$lib/shared/stores/maps.js'

import { generateId } from '@allmaps/id/browser'

import { fetchJson } from '$lib/shared/fetch.js'

import type {
  Source,
  UrlSourceOptions,
  StringSourceOptions
} from '$lib/shared/types.js'

type Sources = Map<string, Source>

const sourcesStore = writable<Sources>(new Map())

async function addSource(
  id: string,
  json: any,
  options: UrlSourceOptions | StringSourceOptions
) {
  console.log('addsource', id, json, options)
  sourcesStore.update((sources) => {
    const source: Source = {
      id,
      json,
      ...options
    }

    sources.set(id, source)

    return sources
  })

  return await addAnnotation(id, json)
}

export async function addUrlSource(url: string) {
  const json = await fetchJson(url)

  // TODO: or get id field from json?
  const id = await generateId(url)

  return await addSource(id, json, {
    sourceType: 'url',
    url
  })
}

export async function addStringSource(string: string) {
  const json = JSON.parse(string)

  // TODO: or get id field from json?
  const id = await generateId(string)

  return await addSource(id, json, {
    sourceType: 'string',
    string
  })
}

export function removeSource(id: string) {
  sourcesStore.update((sources) => {
    sources.delete(id)
    return sources
  })

  removeAnnotation(id)
}

export function resetSources() {
  console.log('resetSources')
  sourcesStore.set(new Map())
}

export const sourceIds = derived(sourcesStore, (sources) => sources.keys())

export const sourcesById = { subscribe: sourcesStore.subscribe }

export const sources = derived(sourcesStore, (sources) => sources.values())
