type Surface = Pick<
  HTMLElement,
  | 'addEventListener'
  | 'removeEventListener'
  | 'setPointerCapture'
  | 'hasPointerCapture'
  | 'releasePointerCapture'
>

/** Keep tablet pen input on the canvas, independently of compatibility mouse/touch events. */
export function bindMaskStylus(
  canvas: Surface,
  windowTarget: EventTarget,
  callbacks: {
    start: (event: PointerEvent) => void
    end: () => void
    cancel: () => void
    allowTouch: () => boolean
  }
) {
  let pointer: number | undefined
  let bound = true

  const blockOtherPointer = (event: PointerEvent) => {
    if (
      pointer === undefined ||
      event.pointerId === pointer ||
      (event.pointerType === 'touch' && callbacks.allowTouch())
    )
      return false
    event.stopImmediatePropagation()
    return true
  }

  const down = (event: PointerEvent) => {
    if (blockOtherPointer(event)) return
    if (event.pointerType !== 'pen' || event.button !== 0) return
    pointer = event.pointerId
    canvas.setPointerCapture(pointer)
    callbacks.start(event)
    // Suppress compatibility mouse events without suppressing Terra Draw's
    // PointerEvents, which still need to receive the entire stroke.
    if (event.cancelable) event.preventDefault()
  }

  const move = (event: PointerEvent) => {
    if (blockOtherPointer(event)) return
    if (event.pointerId === pointer && event.cancelable) event.preventDefault()
  }

  const release = () => {
    const previous = pointer
    pointer = undefined
    if (previous !== undefined && canvas.hasPointerCapture(previous))
      canvas.releasePointerCapture(previous)
  }

  const up = (event: PointerEvent) => {
    if (blockOtherPointer(event) || event.pointerId !== pointer) return
    if (event.cancelable) event.preventDefault()
    release()
    // Let Terra Draw finish a polygon click or vertex/stroke drag before
    // restoring navigation. Do not unlock a subsequent stroke.
    queueMicrotask(() => {
      if (bound && pointer === undefined) callbacks.end()
    })
  }

  const cancel = () => {
    if (pointer === undefined) return
    release()
    callbacks.cancel()
  }

  const interrupted = (event: PointerEvent) => {
    if (blockOtherPointer(event) || event.pointerId !== pointer) return
    event.stopImmediatePropagation()
    cancel()
  }

  const touch = (event: Event) => {
    if (pointer === undefined) return
    // MapLibre handles TouchEvents separately. Freehand's second-finger zoom
    // is handled by its PointerEvents instead, anchored at the current pen tip.
    if (event.cancelable) event.preventDefault()
    event.stopImmediatePropagation()
  }

  const listeners: [string, EventListener][] = [
    ['pointerdown', down as EventListener],
    ['pointermove', move as EventListener],
    ['pointerup', up as EventListener],
    ['pointercancel', interrupted as EventListener],
    ['lostpointercapture', interrupted as EventListener],
    ...['touchstart', 'touchmove', 'touchend', 'touchcancel'].map(
      (type): [string, EventListener] => [type, touch]
    )
  ]
  for (const [type, listener] of listeners)
    canvas.addEventListener(type, listener, { capture: true, passive: false })
  windowTarget.addEventListener('blur', cancel)

  return () => {
    if (!bound) return
    bound = false
    for (const [type, listener] of listeners)
      canvas.removeEventListener(type, listener, { capture: true })
    windowTarget.removeEventListener('blur', cancel)
    cancel()
  }
}
