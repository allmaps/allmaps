import { writable, get } from 'svelte/store'

import { fetchImageInfo } from '@allmaps/stdlib'

import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

export const imageInfos = writable<Map<string, ImageInformationResponse>>(
  new Map()
)

export async function addImageInfo(imageUri: string) {
  if (get(imageInfos).has(imageUri)) {
    return
  }

  const imageInfo = (await fetchImageInfo(imageUri)) as ImageInformationResponse
  imageInfos.update((imageInfos) => imageInfos.set(imageUri, imageInfo))
}
