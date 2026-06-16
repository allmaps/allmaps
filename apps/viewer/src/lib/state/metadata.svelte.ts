import { setContext, getContext } from 'svelte'

import { parseLanguageString } from '@allmaps/iiif-inspector'

import { searchParams } from '$lib/shared/params.js'
import { truncate } from '$lib/shared/strings.js'

import {
  getSourceLabels,
  getOrganizationSummary
} from '$lib/shared/metadata.js'

import type { MapsState } from '$lib/state/maps.svelte.js'
import type { UrlState } from '$lib/state/url.svelte.js'

const METADATA_KEY = Symbol('metadata')

const truncateOptions = {
  maxLength: 48,
  toNearestSpace: true
}

export class MetadataState {
  #mapsState: MapsState
  #urlState: UrlState<typeof searchParams>

  #selectedMapId = $derived.by(() => this.#urlState.params.mapId)

  #labels = $derived.by(() =>
    getSourceLabels(this.#mapsState.maps, this.#selectedMapId)
  )

  #organization = $derived.by(() =>
    getOrganizationSummary(this.#mapsState.maps, this.#selectedMapId)
  )

  #manifestLabelString = $derived(
    parseLanguageString(this.#labels?.manifest, 'en')
  )
  #canvasLabelString = $derived(parseLanguageString(this.#labels?.canvas, 'en'))
  #summaryTitleString = $derived(this.#labels?.title)
  #titleBadge = $derived(this.#labels?.badge)

  constructor(mapsState: MapsState, urlState: UrlState<typeof searchParams>) {
    this.#mapsState = mapsState
    this.#urlState = urlState
  }

  #getTitle(
    manifestLabelString: string,
    canvasLabelString: string,
    summaryTitleString: string | undefined,
    includeAppName = false
  ) {
    let labels = includeAppName ? ['Allmaps Viewer'] : []

    if (summaryTitleString) {
      labels = [summaryTitleString, ...labels]
    } else if (manifestLabelString) {
      if (canvasLabelString) {
        const truncatedCanvasLabelString = truncate(
          canvasLabelString,
          truncateOptions
        )
        const truncatedManifestLabelString = truncate(
          manifestLabelString,
          truncateOptions
        )

        const resourceLabels =
          truncatedCanvasLabelString === truncatedManifestLabelString
            ? [truncatedManifestLabelString]
            : [truncatedCanvasLabelString, truncatedManifestLabelString]

        labels = [...resourceLabels, ...labels]
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
      this.#summaryTitleString,
      true
    )
  }

  get title() {
    return this.#getTitle(
      this.#manifestLabelString,
      this.#canvasLabelString,
      this.#summaryTitleString
    )
  }

  get titleBadge() {
    return this.#titleBadge
  }

  get organization() {
    return this.#organization
  }
}

export function setMetadataState(
  mapsState: MapsState,
  urlState: UrlState<typeof searchParams>
) {
  return setContext(METADATA_KEY, new MetadataState(mapsState, urlState))
}

export function getMetadataState() {
  const metadataState = getContext<MetadataState>(METADATA_KEY)
  if (!metadataState) {
    throw new Error('MetadataState is not set')
  }

  return metadataState
}
