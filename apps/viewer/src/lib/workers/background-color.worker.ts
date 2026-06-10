import { expose } from 'comlink'

import { detectBackgroundColor } from '@allmaps/background-color'

import type { Ring, Size } from '@allmaps/types'

const backgroundColorWorker = {
  computeBackgroundColor(
    resourceSize: Size,
    imageBitmap: ImageBitmap,
    resourceMask?: Ring
  ): [number, number, number] {
    const color = detectBackgroundColor(resourceSize, imageBitmap, resourceMask)
    imageBitmap.close()
    return color
  }
}

expose(backgroundColorWorker)

export type BackgroundColorWorkerType = typeof backgroundColorWorker
