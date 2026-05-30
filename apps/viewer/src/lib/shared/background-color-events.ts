export const BackGroundColorEvents = {
  BACKGROUND_COLOR_CHANGE: 'BACKGROUND_COLOR_CHANGE' as const
}

type BackgroundColorChange = {
  mapId: string
  backgroundColor: [number, number, number]
}

type BackgroundColorEventMap = {
  BACKGROUND_COLOR_CHANGE: BackgroundColorChange
}

interface IBackgroundColorEventTarget extends EventTarget {
  addEventListener<K extends keyof BackgroundColorEventMap>(
    type: K,
    listener: (event: CustomEvent<BackgroundColorEventMap[K]>) => void,
    options?: AddEventListenerOptions | boolean
  ): void

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener<K extends keyof BackgroundColorEventMap>(
    type: K,
    listener: (event: CustomEvent<BackgroundColorEventMap[K]>) => void,
    options?: EventListenerOptions | boolean
  ): void

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void
}

export type BackgroundColorChangeEvent = CustomEvent<BackgroundColorChange>

export const BackgroundColorEventTarget = EventTarget as {
  new (): IBackgroundColorEventTarget
  prototype: IBackgroundColorEventTarget
}
