type Handler = {
  isEnabled: () => boolean
  enable: () => void
  disable: () => void
}

type MapNavigation = {
  stop: () => unknown
  getCanvas: () => { style: { touchAction: string } }
} & Record<
  | 'dragPan'
  | 'scrollZoom'
  | 'boxZoom'
  | 'doubleClickZoom'
  | 'touchZoomRotate'
  | 'touchPitch'
  | 'keyboard',
  Handler
>

/** Suspend navigation for a pen stroke, then restore the previous settings. */
export function suspendMapNavigation(map: MapNavigation): () => void {
  const handlers = [
    map.dragPan,
    map.scrollZoom,
    map.boxZoom,
    map.doubleClickZoom,
    map.touchZoomRotate,
    map.touchPitch,
    map.keyboard
  ].map((handler) => ({ handler, enabled: handler.isEnabled() }))
  const canvas = map.getCanvas()
  const touchAction = canvas.style.touchAction
  // Disabling MapLibre's handlers also removes its touch-action CSS classes.
  // Keep browser gestures from cancelling the drawing pointer stream on iOS.
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
