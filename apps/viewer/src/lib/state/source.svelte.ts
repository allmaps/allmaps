import { setContext, getContext } from 'svelte'

import { generateChecksum } from '@allmaps/id/sync'

import { searchParams } from '$lib/shared/params.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { Source } from '$lib/types/shared.js'

import type { UrlState } from '$lib/state/url.svelte.js'
import type { UiState } from '$lib/state/ui.svelte.js'

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #urlState: UrlState<typeof searchParams>
  #uiState: UiState

  #source = $state<Source | undefined>()

  #maps = $derived(this.#getMapsFromSource(this.#source))

  #previousMapId = $derived.by(() => {
    const currentMapId = this.#urlState.params.mapId

    if (this.#maps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#maps[0].id
    }

    const currentIndex = this.#maps.findIndex((map) => map.id === currentMapId)

    return this.#maps[
      (currentIndex - 1 + this.#maps.length) % this.#maps.length
    ].id
  })

  #nextMapId = $derived.by(() => {
    const currentMapId = this.#urlState.params.mapId

    if (this.#maps.length === 0) {
      return undefined
    }

    if (!currentMapId) {
      return this.#maps[0].id
    }

    const currentIndex = this.#maps.findIndex((map) => map.id === currentMapId)

    return this.#maps[(currentIndex + 1) % this.#maps.length].id
  })

  constructor(
    urlState: UrlState<typeof searchParams>,
    uiState: UiState,
    initialSource?: Source
  ) {
    this.#urlState = urlState
    this.#uiState = uiState

    this.source = initialSource
  }

  #ensureMapId(map: GeoreferencedMap): GeoreferencedMap {
    if (!map.id) {
      const checksum = generateChecksum(map)
      return {
        ...map,
        id: checksum
      }
    }
    return map
  }

  #getMapsFromSource(source?: Source) {
    if (source?.parsed.type === 'annotation') {
      return source.parsed.maps.map(this.#ensureMapId)
    } else if (source?.parsed.type === 'iiif') {
      return [
        ...(source.parsed.embeddedMaps || []),
        ...(source.parsed.apiMaps || [])
      ].map(this.#ensureMapId)
    }

    return []
  }

  set source(source: Source | undefined) {
    this.#uiState.reset()

    this.#source = source
  }

  get source(): Source | undefined {
    return this.#source
  }

  get maps() {
    return this.#maps
  }

  get mapCount() {
    return this.#maps.length
  }

  get previousMapId() {
    return this.#previousMapId
  }

  get nextMapId() {
    return this.#nextMapId
  }
}

export function setSourceState(
  urlState: UrlState<typeof searchParams>,
  uiState: UiState,
  initialSource?: Source
) {
  return setContext(
    SOURCE_KEY,
    new SourceState(urlState, uiState, initialSource)
  )
}

export function getSourceState() {
  const sourceState = getContext<SourceState>(SOURCE_KEY)
  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
