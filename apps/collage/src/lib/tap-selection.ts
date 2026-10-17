type Pointer = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY' | 'timeStamp'
>

/** Select on release without taking pointer events away from navigation. */
export class TapSelection {
  private pending?: Pointer & { id: string | null }

  start(event: Pointer, id?: string) {
    this.pending = {
      id: id ?? null,
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      timeStamp: event.timeStamp
    }
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
    if (this.pending?.pointerId !== event.pointerId) return
    this.move(event)
    const start = this.pending
    this.cancel()
    if (start && event.timeStamp - start.timeStamp <= 500) return start.id
  }

  cancel() {
    this.pending = undefined
  }
}
