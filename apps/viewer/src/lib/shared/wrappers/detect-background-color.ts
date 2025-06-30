import { browser } from '$app/environment'

import { wrap as comlinkWrap } from 'comlink'

import DetectBackgroundColorWorker from '$lib/shared/workers/detect-background-color.js?worker'
import type { DetectBackgroundColorWorkerType } from '$lib/shared/workers/detect-background-color.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

export let detectBackgroundColor: (
  map: GeoreferencedMap,
  imageData: ImageData
) => Promise<string | undefined> = async () => {
  console.warn('Detect background Web Worker not yet initialized')
  return undefined
}

async function initialize() {
  const worker = new DetectBackgroundColorWorker()
  const instance = comlinkWrap<DetectBackgroundColorWorkerType>(worker)

  const localInstance = await new instance()

  detectBackgroundColor = localInstance.detectBackgroundColor
}

if (browser) {
  initialize()
}
