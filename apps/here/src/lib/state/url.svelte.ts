import { setContext, getContext } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'

import { ErrorState } from '$lib/state/error.svelte.js'

const URL_KEY = Symbol('url')

const INITIAL_URL = 'https://allmaps.org'

type ParamKey = 'url' | 'from' | 'color'

export class UrlState {
  #url = new SvelteURL(INITIAL_URL)

  #errorState: ErrorState

  #urlParam = $derived(this.#getParam('url'))

  constructor(url: URL, errorState: ErrorState) {
    this.#url.href = url.href
    this.#errorState = errorState
  }

  #getParam(key: ParamKey) {
    return this.#url.searchParams.get(key) || undefined
  }

  updateUrl(url: URL) {
    this.#errorState.error = null
    this.#url.href = url.href
  }

  get url() {
    return this.#urlParam
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
