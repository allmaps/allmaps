type Pointer = Pick<PointerEvent, 'pointerId' | 'clientX' | 'clientY'>

/** Select on release or after a stationary hold; movement belongs to navigation. */
export class TapSelection {
  private pending?: Pointer & { id: string | null }
  private timer?: ReturnType<typeof setTimeout>
  private heldPointerId?: number

  get active() {
    return !!this.pending || this.heldPointerId !== undefined
  }

  isHeld(event: Pick<Pointer, 'pointerId'>) {
    return this.heldPointerId === event.pointerId
  }

  start(event: Pointer, id?: string, onHold?: (id: string) => void) {
    this.cancel()
    this.pending = {
      id: id ?? null,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY
    }
    if (id && onHold)
      this.timer = setTimeout(() => {
        this.pending = undefined
        this.timer = undefined
        this.heldPointerId = event.pointerId
        onHold(id)
      }, 500)
  }

  move(event: Pointer) {
    const start = this.pending
    if (
      start?.pointerId === event.pointerId &&
      Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) >
        8
    )
      this.cancel()
  }

  /** null is a tap on empty canvas; undefined means no completed tap. */
  end(event: Pointer): string | null | undefined {
    if (this.isHeld(event)) {
      this.cancel()
      return
    }
    if (this.pending?.pointerId !== event.pointerId) return
    this.move(event)
    const start = this.pending
    this.cancel()
    return start?.id
  }

  cancel() {
    clearTimeout(this.timer)
    this.timer = undefined
    this.pending = undefined
    this.heldPointerId = undefined
  }
}
