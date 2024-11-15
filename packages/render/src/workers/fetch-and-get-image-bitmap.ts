import { expose } from 'comlink'

import { fetchUrl } from '@allmaps/stdlib'

import type { FetchFn } from '@allmaps/types'

const fetchAndGetImageBitmapWorker = {
  async getImageBitmap(
    tileUrl: string,
    abortControllerSignal: AbortSignal,
    fetchFn: FetchFn | undefined,
    width: number,
    height: number
  ): Promise<ImageBitmap> {
    const workerAbortController = new AbortController()

    abortControllerSignal.onabort = () => {
      workerAbortController.abort()
    }

    const response = await fetchUrl(
      tileUrl,
      {
        signal: workerAbortController.signal
      },
      fetchFn
    )

    const blob = await response.blob()

    const imageBitmap = await createImageBitmap(blob, 0, 0, width, height)

    return imageBitmap
  }
}

expose(fetchAndGetImageBitmapWorker)

export type FetchAndGetImageBitmapWorkerType =
  typeof fetchAndGetImageBitmapWorker
