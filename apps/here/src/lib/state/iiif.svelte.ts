import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import {
  Manifest as IIIFManifest,
  Canvas as IIIFCanvas
} from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'

import {
  findManifests,
  findYearFromCanvas,
  findYearFromManifest
} from '$lib/shared/iiif.js'

import type { MapState } from '$lib/state/map.svelte.js'

const IIIF_KEY = Symbol('iiif')

type ManifestResult = {
  state: 'success'
  manifest: IIIFManifest
}

type ErrorResult = {
  state: 'error'
  error: Error
}

type FetchingResult = {
  state: 'fetching'
}

type FetchResult = FetchingResult | ManifestResult | ErrorResult

export class IiifState {
  #mapState: MapState

  #manifestItems = $derived.by(() => {
    if (this.#mapState && this.#mapState.map) {
      return findManifests(this.#mapState.map.resource.partOf)
    }

    return []
  })

  #manifestIds = $derived(this.#manifestItems.map((item) => item.id))

  #manifestCanvasIds = $derived(
    new SvelteMap(
      this.#manifestItems.map((item) => [
        item.id,
        item.parent?.type === 'Canvas' ? item.parent.id : undefined
      ])
    )
  )

  #fetchedManifests = $state<SvelteMap<string, FetchResult>>(new SvelteMap())
  #fetchedManifestCount = $state(0)

  #parsedManifests = $derived(
    new SvelteMap(
      [...this.#fetchedManifests.entries()]
        .filter(
          (entry): entry is [string, ManifestResult] =>
            entry[1].state === 'success'
        )
        .map(([manifestId, fetchResult]) => [manifestId, fetchResult.manifest])
    )
  )

  #year = $derived.by(() => {
    const years = [...this.#parsedManifests.values()]
      .map((manifest) => {
        let canvas: IIIFCanvas | undefined

        const canvasId = this.#manifestCanvasIds.get(manifest.uri)
        if (canvasId) {
          canvas = this.getParsedCanvas(manifest.uri, canvasId)
        }

        return {
          manifest: findYearFromManifest(manifest),
          canvas: findYearFromCanvas(canvas)
        }
      })
      .filter(({ manifest, canvas }) => manifest || canvas)

    if (years.length > 0) {
      const year = years[0]

      if (year.canvas) {
        return year.canvas
      } else {
        return year.manifest
      }
    }
  })

  constructor(mapState: MapState) {
    this.#mapState = mapState
  }

  async #fetchParsedManifest(manifestId: string) {
    if (this.#fetchedManifests.has(manifestId)) {
      return
    }

    this.#fetchedManifests.set(manifestId, {
      state: 'fetching'
    })

    try {
      const manifest = await fetchJson(manifestId)
      const parsedManifest = IIIFManifest.parse(manifest)

      this.#fetchedManifests.set(manifestId, {
        state: 'success',
        manifest: parsedManifest
      })
    } catch (err) {
      this.#fetchedManifests.set(manifestId, {
        state: 'error',
        error: err instanceof Error ? err : new Error(String(err))
      })
    } finally {
      this.#fetchedManifestCount++
    }
  }

  fetchManifest(manifestId: string) {
    if (!this.#fetchedManifests.has(manifestId)) {
      this.#fetchParsedManifest(manifestId)
    }
  }

  getParsedManifest(manifestId: string) {
    return this.#parsedManifests.get(manifestId)
  }

  getParsedCanvas(manifestId: string, canvasId: string) {
    const manifest = this.getParsedManifest(manifestId)

    if (manifest) {
      return manifest.canvases.find((canvas) => canvas.uri === canvasId)
    }
  }

  get parsedManifests() {
    return [...this.#parsedManifests.values()]
  }

  get manifestIds() {
    return this.#manifestIds
  }

  get manifestNotFetchedCount() {
    return this.#manifestIds.length - this.#fetchedManifestCount
  }

  get hasLoadingManifests() {
    return [...this.#fetchedManifests.values()].some(
      (result) => result.state === 'fetching'
    )
  }

  get year() {
    return this.#year
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
