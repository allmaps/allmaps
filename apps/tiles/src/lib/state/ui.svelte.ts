import { setContext, getContext } from 'svelte'

import type { Point } from '@allmaps/types'

const UI_KEY = Symbol('ui')

export class UiState {
  #zoom = $state<number | undefined>()
  #center = $state<Point | undefined>()

  get zoom() {
    return this.#zoom
  }

  set zoom(zoom: number | undefined) {
    this.#zoom = zoom
  }

  get center() {
    return this.#center
  }

  set center(center: Point | undefined) {
    this.#center = center
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
