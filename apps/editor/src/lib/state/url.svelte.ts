import { setContext, getContext } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'

import type { ParamKey } from '$lib/types/shared.js'

const URL_KEY = Symbol('url')

const INITIAL_URL = 'https://allmaps.org'

export class UrlState {
  #url = new SvelteURL(INITIAL_URL)

  #urlParam = $derived(this.#getParam('url'))

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

  #bbox = $derived(
    this.#bboxParam?.split(',').map((value) => parseFloat(value))
  )

  constructor(url: URL) {
    this.#url = new SvelteURL(url)
  }

  #getParam(key: ParamKey) {
    return this.#url.searchParams.get(key)
  }

  updateUrl(url: URL) {
    this.#url.href = url.href
  }

  get url() {
    return this.#urlParam
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

  get basemapPreset() {
    return this.#basemapPresetParam
  }

  get backgroundGeoreferenceAnnotationUrl() {
    return this.#backgroundGeoreferenceAnnotationUrlParam
  }
}

export function setUrlState(url: URL) {
  return setContext(URL_KEY, new UrlState(url))
}

export function getUrlState() {
  const urlState = getContext<ReturnType<typeof setUrlState>>(URL_KEY)

  if (!urlState) {
    throw new Error('UrlState is not set')
  }

  return urlState
}
