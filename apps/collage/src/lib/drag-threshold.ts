type Position = Pick<PointerEvent, 'clientX' | 'clientY'>

/** Ignore tap jitter in CSS pixels, then keep tracking even back at the origin. */
export class DragThreshold {
  private origin: Position
  private distance: number
  started = false

  constructor(event: Position & Pick<PointerEvent, 'pointerType'>) {
    this.origin = { clientX: event.clientX, clientY: event.clientY }
    this.distance =
      event.pointerType === 'pen' || event.pointerType === 'touch' ? 8 : 3
  }

  update(event: Position) {
    this.started ||=
      Math.hypot(
        event.clientX - this.origin.clientX,
        event.clientY - this.origin.clientY
      ) > this.distance
    return this.started
  }
}
