export const UiEvents = {
  ZOOM_TO_EXTENT: 'ZOOM_TO_EXTENT' as const,
  ZOOM_IN: 'ZOOM_IN' as const,
  ZOOM_OUT: 'ZOOM_OUT' as const,
  RESET_BEARING: 'RESET_BEARING' as const
}

interface UiEventMap {
  ZOOM_TO_EXTENT: void
  ZOOM_IN: void
  ZOOM_OUT: void
  RESET_BEARING: void
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
