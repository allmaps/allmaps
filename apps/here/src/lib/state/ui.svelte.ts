import { setContext, getContext } from 'svelte'

import type { Point } from '@allmaps/types'

const URL_KEY = Symbol('url')

export class UiState {
  #color = $state('pink')
  #fromScreenCoordinates = $state<Point | undefined>()
  #positionScreenCoordinates = $state<Point | undefined>()

  #followPosition = $state(false)

  get color() {
    return this.#color
  }

  set color(color: string) {
    this.#color = color
  }

  get fromScreenCoordinates(): Point | undefined {
    return this.#fromScreenCoordinates
  }

  set fromScreenCoordinates(coordinates: Point) {
    this.#fromScreenCoordinates = coordinates
  }
  get positionScreenCoordinates(): Point | undefined {
    return this.#positionScreenCoordinates
  }

  set positionScreenCoordinates(coordinates: Point) {
    this.#positionScreenCoordinates = coordinates
  }

  get followPosition() {
    return this.#followPosition
  }

  set followPosition(follow: boolean) {
    this.#followPosition = follow
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
