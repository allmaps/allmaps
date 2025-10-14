import { setContext, getContext } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'

import { ErrorState } from '$lib/state/error.svelte'

import type { Bbox } from '@allmaps/types'

import type { ParamKey, CollectionPath } from '$lib/types/shared.js'

const URL_KEY = Symbol('url')

const INITIAL_URL = 'https://allmaps.org'

export class UrlState {
  #url = new SvelteURL(INITIAL_URL)

  #errorState: ErrorState

  #urlParam = $derived(this.#getParam('url'))
  #pathParam = $derived(this.#getParam('path'))

  #manifestIdParam = $derived(this.#getParam('manifest'))
  #imageIdParam = $derived(this.#getParam('image'))

  #callbackParam = $derived(this.#getParam('callback'))
  #bboxParam = $derived(this.#getParam('bbox'))

  // TODO: Also accept userBaseMapUrl
  // TODO: also accept lowercase and snakecase
  #basemapUrlParam = $derived(this.#getParam('basemap-url'))
  #basemapPresetParam = $derived(this.#getParam('basemap-preset'))
  #backgroundGeoreferenceAnnotationUrlParam = $derived(
    this.#getParam('background-georeference-annotation-url')
  )

  #bbox = $derived.by<Bbox | undefined>(() => {
    const bbox = this.#bboxParam
      ?.split(',')
      .map((value: string) => parseFloat(value))

    if (bbox && bbox.length === 4) {
      return bbox as Bbox
    }
  })

  #path = $derived.by<CollectionPath>(() => {
    const parsedPath = this.#pathParam?.split(',').map((part: string) =>
      part
        .split('.')
        .map((p) => parseInt(p))
        .slice(0, 2)
    )

    return parsedPath?.map(([index, page]) => ({ index, page })) || []
  })

  constructor(url: URL, errorState: ErrorState) {
    this.#url = new SvelteURL(url)
    this.#errorState = errorState
  }

  #getParam(key: ParamKey) {
    return this.#url.searchParams.get(key)
  }

  updateUrl(url: URL) {
    this.#errorState.error = null
    this.#url.href = url.href
  }

  get url() {
    return this.#urlParam
  }

  get path() {
    return this.#path
  }

  get manifestId() {
    return this.#manifestIdParam
  }

  get imageId() {
    return this.#imageIdParam
  }

  get callback() {
    return this.#callbackParam
  }

  get bbox() {
    return this.#bbox
  }

  get basemapUrl() {
    return this.#basemapUrlParam
  }

  get basemapPresetId() {
    return this.#basemapPresetParam
  }

  get backgroundGeoreferenceAnnotationUrl() {
    return this.#backgroundGeoreferenceAnnotationUrlParam
  }
}

export function setUrlState(url: URL, errorState: ErrorState) {
  return setContext(URL_KEY, new UrlState(url, errorState))
}

export function getUrlState() {
  const urlState = getContext<ReturnType<typeof setUrlState>>(URL_KEY)

  if (!urlState) {
    throw new Error('UrlState is not set')
  }

  return urlState
}
