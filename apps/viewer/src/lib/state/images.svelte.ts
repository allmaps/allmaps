import { setContext, getContext } from 'svelte'
import { SvelteSet, SvelteMap } from 'svelte/reactivity'

import { fetchImageBitmap } from '@allmaps/stdlib'

import type { Image as IIIFImage } from '@allmaps/iiif-parser'
import type { ImageRequest } from '@allmaps/types'

import type { SourceState } from '$lib/state/source.svelte.js'

const IMAGES_KEY = Symbol('images')
// type ImageInfoJson = Awaited<ReturnType<typeof fetchImageInfo>>

export class ImagesState {
  #sourceState: SourceState

  #fetchingThumbnailsPaused = $state(false)

  #sourceImageIds = $derived.by(() => {
    const imageIds = new SvelteSet<string>()
    this.#sourceState.maps.forEach((map) => {
      imageIds.add(map.resource.id)
    })

    return imageIds
  })

  #parsedImages = new Map<string, IIIFImage>()
  #parsedImagesRevision = $state(0)

  #parsedImagesBySourceImageId = $derived.by(() => {
    // eslint-disable-next-line
    this.#parsedImagesRevision

    const parsedImages = new Map<string, IIIFImage>()
    for (const imageId of this.#sourceImageIds) {
      const parsedImage = this.#parsedImages.get(imageId)
      if (parsedImage) {
        parsedImages.set(imageId, parsedImage)
      }
    }

    return parsedImages
  })

  #thumbnails = $state(new SvelteMap<string, ImageBitmap>())
  #fetchingIds = new Set<string>()

  constructor(sourceState: SourceState, fetchingThumbnailsPaused = true) {
    this.#sourceState = sourceState
    this.#fetchingThumbnailsPaused = fetchingThumbnailsPaused

    $effect(() => {
      if (this.#fetchingThumbnailsPaused) {
        return
      }

      const currentIds = new Set(this.#parsedImagesBySourceImageId.keys())

      for (const imageId of this.#thumbnails.keys()) {
        if (!currentIds.has(imageId)) {
          this.#thumbnails.get(imageId)?.close()
          this.#thumbnails.delete(imageId)
        }
      }

      for (const [imageId, parsedImage] of this.#parsedImagesBySourceImageId) {
        if (this.#thumbnails.has(imageId) || this.#fetchingIds.has(imageId)) {
          continue
        }
        this.#fetchThumbnailFor(imageId, parsedImage)
      }
    })
  }

  async #fetchThumbnailFor(imageId: string, parsedImage: IIIFImage) {
    this.#fetchingIds.add(imageId)
    const thumbnailSize = { width: 256, height: 256 }
    try {
      const imageRequest = parsedImage.getImageRequest(thumbnailSize)

      const bitmap = Array.isArray(imageRequest)
        ? await this.#fetchTiledThumbnail(parsedImage, imageRequest)
        : await fetchImageBitmap(
            parsedImage.getImageUrl(imageRequest, {
              preferredFormats: ['webp', 'jpg']
            })
          )

      if (this.#parsedImagesBySourceImageId.has(imageId)) {
        this.#thumbnails.set(imageId, bitmap)
      } else {
        bitmap.close()
      }
    } catch (error) {
      console.warn(`Unable to fetch thumbnail for image ${imageId}:`, error)
    } finally {
      this.#fetchingIds.delete(imageId)
    }
  }

  async #fetchTiledThumbnail(
    parsedImage: IIIFImage,
    imageRequestGrid: ImageRequest[][]
  ) {
    if (imageRequestGrid.length === 0 || imageRequestGrid[0].length === 0) {
      throw new Error('Empty tiled image request')
    }

    const rowHeights = imageRequestGrid.map((row) => row[0].size?.height ?? 0)
    const totalHeight = rowHeights.reduce((sum, value) => sum + value, 0)

    const columnWidths = imageRequestGrid[0].map(
      (request) => request.size?.width ?? 0
    )
    const totalWidth = columnWidths.reduce((sum, value) => sum + value, 0)

    const canvas = new OffscreenCanvas(totalWidth, totalHeight)
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('Unable to create OffscreenCanvas rendering context')
    }

    let y = 0
    for (const row of imageRequestGrid) {
      let x = 0
      const rowHeight = row[0].size?.height ?? 0

      for (const imageRequest of row) {
        const tile = await fetchImageBitmap(
          parsedImage.getImageUrl(imageRequest)
        )
        ctx.drawImage(tile, x, y)
        x += imageRequest.size?.width ?? tile.width
      }

      y += rowHeight
    }

    return canvas.transferToImageBitmap()
  }

  get thumbnails() {
    return this.#thumbnails
  }

  addParsedImage(imageId: string, parsedImage: IIIFImage) {
    this.addParsedImages(new Map([[imageId, parsedImage]]))
  }

  addParsedImages(parsedImages: Map<string, IIIFImage>) {
    let changed = false

    for (const [imageId, parsedImage] of parsedImages) {
      if (this.#parsedImages.get(imageId) === parsedImage) {
        continue
      }

      this.#parsedImages.set(imageId, parsedImage)
      changed = true
    }

    if (changed) {
      this.#parsedImagesRevision += 1
    }
  }

  pauseFetchingThumbnails() {
    this.#fetchingThumbnailsPaused = true
  }

  resumeFetchingThumbnails() {
    this.#fetchingThumbnailsPaused = false
  }
}

export function setImagesState(
  sourceState: SourceState,
  fetchingThumbnailsPaused?: boolean
) {
  return setContext(
    IMAGES_KEY,
    new ImagesState(sourceState, fetchingThumbnailsPaused)
  )
}

export function getImagesState() {
  const imagesState = getContext<ImagesState>(IMAGES_KEY)
  if (!imagesState) {
    throw new Error('ImagesState is not set')
  }

  return imagesState
}
