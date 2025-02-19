import { expose, transfer } from 'comlink'

import { fetchUrl } from '@allmaps/stdlib'

import type { FetchFn } from '@allmaps/types'

const fetchAndGetImageDataWorker = {
  async getImageData(
    tileUrl: string,
    onAbort: () => void, // Define as a no-arguments function
    fetchFn: FetchFn | undefined,
    width: number,
    height: number
  ): Promise<ImageData> {
    const workerAbortController = new AbortController()

    // Connect the abort signal with a listener
    onAbort()

    const response = await fetchUrl(
      tileUrl,
      {
        signal: workerAbortController.signal
      },
      fetchFn
    )

    const blob = await response.blob()

    const imageBitmap = await createImageBitmap(blob, 0, 0, width, height)

    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Could not create OffscreenCanvas context')
    }

    context.drawImage(imageBitmap, 0, 0)
    const imageData = context.getImageData(0, 0, width, height)

    return transfer(imageData, [imageData.data.buffer])
  }
}

expose(fetchAndGetImageDataWorker)

export type FetchAndGetImageDataWorkerType = typeof fetchAndGetImageDataWorker
