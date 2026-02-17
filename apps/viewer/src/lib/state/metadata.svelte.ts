import { setContext, getContext } from 'svelte'

import { searchParams } from '$lib/shared/params.js'
import { truncate } from '$lib/shared/strings.js'
import { parseLanguageString } from '$lib/shared/iiif.js'
import { getSourceLabels, getOrganization } from '$lib/shared/metadata.js'

import type { SourceState } from '$lib/state/source.svelte.js'
import type { UrlState } from '$lib/state/url.svelte.js'

const METADATA_KEY = Symbol('metadata')

const truncateOptions = {
  maxLength: 32,
  toNearestSpace: true
}

export class MetadataState {
  #sourceState: SourceState
  #urlState: UrlState<typeof searchParams>

  #selectedMapId = $derived.by(() => this.#urlState.params.mapId)

  #labels = $derived.by(() =>
    getSourceLabels(this.#sourceState.maps, this.#selectedMapId)
  )

  #organization = $derived.by(() =>
    getOrganization(this.#sourceState.maps, this.#selectedMapId)
  )

  #manifestLabelString = $derived(
    parseLanguageString(this.#labels?.manifest, 'en')
  )
  #canvasLabelString = $derived(parseLanguageString(this.#labels?.canvas, 'en'))

  constructor(
    sourceState: SourceState,
    urlState: UrlState<typeof searchParams>
  ) {
    this.#sourceState = sourceState
    this.#urlState = urlState
  }

  #getTitle(
    manifestLabelString: string,
    canvasLabelString: string,
    includeAppName = false
  ) {
    let labels = includeAppName ? ['Allmaps Viewer'] : []

    if (manifestLabelString) {
      if (canvasLabelString) {
        labels = [
          truncate(canvasLabelString, truncateOptions),
          truncate(manifestLabelString, truncateOptions),
          ...labels
        ]
      } else {
        labels = [truncate(manifestLabelString, truncateOptions), ...labels]
      }
    }

    return labels.join(' / ')
  }

  get labels() {
    return this.#labels
  }

  get appTitle() {
    return this.#getTitle(
      this.#manifestLabelString,
      this.#canvasLabelString,
      true
    )
  }

  get title() {
    return this.#getTitle(this.#manifestLabelString, this.#canvasLabelString)
  }

  get organization() {
    return this.#organization
  }
}

export function setMetadataState(
  sourceState: SourceState,
  urlState: UrlState<typeof searchParams>
) {
  return setContext(METADATA_KEY, new MetadataState(sourceState, urlState))
}

export function getMetadataState() {
  const metadataState = getContext<MetadataState>(METADATA_KEY)
  if (!metadataState) {
    throw new Error('MetadataState is not set')
  }

  return metadataState
}
