import { setContext, getContext } from 'svelte'

import { UiEvents, UiEventTarget } from '$lib/shared/ui-events.js'

const UI_KEY = Symbol('ui')

type View = 'map' | 'image'
type Modal = 'about'
type ModalOpen = Modal | undefined

export class UiState extends UiEventTarget {
  #opacity = $state(1)
  #removeBackground = $state(false)

  #mapBearing = $state(0)
  #imageUpBearing = $state<number>()

  #metadataScrollTop = $state(0)

  #view: View = $state('map')

  #modalOpen = $state<ModalOpen>()

  modalOpen: Record<Modal, boolean>

  constructor() {
    super()

    this.modalOpen = new Proxy({} as Record<Modal, boolean>, {
      get: (target, prop: string | symbol) => {
        if (typeof prop === 'string') {
          return this.#modalOpen === prop
        }

        return undefined
      },
      set: (target, prop: string | symbol, value: boolean) => {
        if (typeof prop === 'string') {
          this.#modalOpen = value ? (prop as Modal) : undefined
          return true
        }

        return false
      }
    })
  }

  reset() {
    this.#opacity = 1
    this.#removeBackground = false
    this.#metadataScrollTop = 0
    this.#view = 'map'
    this.#modalOpen = undefined
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

  get removeBackground() {
    return this.#removeBackground
  }

  set removeBackground(value: boolean) {
    this.#removeBackground = value
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

  get imageUpBearing() {
    return this.#imageUpBearing
  }

  set imageUpBearing(value: number | undefined) {
    this.#imageUpBearing = value
  }

  get metadataScrollTop() {
    return this.#metadataScrollTop
  }

  set metadataScrollTop(value: number) {
    this.#metadataScrollTop = value
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
