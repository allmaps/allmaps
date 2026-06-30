import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { Manifest as IIIFManifest } from '@allmaps/iiif-parser'
import { fetchJson } from '@allmaps/stdlib'
// import { findYearInCanvas, findYearInManifest } from '@allmaps/iiif-inspector'

import { findManifests } from '$lib/shared/iiif.js'

import type { MapsState } from '$lib/state/maps.svelte.js'

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
  #mapsState: MapsState

  #manifestItems = $derived.by(() => [
    ...this.#mapsState.maps.flatMap((map) =>
      findManifests(map.resource.partOf ?? [])
    ),
    ...this.#mapsState.invalidEmbeddedAnnotations.flatMap(
      (invalidAnnotation) => [
        ...(invalidAnnotation.manifest
          ? [
              {
                ...invalidAnnotation.manifest,
                parent: invalidAnnotation.canvas
              }
            ]
          : []),
        ...findManifests(invalidAnnotation.resource.partOf ?? [])
      ]
    )
  ])

  #manifestIds = $derived.by(() => {
    const manifestIds: string[] = []
    const seenManifestIds = new Set<string>()

    for (const item of this.#manifestItems) {
      if (!seenManifestIds.has(item.id)) {
        seenManifestIds.add(item.id)
        manifestIds.push(item.id)
      }
    }

    return manifestIds
  })

  #fetchedManifests = $state<SvelteMap<string, FetchResult>>(new SvelteMap())
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

  // #manifestCanvasIds = $derived.by(() => {
  //   const canvasIdsByManifestId = new SvelteMap<string, string[]>()

  //   for (const item of this.#manifestItems) {
  //     if (item.parent?.type !== 'Canvas') {
  //       continue
  //     }

  //     const canvasIds = canvasIdsByManifestId.get(item.id) ?? []

  //     if (!canvasIds.includes(item.parent.id)) {
  //       canvasIdsByManifestId.set(item.id, [...canvasIds, item.parent.id])
  //     }
  //   }

  //   return canvasIdsByManifestId
  // })

  // #year = $derived.by(() => {
  //   const years = [...this.#parsedManifests.entries()]
  //     .map(([manifestId, manifest]) => {
  //       const canvasYears = (this.#manifestCanvasIds.get(manifestId) ?? [])
  //         .map((canvasId) => {
  //           const canvas = this.getParsedCanvas(manifestId, canvasId)
  //           return findYearInCanvas(canvas)
  //         })
  //         .filter((year) => year !== undefined)

  //       return {
  //         manifest: findYearInManifest(manifest),
  //         canvas: canvasYears[0]
  //       }
  //     })
  //     .filter(({ manifest, canvas }) => manifest || canvas)

  //   if (years.length > 0) {
  //     const year = years[0]

  //     if (year.canvas) {
  //       return year.canvas
  //     } else {
  //       return year.manifest
  //     }
  //   }
  // })

  constructor(mapsState: MapsState) {
    this.#mapsState = mapsState
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

  isManifestLoading(manifestId?: string) {
    return manifestId
      ? this.#fetchedManifests.get(manifestId)?.state === 'fetching'
      : false
  }

  getParsedCanvas(manifestId: string, canvasId: string) {
    const manifest = this.getParsedManifest(manifestId)

    if (manifest) {
      return manifest.canvases.find((canvas) => canvas.uri === canvasId)
    }
  }

  get manifestIds() {
    return this.#manifestIds
  }

  get hasLoadingManifests() {
    return [...this.#fetchedManifests.values()].some(
      (result) => result.state === 'fetching'
    )
  }
}

export function setIiifState(mapsState: MapsState) {
  return setContext(IIIF_KEY, new IiifState(mapsState))
}

export function getIiifState() {
  const iiifState = getContext<ReturnType<typeof setIiifState>>(IIIF_KEY)

  if (!iiifState) {
    throw new Error('IiifState is not set')
  }

  return iiifState
}
