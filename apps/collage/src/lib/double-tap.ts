type Pointer = Pick<
  PointerEvent,
  'pointerId' | 'pointerType' | 'clientX' | 'clientY' | 'timeStamp'
>
type Tap<T> = { event: Pointer; target: T }

/** Touch-only double tap; a drag, long press or second finger cancels it. */
export class TouchDoubleTap<T> {
  private pointers = new Set<number>()
  private down: Tap<T> | undefined
  private previous: Tap<T> | undefined

  start(event: Pointer, target: T | undefined) {
    if (event.pointerType !== 'touch') return
    this.pointers.add(event.pointerId)
    if (this.pointers.size !== 1 || target === undefined) {
      this.down = this.previous = undefined
      return
    }
    this.down = { event, target }
  }

  move(event: Pointer) {
    if (
      this.down &&
      event.pointerId === this.down.event.pointerId &&
      Math.hypot(
        event.clientX - this.down.event.clientX,
        event.clientY - this.down.event.clientY
      ) > 8
    )
      this.down = this.previous = undefined
  }

  end(event: Pointer, target: T | undefined): T | undefined {
    if (event.pointerType !== 'touch') return
    this.pointers.delete(event.pointerId)
    const down = this.down
    this.down = undefined
    if (
      !down ||
      down.event.pointerId !== event.pointerId ||
      down.target !== target ||
      Math.hypot(
        event.clientX - down.event.clientX,
        event.clientY - down.event.clientY
      ) > 8 ||
      event.timeStamp - down.event.timeStamp > 300
    ) {
      this.previous = undefined
      return
    }
    const previous = this.previous
    const tap = { event, target: down.target }
    if (
      previous &&
      previous.target === target &&
      event.timeStamp - previous.event.timeStamp <= 350 &&
      Math.hypot(
        event.clientX - previous.event.clientX,
        event.clientY - previous.event.clientY
      ) <= 20
    ) {
      this.previous = undefined
      return target
    }
    this.previous = tap
  }

  reset() {
    this.pointers.clear()
    this.down = this.previous = undefined
  }
}
