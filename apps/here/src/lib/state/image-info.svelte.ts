import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchImageInfo } from '@allmaps/stdlib'

import type { FetchedImageInfo } from '$lib/shared/types.ts'

const IMAGE_INFO_KEY = Symbol('image-info')

export class ImageInfoState {
  #imageInfoByUrl = new SvelteMap<string, FetchedImageInfo>()

  async fetchImageInfo(imageUri: string) {
    const existingFetchedImageInfo = this.#imageInfoByUrl.get(imageUri)
    if (existingFetchedImageInfo) {
      return existingFetchedImageInfo
    }

    this.#imageInfoByUrl.set(imageUri, { state: 'fetching' })

    let fetchedImageInfo: FetchedImageInfo

    try {
      const imageInfo = await fetchImageInfo(imageUri)

      fetchedImageInfo = {
        state: 'success',
        imageInfo
      }
    } catch (err) {
      fetchedImageInfo = {
        state: 'error',
        error: err instanceof Error ? err : new Error('Unknown error')
      }
    }

    this.#imageInfoByUrl.set(imageUri, fetchedImageInfo)

    return fetchedImageInfo
  }

  get imageInfoByUrl() {
    return this.#imageInfoByUrl
  }

  has(imageUri: string) {
    return this.#imageInfoByUrl.has(imageUri)
  }

  get(imageUri: string) {
    return this.#imageInfoByUrl.get(imageUri)
  }
}

export function setImageInfoState() {
  return setContext(IMAGE_INFO_KEY, new ImageInfoState())
}

export function getImageInfoState() {
  const imageInfoState =
    getContext<ReturnType<typeof setImageInfoState>>(IMAGE_INFO_KEY)

  if (!imageInfoState) {
    throw new Error('ImageInfoState is not set')
  }

  return imageInfoState
}
