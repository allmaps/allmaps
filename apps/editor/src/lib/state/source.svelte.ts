import { setContext, getContext } from 'svelte'

import { IIIF, Manifest as IIIFManifest } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'

import { UrlState } from '$lib/state/url.svelte'
import { ErrorState } from '$lib/state/error.svelte'

import { searchParams } from '$lib/shared/params.js'
import { superFetch } from '$lib/shared/fetch.js'
import { generateId } from '$lib/shared/ids.js'
import { parseLanguageString } from '$lib/shared/iiif.js'

import type {
  Image as IIIFImage,
  EmbeddedImage as EmbeddedIIIFImage,
  Canvas as IIIFCanvas
} from '@allmaps/iiif-parser'
import type { PartOf, PartOfItem } from '@allmaps/annotation'

import type {
  ImageSource,
  ManifestSource,
  Source,
  CollectionPath,
  Breadcrumb,
  IIIFResource
} from '$lib/types/shared.js'

import { PUBLIC_ALLMAPS_ANNOTATIONS_API_URL } from '$env/static/public'

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #urlState: UrlState<typeof searchParams>
  #errorState: ErrorState

  #source = $state<Source>()

  #abortController: AbortController | undefined

  #parsedManifest = $derived.by<IIIFManifest | undefined>(() => {
    // Update this derived when fetching states change
    this.#fetchingInsideCollection

    if (this.#source && this.#source.type === 'manifest') {
      return this.#source.parsedIiif
    } else if (
      this.#source &&
      this.#source.type === 'collection' &&
      this.#urlState.params.manifestId
    ) {
      const parsedIiifAtPath = this.#parsedIiifAtPath

      // TODO: check if parsedIiif.uri === this.#urlState.params.manifestId
      if (
        parsedIiifAtPath?.type === 'manifest' &&
        !parsedIiifAtPath.embedded &&
        parsedIiifAtPath instanceof IIIFManifest
      ) {
        return parsedIiifAtPath
      }
    }
  })

  #manifestImageIdsDontMatch = $state(false)

  #editSource = $derived.by<ManifestSource | ImageSource | undefined>(() => {
    const sourceType = this.#source?.type
    if (sourceType === 'manifest' || sourceType === 'image') {
      return this.#source
    } else if (sourceType === 'collection' && this.#parsedManifest) {
      return {
        url: this.#parsedManifest.uri,
        allmapsId: generateId(this.#parsedManifest.uri),
        sourceIiif: this.#parsedManifest.source,
        type: 'manifest',
        parsedIiif: this.#parsedManifest
      }
    }
  })

  #fetching = $state(false)
  #fetchingInsideCollection = $state(false)

  #imagesByImageId = $derived.by<Map<string, IIIFImage | EmbeddedIIIFImage>>(
    () => {
      const sourceType = this.#editSource?.type

      if (sourceType === 'manifest') {
        const canvases = this.#editSource?.parsedIiif.canvases || []
        return new Map(
          canvases.map((canvas) => [canvas.image.uri, canvas.image])
        )
      } else if (sourceType === 'image') {
        const parsedIiif = this.#editSource?.parsedIiif

        if (parsedIiif) {
          return new Map([[parsedIiif.uri, parsedIiif]])
        }
      }

      return new Map()
    }
  )

  #canvasesByImageId = $derived.by<Map<string, IIIFCanvas>>(() => {
    const sourceType = this.#editSource?.type

    if (sourceType === 'manifest') {
      const canvases = this.#editSource?.parsedIiif.canvases || []
      return new Map(canvases.map((canvas) => [canvas.image.uri, canvas]))
    }

    return new Map()
  })

  #allmapsIdsByImageId = $derived.by<Map<string, string>>(() => {
    const sourceType = this.#editSource?.type

    if (sourceType === 'manifest') {
      const canvases = this.#editSource?.parsedIiif.canvases || []
      return new Map(
        canvases.map((canvas) => [
          canvas.image.uri,
          generateId(canvas.image.uri)
        ])
      )
    } else if (sourceType === 'image') {
      const parsedIiif = this.#editSource?.parsedIiif
      if (parsedIiif) {
        return new Map([[parsedIiif.uri, generateId(parsedIiif.uri)]])
      }
    }

    return new Map()
  })

  #breadcrumbs = $derived.by<Breadcrumb[]>(() => {
    const crumbs: Breadcrumb[] = []

    for (let i = 0; i <= this.#urlState.params.path.length; i++) {
      const path = this.#urlState.params.path.slice(0, i)
      const parsedIiifAtPath = this.#getParsedIiifAtPath(path)

      let label: string | undefined

      if (
        parsedIiifAtPath &&
        ['collection', 'manifest'].includes(parsedIiifAtPath.type)
      ) {
        if ('label' in parsedIiifAtPath) {
          label = parseLanguageString(parsedIiifAtPath.label)
        }

        crumbs.push({
          label,
          path,
          type: parsedIiifAtPath.type,
          id: parsedIiifAtPath.uri
        })
      }
    }

    return crumbs
  })

  #parsedIiifAtPath = $derived.by<IIIFResource | undefined>(() => {
    // Update this derived when fetching states change
    this.#fetchingInsideCollection

    return this.#getParsedIiifAtPath(this.#urlState.params.path)
  })

  #parsedIiifParents = $derived.by<IIIFResource[]>(() => {
    // Update this derived when fetching states change
    this.#fetchingInsideCollection

    const parents: IIIFResource[] = []
    let currentPath: CollectionPath = []

    for (let i = 0; i < this.#urlState.params.path.length; i++) {
      currentPath = this.#urlState.params.path.slice(0, i)
      const parsedIiifAtPath = this.#getParsedIiifAtPath(currentPath)

      if (parsedIiifAtPath) {
        parents.push(parsedIiifAtPath)
      }
    }

    return parents
  })

  #imageCount = $derived(this.#imagesByImageId.size)

  constructor(urlState: UrlState<typeof searchParams>, errorState: ErrorState) {
    this.#urlState = urlState
    this.#errorState = errorState

    $effect(() => {
      const newUrl = urlState.params.url

      if (newUrl) {
        const currentSourceUrl = this.#source?.url
        if (!currentSourceUrl || currentSourceUrl !== newUrl) {
          this.#fetch(newUrl)
        }
      } else {
        this.#reset()
      }
    })

    $effect(() => {
      this.#fetchingInsideCollection = true

      const parsedIiif = this.#source?.parsedIiif
      if (
        parsedIiif &&
        parsedIiif.type === 'collection' &&
        'items' in parsedIiif
      ) {
        parsedIiif
          .fetchUntilPath(this.#urlState.params.path.map(({ index }) => index))
          .finally(() => (this.#fetchingInsideCollection = false))
      }
    })
  }

  async fetchImageInfo(imageId: string) {
    // TODO: run fetch function in parsedManifest or parsedCollection
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

            // this.#manifestImageIdsDontMatch = true
          }
        }
      }
    }
  }

  #getParsedIiifAtPath(path: CollectionPath) {
    if (this.#source && this.#source.type === 'collection') {
      return this.#source?.parsedIiif.getItemAtPath(
        path.map(({ index }) => index)
      )
    }
  }

  async #fetchIiif(url: string, sourceIiif: unknown) {
    let parsedIiif = IIIF.parse(sourceIiif, {
      keepSource: true
    })

    const baseSource = {
      url,
      allmapsId: generateId(parsedIiif.uri),
      sourceIiif
    }

    let source: Source

    if (parsedIiif.type === 'collection') {
      if (this.#urlState.params.path) {
        await parsedIiif.fetchUntilPath(
          this.#urlState.params.path.map(({ index }) => index)
        )
      }

      source = {
        ...baseSource,
        type: 'collection',
        parsedIiif
      }
    } else if (parsedIiif.type === 'manifest') {
      source = {
        ...baseSource,
        type: 'manifest',
        parsedIiif
      }
    } else if (parsedIiif.type === 'image') {
      source = {
        ...baseSource,
        type: 'image',
        parsedIiif
      }
    } else {
      this.#reset()
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
      await this.#fetch(manifestPartOf.id)
    } else {
      await this.#fetch(map.resource.id)
    }
  }

  async #fetch(url: string) {
    if (this.#abortController) {
      this.#abortController.abort()
    }

    this.#abortController = new AbortController()

    this.#fetching = true
    this.#errorState.error = null

    try {
      const sourceData = await superFetch(url, {
        signal: this.#abortController.signal
      })

      this.#abortController = undefined

      if (
        sourceData &&
        typeof sourceData === 'object' &&
        'type' in sourceData &&
        typeof sourceData.type === 'string' &&
        ['Annotation', 'AnnotationPage'].includes(sourceData.type)
      ) {
        if (url.startsWith(PUBLIC_ALLMAPS_ANNOTATIONS_API_URL)) {
          // TODO: show message, Allmaps doesn't use georeference data from annotation
          // but loads from API
          await this.#loadGeoreferenceAnnotation(sourceData)
        } else {
          throw new Error(
            'Only Georeference Annotations loaded from Allmaps are supported'
          )
        }
      } else {
        await this.#fetchIiif(url, sourceData)
      }
    } catch (err) {
      this.#errorState.error = err
      this.#reset()
    } finally {
      this.#fetching = false
    }
  }

  #isImageIdValid(imageId?: string) {
    if (!imageId) {
      return false
    }

    return this.#imagesByImageId.has(imageId)
  }

  #reset() {
    this.#fetching = false
    this.#fetchingInsideCollection = false
    this.#source = undefined
  }

  get imagesByImageId() {
    return this.#imagesByImageId
  }

  get source() {
    return this.#source
  }
  get parsedIiif() {
    return this.#source?.parsedIiif
  }

  get parsedManifest() {
    return this.#parsedManifest
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

  get fetching() {
    return this.#fetching
  }

  get fetchingInsideCollection() {
    return this.#fetchingInsideCollection
  }

  set fetchingInsideCollection(value: boolean) {
    this.#fetchingInsideCollection = value
  }

  // get label() {
  //   if (
  //     this.#source &&
  //     this.#source.parsedIiif &&
  //     'label' in this.#source.parsedIiif
  //   ) {
  //     return this.#source.parsedIiif.label
  //   }
  // }

  get navPlace() {
    // TODO: read navPlace from correct IIIF resource
    // Either Canvas or Manifest or Collection
    if (
      this.#source &&
      this.#source.parsedIiif &&
      'navPlace' in this.#source.parsedIiif
    ) {
      // TODO get first navplace

      return this.#source.parsedIiif.navPlace
    }
  }

  get canEdit() {
    return this.#editSource !== undefined
  }

  get parsedIiifAtPath() {
    return this.#parsedIiifAtPath
  }

  get activeImageId() {
    if (this.#fetching) {
      return
    }

    if (
      this.#isImageIdValid(this.#urlState.params.imageId) &&
      this.#urlState.params.imageId
    ) {
      return this.#urlState.params.imageId
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

  get breadcrumbs() {
    return this.#breadcrumbs
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

export function setSourceState(
  urlState: UrlState<typeof searchParams>,
  errorState: ErrorState
) {
  return setContext(SOURCE_KEY, new SourceState(urlState, errorState))
}

export function getSourceState() {
  const sourceState = getContext<ReturnType<typeof setSourceState>>(SOURCE_KEY)

  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
