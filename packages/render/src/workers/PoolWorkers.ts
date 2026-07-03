import { wrap as comlinkWrap } from 'comlink'

import type { Remote } from 'comlink'

export class WorkerPool<T> {
  workers: Worker[] = []
  wrapped: Remote<T>[] = []
  #outstanding: number[] = []

  constructor(WorkerCtor: new () => Worker, size: number) {
    for (let i = 0; i < size; i++) {
      const worker = new WorkerCtor()
      this.workers.push(worker)
      this.wrapped.push(comlinkWrap<T>(worker))
      this.#outstanding.push(0)
    }
  }

  acquire(): { worker: Remote<T>; index: number } {
    let minIndex = 0
    for (let i = 1; i < this.#outstanding.length; i++) {
      if (this.#outstanding[i] < this.#outstanding[minIndex]) minIndex = i
    }
    this.#outstanding[minIndex]++
    return { worker: this.wrapped[minIndex], index: minIndex }
  }

  release(index: number) {
    this.#outstanding[index] = Math.max(0, this.#outstanding[index] - 1)
  }

  destroy() {
    this.workers.forEach((w) => w.terminate())
  }
}
