import { setContext, getContext } from 'svelte'

import { truncate } from '$lib/shared/strings.js'
import { parseLanguageString } from '$lib/shared/iiif.js'

import type { SourceState } from '$lib/state/source.svelte'

import { PUBLIC_ALLMAPS_PREVIEW_URL } from '$env/static/public'

const ogImageSize = [1200, 627]

const truncateOptions = {
  maxLength: 32,
  toNearestSpace: true
}

const HEAD_KEY = Symbol('head')

export class HeadState {
  #sourceState: SourceState

  #parsedIiif = $derived.by(() => {
    return this.#sourceState.source?.parsedIiif
  })

  #sourceLabel = $derived.by(() => {
    if (
      this.#parsedIiif?.type === 'manifest' ||
      this.#parsedIiif?.type === 'collection'
    ) {
      return this.#parsedIiif.label
    }
  })

  #canvas = $derived.by(() => {
    return this.#sourceState.activeImageId
      ? this.#sourceState.getCanvasByImageId(this.#sourceState.activeImageId)
      : undefined
  })

  #sourceLabelString = $derived(parseLanguageString(this.#sourceLabel, 'en'))
  #canvasLabelString = $derived(parseLanguageString(this.#canvas?.label, 'en'))

  constructor(sourceState: SourceState) {
    this.#sourceState = sourceState
  }

  #getTitle(
    sourceLabelString: string,
    canvasLabelString: string,
    includeAppName = false
  ) {
    let labels = includeAppName ? ['Allmaps Editor'] : []

    if (sourceLabelString) {
      if (canvasLabelString) {
        labels = [
          truncate(canvasLabelString, truncateOptions),
          truncate(sourceLabelString, truncateOptions),
          ...labels
        ]
      } else {
        labels = [truncate(sourceLabelString, truncateOptions), ...labels]
      }
    }

    return labels.join(' / ')
  }

  #getDescription() {
    return 'Georeference IIIF maps with Allmaps Editor'
  }

  #getOgImageUrl() {
    // TODO: use active manifest when source type is collection!
    if (this.#sourceState.source) {
      return `${PUBLIC_ALLMAPS_PREVIEW_URL}/${this.#sourceState.source.type}s/${this.#sourceState.source.allmapsId}`
    }
  }

  get labels() {
    return [this.#canvasLabelString, this.#sourceLabelString].filter(Boolean)
  }

  get description() {
    return this.#getDescription()
  }

  get appTitle() {
    return this.#getTitle(
      this.#sourceLabelString,
      this.#canvasLabelString,
      true
    )
  }

  get title() {
    return this.#getTitle(this.#sourceLabelString, this.#canvasLabelString)
  }

  get tags() {
    const ogImageUrl = this.#getOgImageUrl()

    const ogImageTags = ogImageUrl
      ? [
          {
            property: 'og:image',
            content: ogImageUrl
          },
          {
            property: 'og:image:width',
            content: String(ogImageSize[0])
          },
          {
            property: 'og:image:height',
            content: String(ogImageSize[1])
          }
        ]
      : []

    return {
      title: this.appTitle,
      description: this.description,
      og: [
        {
          property: 'og:title',
          content: this.appTitle
        },
        {
          property: 'og:description',
          content: this.description
        },
        {
          property: 'og:site_name',
          content: 'Allmaps Editor'
        },
        {
          property: 'og:type',
          content: 'website'
        },
        ...ogImageTags
      ]
    }
  }
}

export function setHeadState(sourceState: SourceState) {
  return setContext(HEAD_KEY, new HeadState(sourceState))
}

export function getHeadState() {
  const headState = getContext<ReturnType<typeof setHeadState>>(HEAD_KEY)

  if (!headState) {
    throw new Error('HeadState is not set')
  }

  return headState
}
