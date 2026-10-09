type Pointer = Pick<PointerEvent, 'pointerId' | 'pointerType' | 'isPrimary'>

/** A multi-touch gesture belongs to navigation until every finger lifts. */
export class TouchNavigation {
  private pointers = new Set<number>()
  private navigating = false

  get active() {
    return this.navigating
  }

  /** Return true once, when an existing edit must be cancelled. */
  start(event: Pointer): boolean {
    if (event.pointerType !== 'touch') return false
    this.pointers.add(event.pointerId)
    if (!this.navigating && (this.pointers.size > 1 || !event.isPrimary)) {
      this.navigating = true
      return true
    }
    return false
  }

  end(event: Pointer) {
    if (event.pointerType !== 'touch') return
    this.pointers.delete(event.pointerId)
    if (!this.pointers.size) this.navigating = false
  }

  reset() {
    this.pointers.clear()
    this.navigating = false
  }
}
