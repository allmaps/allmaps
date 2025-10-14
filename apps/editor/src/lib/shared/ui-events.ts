import type { Bbox, Point } from '@allmaps/types'

import type { ClickedItem } from '$lib/types/shared'

export const UiEvents = {
  CLICKED_ITEM: 'CLICKED_ITEM' as const,
  ZOOM_TO_EXTENT: 'ZOOM_TO_EXTENT' as const,
  FIT_BBOX: 'FIT_BBOX' as const,
  SET_CENTER: 'SET_CENTER' as const,
  TOGGLE_VISIBLE: 'TOGGLE_VISIBLE' as const,
  TOGGLE_RENDER_MASKS: 'TOGGLE_RENDER_MASKS' as const
}

interface UiEventMap {
  CLICKED_ITEM: ClickedItem
  FIT_BBOX: Bbox
  SET_CENTER: Point
  TOGGLE_VISIBLE: boolean
  TOGGLE_RENDER_MASKS: void
}

interface IUiEventTarget extends EventTarget {
  addEventListener<K extends keyof UiEventMap>(
    type: K,
    listener: (event: CustomEvent<UiEventMap[K]>) => void,
    options?: AddEventListenerOptions | boolean
  ): void

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener<K extends keyof UiEventMap>(
    type: K,
    listener: (event: CustomEvent<UiEventMap[K]>) => void,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void
}

export const UiEventTarget = EventTarget as {
  new (): IUiEventTarget
  prototype: IUiEventTarget
}
