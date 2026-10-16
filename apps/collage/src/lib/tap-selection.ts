type Pointer = Pick<
  PointerEvent,
  'pointerId' | 'clientX' | 'clientY' | 'timeStamp'
>

/** Select on release without taking pointer events away from navigation. */
export class TapSelection {
  private pending?: Pointer & { id: string }

  start(event: Pointer, id?: string) {
    this.pending = id
      ? {
          id,
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          timeStamp: event.timeStamp
        }
      : undefined
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

  end(event: Pointer): string | undefined {
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
