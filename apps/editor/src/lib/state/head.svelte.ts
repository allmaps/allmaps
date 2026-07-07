import { setContext, getContext } from 'svelte'

import { truncate } from '$lib/shared/strings.js'
import { parseLocalizedLanguageString } from '$lib/shared/iiif.js'
import { m } from '$lib/paraglide/messages.js'

import type { SourceState } from '$lib/state/source.svelte'

const appName = 'Allmaps Editor'
const ogImageSize = [1200, 627]

const truncateOptions = {
  maxLength: 32,
  toNearestSpace: true
}

const HEAD_KEY = Symbol('head')

export class HeadState {
  #previewUrl: string
  #sourceState: SourceState

  #parsedIiif = $derived.by(() => this.#sourceState.parsedIiif)

  #sourceLabel = $derived.by(() => {
    if (
      this.#parsedIiif?.type === 'manifest' ||
      this.#parsedIiif?.type === 'collection'
    ) {
      return this.#parsedIiif.label
    }
  })

  #canvas = $derived.by(() => this.#sourceState.activeCanvas)

  #sourceLabelString = $derived(parseLocalizedLanguageString(this.#sourceLabel))
  #canvasLabelString = $derived(
    parseLocalizedLanguageString(this.#canvas?.label)
  )

  constructor(previewUrl: string, sourceState: SourceState) {
    this.#previewUrl = previewUrl
    this.#sourceState = sourceState
  }

  #getTitle(
    sourceLabelString: string,
    canvasLabelString: string,
    includeAppName = false
  ) {
    let labels = includeAppName ? [appName] : []

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
    return m.head_description()
  }

  #getOgImageUrl() {
    // TODO: use active manifest when source type is collection!
    if (this.#sourceState.source) {
      return `${this.#previewUrl}/${this.#sourceState.source.type}s/${this.#sourceState.source.allmapsId}`
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
          content: appName
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

export function setHeadState(previewUrl: string, sourceState: SourceState) {
  return setContext(HEAD_KEY, new HeadState(previewUrl, sourceState))
}

export function getHeadState() {
  const headState = getContext<ReturnType<typeof setHeadState>>(HEAD_KEY)

  if (!headState) {
    throw new Error('HeadState is not set')
  }

  return headState
}
