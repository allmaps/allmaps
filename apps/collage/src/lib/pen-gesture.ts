type Pointer = Pick<PointerEvent, 'pointerId' | 'pointerType'>

/** Once a pen gesture becomes a pinch, ignore drawing until all fingers lift. */
export class PenTouchGesture {
  private pointers = new Set<number>()
  private multiTouch = false

  get pinching() {
    return this.multiTouch
  }

  /** Return true once when a second finger turns a stroke into a pinch. */
  start(event: Pointer): boolean {
    if (event.pointerType !== 'touch') return false
    this.pointers.add(event.pointerId)
    if (!this.multiTouch && this.pointers.size > 1) {
      this.multiTouch = true
      return true
    }
    return false
  }

  /** The final pointerup still belongs to the pinch and must not finish a mask. */
  end(event: Pointer): boolean {
    const pinching = this.multiTouch
    if (event.pointerType === 'touch') this.pointers.delete(event.pointerId)
    if (!this.pointers.size) this.multiTouch = false
    return pinching
  }

  reset() {
    this.pointers.clear()
    this.multiTouch = false
  }
}
