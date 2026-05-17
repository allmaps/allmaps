import { setContext, getContext } from 'svelte'

import { UiEvents, UiEventTarget } from '$lib/shared/ui-events.js'

const UI_KEY = Symbol('ui')

type View = 'map' | 'image'

export class UiState extends UiEventTarget {
  #opacity = $state(1)
  #removeColorThreshold = $state(1)

  #mapBearing = $state(0)

  #view: View = $state('map')

  reset() {
    this.#opacity = 1
    this.#removeColorThreshold = 0
    this.#view = 'map'
  }

  dispatchZoomToExtent() {
    this.dispatchEvent(new CustomEvent(UiEvents.ZOOM_TO_EXTENT))
  }

  dispatchZoomIn() {
    this.dispatchEvent(new CustomEvent(UiEvents.ZOOM_IN))
  }

  dispatchZoomOut() {
    this.dispatchEvent(new CustomEvent(UiEvents.ZOOM_OUT))
  }

  dispatchResetBearing() {
    this.dispatchEvent(new CustomEvent(UiEvents.RESET_BEARING))
  }

  get opacity() {
    return this.#opacity
  }

  set opacity(value: number) {
    this.#opacity = value
  }

  get removeColorThreshold() {
    return this.#removeColorThreshold
  }

  set removeColorThreshold(value: number) {
    this.#removeColorThreshold = value
  }

  get view() {
    return this.#view
  }

  set view(value: View) {
    this.#view = value
  }

  get mapBearing() {
    return this.#mapBearing
  }

  set mapBearing(value: number) {
    this.#mapBearing = value
  }
}

export function setUiState() {
  return setContext(UI_KEY, new UiState())
}

export function getUiState() {
  const uiState = getContext<UiState>(UI_KEY)
  if (!uiState) {
    throw new Error('UiState is not set')
  }

  return uiState
}
