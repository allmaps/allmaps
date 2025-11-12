import { setContext, getContext } from 'svelte'

const UI_KEY = Symbol('ui')

export class UiState {
  #loading = $state(true)
  #itemCount = $state(0)
  #errorCount = $state(0)

  get loading() {
    return this.#loading
  }

  get itemCount() {
    return this.#itemCount
  }

  get errorCount() {
    return this.#errorCount
  }

  set loading(loading: boolean) {
    this.#loading = loading
  }

  set itemCount(count: number) {
    this.#itemCount = count
  }

  set errorCount(count: number) {
    this.#errorCount = count
  }
}

export function setUiState() {
  return setContext(UI_KEY, new UiState())
}

export function getUiState() {
  const uiState = getContext<ReturnType<typeof setUiState>>(UI_KEY)

  if (!uiState) {
    throw new Error('UiState is not set')
  }

  return uiState
}
