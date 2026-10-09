type Handler = {
  isEnabled: () => boolean
  enable: () => void
  disable: () => void
}

type MapNavigation = {
  stop: () => unknown
  getCanvas: () => { style: { touchAction: string } }
} & Record<
  'dragPan' | 'boxZoom' | 'doubleClickZoom' | 'touchPitch' | 'keyboard',
  Handler
>

/** Block competing drawing gestures while leaving scroll and pinch zoom alone. */
export function suspendMapNavigation(map: MapNavigation): () => void {
  const handlers = [
    map.dragPan,
    map.boxZoom,
    map.doubleClickZoom,
    map.touchPitch,
    map.keyboard
  ].map((handler) => ({ handler, enabled: handler.isEnabled() }))
  const canvas = map.getCanvas()
  const touchAction = canvas.style.touchAction
  // Disabling panning changes MapLibre's touch-action classes. Suppress browser
  // gestures on the page while MapLibre continues handling pinch zoom itself.
  canvas.style.touchAction = 'none'
  map.stop()
  for (const { handler } of handlers) handler.disable()
  let restored = false
  return () => {
    if (restored) return
    restored = true
    canvas.style.touchAction = touchAction
    for (const { handler, enabled } of handlers) {
      if (enabled) handler.enable()
      else handler.disable()
    }
  }
}
