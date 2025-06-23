import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { Manifest } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'

import { findManifests, findYearFromMetadata } from '$lib/shared/iiif.js'

import type { MapState } from '$lib/state/map.svelte.js'

const IIIF_KEY = Symbol('iiif')

type ManifestResult = {
  state: 'success'
  manifest: Manifest
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
        const canvasYears = manifest.canvases
          .map((canvas) => ({
            year: findYearFromMetadata(canvas.metadata),
            navDate: canvas.navDate
          }))
          .filter(({ year, navDate }) => year || navDate)

        return {
          year: findYearFromMetadata(manifest.metadata),
          canvasYears,
          navDate: manifest.navDate
        }
      })
      .filter(
        ({ year, navDate, canvasYears }) =>
          year || navDate || canvasYears.length
      )

    if (years.length > 0) {
      const year = years[0]

      if (year.navDate) {
        return year.navDate.getFullYear
      } else if (year.year) {
        return year.year
      } else if (year.canvasYears.length > 0) {
        // TODO: only use current canvas
        const firstCanvasYear = year.canvasYears[0]

        if (firstCanvasYear.navDate) {
          return firstCanvasYear.navDate.getFullYear()
        } else if (firstCanvasYear.year) {
          return firstCanvasYear.year
        }
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
      const parsedManifest = Manifest.parse(manifest)

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
