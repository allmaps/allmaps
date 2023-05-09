import { expose } from 'comlink'

class TestWorker {
  calculateNumber() {
    return Math.random()
  }

  async fetch(url: string) {
    return fetch(url).then((response) => response.json())
  }
}

expose(TestWorker)

export type TestWorkerType = typeof TestWorker
