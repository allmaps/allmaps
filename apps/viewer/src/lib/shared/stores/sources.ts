import { writable, derived, get } from 'svelte/store'

import { generateId } from '@allmaps/id/browser'
import { fetchJson, fetchAnnotationsFromApi } from '@allmaps/stdlib'

import {
  addAnnotation,
  removeAnnotation,
  resetMaps
} from '$lib/shared/stores/maps.js'
import { warpedMapSource } from '$lib/shared/stores/openlayers.js'

import { parseJson } from '$lib/shared/parser.js'

import type {
  Source,
  UrlSourceOptions,
  StringSourceOptions
} from '$lib/shared/types.js'

type Sources = Map<string, Source>

const sourcesStore = writable<Sources>(new Map())

export const sourceLoading = writable<boolean>(false)

async function addSource(
  id: string,
  json: unknown,
  options: UrlSourceOptions | StringSourceOptions
) {
  sourceLoading.set(true)

  let annotations: unknown[] = []

  const parsed = await parseJson(json)
  if (parsed.type === 'annotation') {
    // Annotation is already parsed in parseJson function
    // TODO: find a way to parse data only once
    annotations = [json]
  } else {
    if (parsed.iiif.type === 'collection') {
      for await (const next of parsed.iiif.fetchNext(fetchJson, {
        fetchManifests: true,
        fetchImages: false
      })) {
        console.log(next)
      }
    }

    annotations = await fetchAnnotationsFromApi(parsed.iiif)
  }

  sourcesStore.update((sources) => {
    const source: Source = {
      id,
      json,
      parsed,
      annotations,
      ...options
    }

    sources.set(id, source)
    return sources
  })

  let mapIds = []
  const $warpedMapSource = get(warpedMapSource)
  for (let annotation of annotations) {
    mapIds.push(...(await addAnnotation(id, annotation)))
    await $warpedMapSource.addGeoreferenceAnnotation(annotation)
  }

  sourceLoading.set(false)

  return mapIds
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
    const source = sources.get(id)
    if (source) {
      const $warpedMapSource = get(warpedMapSource)
      for (let annotation of source.annotations) {
        $warpedMapSource.removeGeoreferenceAnnotation(annotation)
      }
    }

    sources.delete(id)
    return sources
  })

  removeAnnotation(id)
}

export function resetSources() {
  const $warpedMapSource = get(warpedMapSource)
  $warpedMapSource.clear()

  sourcesStore.set(new Map())
  resetMaps()
}

export const sourceIds = derived(sourcesStore, ($sources) => $sources.keys())

export const sourcesCount = derived(sourcesStore, ($sources) => $sources.size)

export const sourcesById = { subscribe: sourcesStore.subscribe }

export const sources = derived(sourcesStore, ($sources) => $sources.values())

export const firstSource = derived(sources, ($sources) => [...$sources][0])
