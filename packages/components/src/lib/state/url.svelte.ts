import { setContext, getContext } from 'svelte'
import { SvelteURL } from 'svelte/reactivity'

const URL_KEY = Symbol('url')

const INITIAL_URL = 'https://allmaps.org'

export type Params<Keys extends readonly string[]> = {
  [key in Keys[number]]?: string[]
}

export class UrlState<Keys extends readonly string[]> {
  #url = new SvelteURL(INITIAL_URL)
  #keys: Keys

  #params = $state<Params<Keys>>({})

  constructor(url: URL, keys: Keys) {
    this.#url = new SvelteURL(url)
    this.#keys = keys
  }

  #getParam(key: Keys[number]) {
    return this.#url.searchParams.getAll(key)
  }

  updateUrl(url: URL) {
    this.#url.href = url.href

    this.#params = Object.fromEntries(
      this.#keys.map((key) => [key, this.#getParam(key)])
    ) as Params<Keys>
  }

  get params() {
    return this.#params
  }
}

export function setUrlState<Keys extends readonly string[]>(
  url: URL,
  keys: Keys
) {
  return setContext(URL_KEY, new UrlState(url, keys))
}

export function getUrlState() {
  const urlState = getContext<ReturnType<typeof setUrlState>>(URL_KEY)

  if (!urlState) {
    throw new Error('UrlState is not set')
  }

  return urlState
}
