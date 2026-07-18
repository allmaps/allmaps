import { expose, transfer } from 'comlink'

import { fetchUrl } from '@allmaps/stdlib'

import type { FetchFn } from '@allmaps/types'

const fetchAndGetImageBitmapWorker = {
  async getImageBitmap(
    tileUrl: string,
    onAbort: () => void, // Define as a no-arguments function
    fetchFn: FetchFn | undefined,
    width: number,
    height: number
  ): Promise<ImageBitmap> {
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

    // createImageBitmap decodes off the main thread and yields a GPU-uploadable
    // bitmap, avoiding the OffscreenCanvas getImageData() readback that the
    // ImageData worker needs. The bitmap is transferred (not cloned) back.
    const imageBitmap = await createImageBitmap(blob, 0, 0, width, height)

    return transfer(imageBitmap, [imageBitmap])
  }
}

expose(fetchAndGetImageBitmapWorker)

export type FetchAndGetImageBitmapWorkerType =
  typeof fetchAndGetImageBitmapWorker
