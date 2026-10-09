type Pointer = Pick<
  PointerEvent,
  'pointerId' | 'pointerType' | 'clientX' | 'clientY'
>
type Position = [number, number]
type Pinch = { ids: string; distance: number; pen: Position }

/** Keep the original drawing pointer when a second finger pauses a stroke. */
export class PenTouchGesture {
  private pointers = new Map<number, Position>()
  private primaryId: number | undefined
  private navigation = false
  private previous: Pinch | undefined

  get pinching() {
    return !this.navigation && this.pointers.size > 1
  }

  get navigating() {
    return this.navigation
  }

  get hasPointers() {
    return this.pointers.size > 0
  }

  private sample(): Pinch | undefined {
    if (!this.pinching || this.primaryId === undefined) return
    const pen = this.pointers.get(this.primaryId)!
    const second = [...this.pointers].find(([id]) => id !== this.primaryId)!
    return {
      ids: `${this.primaryId},${second[0]}`,
      distance: Math.max(
        1,
        Math.hypot(pen[0] - second[1][0], pen[1] - second[1][1])
      ),
      pen
    }
  }

  start(event: Pointer, drawing: boolean): 'pinch' | 'navigate' | undefined {
    if (event.pointerType === 'mouse') return
    const wasPinching = this.pinching
    if (!this.pointers.size) this.primaryId = event.pointerId
    this.pointers.set(event.pointerId, [event.clientX, event.clientY])
    if (this.pointers.size === 2 && !wasPinching && !this.navigation) {
      if (!drawing) {
        // Two fingers before a stroke starts use MapLibre's normal pan/zoom.
        // Keep that gesture navigational even after one finger lifts.
        this.navigation = true
        return 'navigate'
      }
      this.previous = this.sample()
      return 'pinch'
    }
  }

  move(event: Pointer) {
    if (!this.pointers.has(event.pointerId)) return
    this.pointers.set(event.pointerId, [event.clientX, event.clientY])
    const previous = this.previous
    const next = this.sample()
    this.previous = next
    if (!previous || !next || previous.ids !== next.ids) return
    return {
      zoomDelta: Math.log2(next.distance / previous.distance),
      // MapLibre panBy offsets the camera, opposite to the finger movement.
      pan: [
        previous.pen[0] - next.pen[0],
        previous.pen[1] - next.pen[1]
      ] as Position
    }
  }

  /** Only lifting the original drawing pointer may finish the stroke. */
  end(event: Pointer): boolean {
    if (event.pointerType === 'mouse') return false
    const suppress = this.navigation || event.pointerId !== this.primaryId
    this.pointers.delete(event.pointerId)
    if (!this.pointers.size) this.reset()
    else {
      if (event.pointerId === this.primaryId) this.navigation = true
      this.previous = this.sample()
    }
    return suppress
  }

  reset() {
    this.pointers.clear()
    this.primaryId = undefined
    this.navigation = false
    this.previous = undefined
  }
}
