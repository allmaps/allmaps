import { browser } from '$app/environment'

import * as Comlink from 'comlink'

import DetectBackgroundColorWorker from '$lib/shared/workers/detect-background-color.js?worker'
import type { DetectBackgroundColorWorkerType } from '$lib/shared/workers/detect-background-color.js'

import type { Map } from '@allmaps/annotation'

export let detectBackgroundColor: (
  map: Map,
  imageBitmap: ImageBitmap
) => Promise<string | undefined> = async () => {
  console.warn('Detect background Web Worker not yet initialized')
  return undefined
}

async function initialize() {
  const worker = new DetectBackgroundColorWorker()
  const instance = Comlink.wrap<DetectBackgroundColorWorkerType>(worker)

  const localInstance = await new instance()

  detectBackgroundColor = localInstance.detectBackgroundColor
}

if (browser) {
  initialize()
}
