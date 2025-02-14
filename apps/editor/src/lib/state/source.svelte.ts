import { setContext, getContext } from 'svelte'
import { SvelteMap } from 'svelte/reactivity'

import { fetchJson } from '@allmaps/stdlib'
import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'
import { generateId } from '@allmaps/id'

import { UrlState } from '$lib/state/url.svelte'
import { ErrorState } from '$lib/state/error.svelte'

import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage,
  Canvas as IIIFCanvas,
  Collection as IIIFCollection
} from '@allmaps/iiif-parser'
import type { GeoreferencedMap } from '@allmaps/annotation'

import type { Source, SourceType } from '$lib/types/shared.js'

import { PUBLIC_ALLMAPS_ANNOTATIONS_API_URL } from '$env/static/public'

type PartOf = GeoreferencedMap['resource']['partOf']

type PartOfItem = {
  id: string
  type: string
}

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #urlState: UrlState
  #errorState: ErrorState

  #source = $state<Source>()

  #loading = $state(false)

  #imagesByImageId = $state<SvelteMap<string, IIIFImage | EmbeddedIIIFImage>>(
    new SvelteMap()
  )

  #imageCount = $derived(this.#imagesByImageId.size)

  #canvasesByImageId = $state<SvelteMap<string, IIIFCanvas>>(new SvelteMap())
  #allmapsIdsByImageId = $state<SvelteMap<string, string>>(new SvelteMap())

  constructor(urlState: UrlState, errorState: ErrorState) {
    this.#urlState = urlState
    this.#errorState = errorState

    $effect(() => {
      const url = urlState.url

      this.#reset()

      if (url) {
        this.#load(url)
      }
    })
  }

  get imagesByImageId() {
    return this.#imagesByImageId
  }

  async fetchImageInfo(imageId: string) {
    if (this.#source?.type === 'manifest') {
      const canvas = this.getCanvasByImageId(imageId)
      const image = canvas?.image

      if (image?.embedded) {
        const fetchedImage =
          await this.#source.parsedIiif.fetchImageByUri(imageId)

        if (fetchedImage) {
          if (imageId === fetchedImage.uri) {
            this.#imagesByImageId.set(imageId, fetchedImage)
          } else {
            console.warn("Image IDs don't match:", imageId, fetchedImage.uri)

            this.#imagesByImageId.delete(imageId)
            this.#imagesByImageId.set(fetchedImage.uri, fetchedImage)
            // TODO: update #canvasesByImageId

            this.#allmapsIdsByImageId.set(
              fetchedImage.uri,
              await generateId(fetchedImage.uri)
            )
          }
        }
      }
    }
  }

  async #fetchCollectionManifestsAndAddImages(parsedIiif: IIIFCollection) {
    for await (const next of parsedIiif.fetchNext({
      fetchCollections: true,
      fetchManifests: true,
      fetchImages: false
    })) {
      if (next.item.type === 'manifest') {
        for (const canvas of next.item.canvases) {
          this.#imagesByImageId.set(canvas.image.uri, canvas.image)
          this.#canvasesByImageId.set(canvas.image.uri, canvas)
          this.#allmapsIdsByImageId.set(
            canvas.image.uri,
            await generateId(canvas.image.uri)
          )
        }
      }
    }
  }

  // callbackProject: (state) => {
  //   if (!state.callback) {
  //     return
  //   }

  //   for (let project of state.projects) {
  //     for (let hostname of project.hostnames) {
  //       const url = new URL(state.callback)
  //       if (url.hostname === hostname) {
  //         return project.label
  //       }
  //     }
  //   }
  // },

  async #loadIiif(url: string, sourceIiif: unknown) {
    const parsedIiif = IIIF.parse(sourceIiif)

    let sourceType: SourceType

    const baseSource = {
      url,
      allmapsId: await generateId(parsedIiif.uri),
      sourceIiif
    }

    let source: Source

    if (parsedIiif.type === 'collection') {
      sourceType = 'collection'
      await this.#fetchCollectionManifestsAndAddImages(parsedIiif)

      source = {
        ...baseSource,
        type: sourceType,
        parsedIiif
      }
    } else if (parsedIiif.type === 'manifest') {
      sourceType = 'manifest'
      for (const canvas of parsedIiif.canvases) {
        this.#imagesByImageId.set(canvas.image.uri, canvas.image)
        this.#canvasesByImageId.set(canvas.image.uri, canvas)
        this.#allmapsIdsByImageId.set(
          canvas.image.uri,
          await generateId(canvas.image.uri)
        )
      }

      source = {
        ...baseSource,
        type: sourceType,
        parsedIiif
      }
    } else if (parsedIiif.type === 'image') {
      sourceType = 'image'
      this.#imagesByImageId.set(parsedIiif.uri, parsedIiif)
      this.#allmapsIdsByImageId.set(
        parsedIiif.uri,
        await generateId(parsedIiif.uri)
      )

      source = {
        ...baseSource,
        type: sourceType,
        parsedIiif
      }
    } else {
      throw new Error('Unknown IIIF type')
    }

    this.#source = source
  }

  *#flattenPartOf(partOf?: PartOf): Generator<PartOfItem> {
    if (partOf) {
      for (const partOfItem of partOf) {
        yield partOfItem
        if (partOfItem.partOf) {
          yield* this.#flattenPartOf(partOfItem.partOf)
        }
      }
    }
  }

  async #loadGeoreferenceAnnotation(sourceAnnotation: unknown) {
    const maps = parseAnnotation(sourceAnnotation)

    // TODO: load multiple maps!
    const map = maps[0]

    const partOfs = [...this.#flattenPartOf(map.resource.partOf)]

    const manifestPartOf = partOfs.find((partOf) => partOf.type === 'Manifest')

    // TODO: also support Canvases
    if (manifestPartOf) {
      await this.#load(manifestPartOf.id)
    } else {
      await this.#load(map.resource.id)
    }
  }

  async #load(url: string) {
    this.#errorState.error = null

    try {
      const sourceData = await fetchJson(url)

      if (
        sourceData &&
        typeof sourceData === 'object' &&
        'type' in sourceData &&
        typeof sourceData.type === 'string' &&
        ['Annotation', 'AnnotationPage'].includes(sourceData.type)
      ) {
        if (url.startsWith(PUBLIC_ALLMAPS_ANNOTATIONS_API_URL)) {
          await this.#loadGeoreferenceAnnotation(sourceData)
        } else {
          throw new Error(
            'Only Georeference Annotations loaded from Allmaps are supported'
          )
        }
      } else {
        await this.#loadIiif(url, sourceData)
      }
    } catch (err) {
      this.#errorState.error = err
      this.#reset()
    } finally {
      this.#loading = false
    }
  }

  #isImageIdValid(imageId: string | null) {
    if (!imageId) {
      return false
    }

    return this.#imagesByImageId.has(imageId)
  }

  #reset() {
    this.#loading = false
    this.#source = undefined
    this.#imagesByImageId = new SvelteMap()
    this.#canvasesByImageId = new SvelteMap()
    this.#allmapsIdsByImageId = new SvelteMap()
  }

  get source() {
    return this.#source
  }

  get url() {
    return this.#source?.url
  }

  get images() {
    return this.#imagesByImageId.values()
  }

  get imageCount() {
    return this.#imageCount
  }

  get loading() {
    return this.#loading
  }

  get label() {
    if (
      this.#source &&
      this.#source.parsedIiif &&
      'label' in this.#source.parsedIiif
    ) {
      return this.#source.parsedIiif.label
    }
  }

  get navPlace() {
    // TODO: read navPlace from correct IIIF resource
    // Either Canvas or Manifest or Collection
    if (
      this.#source &&
      this.#source.parsedIiif &&
      'navPlace' in this.#source.parsedIiif
    ) {
      return this.#source.parsedIiif.navPlace
    }
  }

  get activeImageId() {
    if (this.#isImageIdValid(this.#urlState.imageId)) {
      return this.#urlState.imageId
    }

    const imagesArray = [...this.images]
    const firstImage = imagesArray[0]

    if (firstImage) {
      return firstImage.uri
    }
  }

  get activeImageIndex(): number | undefined {
    const imagesArray = [...this.images]

    const index = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    return index > -1 ? index : undefined
  }

  get activeImage() {
    if (this.activeImageId) {
      return this.#imagesByImageId.get(this.activeImageId)
    }
  }

  get activeCanvas() {
    if (this.activeImageId) {
      return this.#canvasesByImageId.get(this.activeImageId)
    }
  }

  get activeImageAllmapsId() {
    if (this.activeImageId) {
      return this.#allmapsIdsByImageId.get(this.activeImageId)
    }
  }

  getPreviousActiveImageId() {
    const imagesArray = [...this.images]

    const activeImageIndex = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    if (activeImageIndex > -1) {
      const previousImage =
        imagesArray[
          (activeImageIndex - 1 + imagesArray.length) % imagesArray.length
        ]

      return previousImage.uri
    }
  }

  getNextActiveImageId() {
    const imagesArray = [...this.images]

    const activeImageIndex = imagesArray.findIndex(
      (image) => image.uri === this.activeImageId
    )

    if (activeImageIndex > -1) {
      const nextImage = imagesArray[(activeImageIndex + 1) % imagesArray.length]

      return nextImage.uri
    }
  }

  getCanvasByImageId(imageId: string) {
    return this.#canvasesByImageId.get(imageId)
  }
}

export function setSourceState(urlState: UrlState, errorState: ErrorState) {
  return setContext(SOURCE_KEY, new SourceState(urlState, errorState))
}

export function getSourceState() {
  const sourceState = getContext<ReturnType<typeof setSourceState>>(SOURCE_KEY)

  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
