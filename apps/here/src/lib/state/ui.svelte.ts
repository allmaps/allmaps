import { setContext, getContext } from 'svelte'

const URL_KEY = Symbol('url')

export class UiState {
  #color = $state('pink')

  get color() {
    return this.#color
  }

  set color(color: string) {
    this.#color = color
  }
}

export function setUiState() {
  return setContext(URL_KEY, new UiState())
}

export function getUiState() {
  const uiState = getContext<ReturnType<typeof setUiState>>(URL_KEY)

  if (!uiState) {
    throw new Error('UiState is not set')
  }

  return uiState
}
