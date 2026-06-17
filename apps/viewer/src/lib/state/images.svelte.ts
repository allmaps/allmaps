import { setContext, getContext } from 'svelte'
import { SvelteSet, SvelteMap } from 'svelte/reactivity'

import { ResourceFetchError, fetchImageBitmap } from '@allmaps/stdlib'

import type { Image as IIIFImage } from '@allmaps/iiif-parser'
import type { ImageRequest } from '@allmaps/types'

import type { MapsState } from '$lib/state/maps.svelte.js'

const IMAGES_KEY = Symbol('images')

export type ImageErrorKind =
  | 'network-or-cors'
  | 'http'
  | 'parse'
  | 'unknown'

export type ImageErrorSource = 'info-json' | 'tile'

type BaseImageError = {
  imageId: string
  source: ImageErrorSource
  kind: ImageErrorKind
  corsLikely: boolean
  status?: number
  message: string
  error: Error
}

export type ImageInfoError = BaseImageError & {
  source: 'info-json'
  imageInfoUrl?: string
}

export type ImageTileError = BaseImageError & {
  source: 'tile'
  tileUrl: string
}

export type ImageError = ImageInfoError | ImageTileError

type ImageErrorOptions = {
  imageInfoUrl?: string
  tileUrl?: string
  kind?: string
  corsLikely?: boolean
  status?: number
}

function normalizeImageErrorKind(kind?: string): ImageErrorKind {
  if (kind === 'network-or-cors' || kind === 'http' || kind === 'parse') {
    return kind
  }

  return 'unknown'
}

export class ImagesState {
  #mapsState: MapsState

  #fetchingThumbnailsPaused = $state(false)

  #sourceImageIds = $derived.by(() => {
    const imageIds = new SvelteSet<string>()
    this.#mapsState.maps.forEach((map) => {
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
  #imageInfoErrors = $state(new SvelteMap<string, ImageInfoError>())
  #imageTileErrors = $state(
    new SvelteMap<string, SvelteMap<string, ImageTileError>>()
  )
  #fetchingIds = new Set<string>()

  constructor(mapsState: MapsState, fetchingThumbnailsPaused = true) {
    this.#mapsState = mapsState
    this.#fetchingThumbnailsPaused = fetchingThumbnailsPaused

    $effect(() => {
      const sourceImageIds = this.#sourceImageIds

      for (const imageId of this.#imageInfoErrors.keys()) {
        if (!sourceImageIds.has(imageId)) {
          this.#imageInfoErrors.delete(imageId)
        }
      }

      for (const imageId of this.#imageTileErrors.keys()) {
        if (!sourceImageIds.has(imageId)) {
          this.#imageTileErrors.delete(imageId)
        }
      }

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
    const thumbnailSize = { width: 512, height: 512 }
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

  get imageInfoErrors() {
    return this.#imageInfoErrors
  }

  get imageTileErrors() {
    return this.#imageTileErrors
  }

  get imageErrors() {
    const imageErrors = new Map<string, ImageError>()

    for (const [imageId, imageInfoError] of this.#imageInfoErrors) {
      imageErrors.set(imageId, imageInfoError)
    }

    for (const [imageId, tileErrors] of this.#imageTileErrors) {
      if (imageErrors.has(imageId)) {
        continue
      }

      const tileError = tileErrors.values().next().value
      if (tileError) {
        imageErrors.set(imageId, tileError)
      }
    }

    return imageErrors
  }

  get failedImageIds() {
    return [...this.imageErrors.keys()]
  }

  get imageErrorCount() {
    return this.imageErrors.size
  }

  get sourceImageCount() {
    return this.#sourceImageIds.size
  }

  get allSourceImagesFailed() {
    return (
      this.sourceImageCount > 0 &&
      this.imageErrorCount === this.sourceImageCount
    )
  }

  get someSourceImagesFailed() {
    return this.imageErrorCount > 0
  }

  getImageError(imageId: string) {
    return this.imageErrors.get(imageId)
  }

  getImageErrors(imageId: string) {
    return [
      this.#imageInfoErrors.get(imageId),
      ...Array.from(this.#imageTileErrors.get(imageId)?.values() ?? [])
    ].filter((error): error is ImageError => error !== undefined)
  }

  getImageTileErrors(imageId: string) {
    return [...(this.#imageTileErrors.get(imageId)?.values() ?? [])]
  }

  getImageTileErrorCount(imageId: string) {
    return this.#imageTileErrors.get(imageId)?.size ?? 0
  }

  getFirstImageTileError(imageId: string) {
    return this.#imageTileErrors.get(imageId)?.values().next().value
  }

  hasImageTileErrors(imageId: string) {
    return this.getImageTileErrorCount(imageId) > 0
  }

  hasAnyImageErrors(imageId: string) {
    return this.getImageError(imageId) !== undefined
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
      this.#imageInfoErrors.delete(imageId)
      changed = true
    }

    if (changed) {
      this.#parsedImagesRevision += 1
    }
  }

  addImageInfoError(
    imageId: string,
    error: Error,
    options: ImageErrorOptions = {}
  ) {
    const resourceFetchError =
      error instanceof ResourceFetchError ? error : undefined

    this.#imageInfoErrors.set(imageId, {
      imageId,
      source: 'info-json',
      imageInfoUrl: options.imageInfoUrl,
      kind: normalizeImageErrorKind(options.kind ?? resourceFetchError?.kind),
      corsLikely: options.corsLikely ?? resourceFetchError?.corsLikely ?? false,
      status: options.status ?? resourceFetchError?.status,
      message: error.message,
      error
    })
  }

  addImageTileError(
    imageId: string,
    error: Error,
    options: ImageErrorOptions = {}
  ) {
    const tileUrl = options.tileUrl
    if (!tileUrl) {
      return
    }

    const resourceFetchError =
      error instanceof ResourceFetchError ? error : undefined
    let tileErrors = this.#imageTileErrors.get(imageId)
    if (!tileErrors) {
      tileErrors = new SvelteMap<string, ImageTileError>()
      this.#imageTileErrors.set(imageId, tileErrors)
    }

    tileErrors.set(tileUrl, {
      imageId,
      source: 'tile',
      tileUrl,
      kind: normalizeImageErrorKind(options.kind ?? resourceFetchError?.kind),
      corsLikely: options.corsLikely ?? resourceFetchError?.corsLikely ?? false,
      status: options.status ?? resourceFetchError?.status,
      message: error.message,
      error
    })
  }

  pauseFetchingThumbnails() {
    this.#fetchingThumbnailsPaused = true
  }

  resumeFetchingThumbnails() {
    this.#fetchingThumbnailsPaused = false
  }
}

export function setImagesState(
  mapsState: MapsState,
  fetchingThumbnailsPaused?: boolean
) {
  return setContext(
    IMAGES_KEY,
    new ImagesState(mapsState, fetchingThumbnailsPaused)
  )
}

export function getImagesState() {
  const imagesState = getContext<ImagesState>(IMAGES_KEY)
  if (!imagesState) {
    throw new Error('ImagesState is not set')
  }

  return imagesState
}
