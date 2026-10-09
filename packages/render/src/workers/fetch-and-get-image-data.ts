import { expose, transfer } from 'comlink'

import { fetchUrl } from '@allmaps/stdlib'

import type { FetchFn } from '@allmaps/types'

export const abortControllers = new Map<string, AbortController>()

export const fetchAndGetImageDataWorker = {
  async getImageData(
    tileUrl: string,
    fetchFn: FetchFn | undefined,
    width: number,
    height: number
  ): Promise<ImageData> {
    const abortController = new AbortController()
    const { signal } = abortController
    abortControllers.set(tileUrl, abortController)

    try {
      const response = await fetchUrl(tileUrl, { signal }, fetchFn)

      const blob = await response.blob()
      signal.throwIfAborted()

      const imageBitmap = await createImageBitmap(blob, 0, 0, width, height)

      try {
        signal.throwIfAborted()

        const canvas = new OffscreenCanvas(width, height)
        const context = canvas.getContext('2d')

        if (!context) {
          throw new Error('Could not create OffscreenCanvas context')
        }

        context.drawImage(imageBitmap, 0, 0)
        const imageData = context.getImageData(0, 0, width, height)

        return transfer(imageData, [imageData.data.buffer])
      } finally {
        imageBitmap.close()
      }
    } finally {
      // A later fetch for this url may own the entry now; deleting it then
      // would leave that fetch unabortable.
      if (abortControllers.get(tileUrl) === abortController) {
        abortControllers.delete(tileUrl)
      }
    }
  },

  /** Runs while getImageData is still awaiting: the worker is idle on I/O. */
  abort(tileUrl: string): void {
    abortControllers.get(tileUrl)?.abort()
  }
}

expose(fetchAndGetImageDataWorker)

export type FetchAndGetImageDataWorkerType = typeof fetchAndGetImageDataWorker
