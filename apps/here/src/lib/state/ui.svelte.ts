import { setContext, getContext } from 'svelte'

import type { Point, Size } from '@allmaps/types'

const UI_KEY = Symbol('ui')

type RowSizes = {
  left: Size
  center: Size
  right: Size
}

type ElementSizes = {
  top: RowSizes
  bottom: RowSizes
}

const defaultElementSizes: ElementSizes = {
  top: {
    left: [0, 0],
    center: [0, 0],
    right: [0, 0]
  },
  bottom: {
    left: [0, 0],
    center: [0, 0],
    right: [0, 0]
  }
}

export class UiState {
  #color = $state('pink')
  #fromScreenCoordinates = $state<Point | undefined>()
  #positionScreenCoordinates = $state<Point | undefined>()

  #followPosition = $state(false)

  #elementSizes = $state<ElementSizes>(defaultElementSizes)

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

  get elementSizes() {
    return this.#elementSizes
  }

  set elementSizes(sizes: ElementSizes) {
    this.#elementSizes = sizes
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
