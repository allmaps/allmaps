import { page } from '$app/state'
import { getView } from '$lib/shared/router.js'
import { SvelteMap } from 'svelte/reactivity'
import { setContext, getContext } from 'svelte'

import { Image, IIIF, Manifest as IIIFManifest } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'

import type { UrlState } from '$lib/state/url.svelte.js'
import type { ErrorState } from '$lib/state/error.svelte.js'

import { searchParams } from '$lib/shared/params.js'
import { fetchManifestRecord, resolveEditorImage } from '$lib/shared/api.js'
import { superFetch } from '$lib/shared/fetch.js'
import { generateId } from '$lib/shared/ids.js'
import { parseLocalizedLanguageString } from '$lib/shared/iiif.js'

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

const SOURCE_KEY = Symbol('source')

export class SourceState {
  #apiBaseUrl: string
  #resolvedImages = new SvelteMap<string, IIIFImage>()
  #navigationUris = new SvelteMap<string, string>()
  #manifestServiceUris = new WeakMap<IIIFCanvas['image'], string>()
  #manifestImages = new WeakMap<IIIFManifest, Promise<void>>()
  #annotationsApiBaseUrl: string

  #urlState: UrlState<typeof searchParams>
  #errorState: ErrorState

  #source = $state<Source>()
  imageError = $state<Error>()
  #requestedUrl: string | undefined

  #abortController: AbortController | undefined

  #parsedManifest = $derived.by<IIIFManifest | undefined>(() => {
    // Update this derived when fetching states change
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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

  // #manifestImageIdsDontMatch = $state(false)

  #editSource = $derived.by<
    (Source & (ManifestSource | ImageSource)) | undefined
  >(() => {
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
          canvases.map((canvas) => {
            const image =
              this.#resolvedImages.get(canvas.image.uri) ?? canvas.image
            return [image.uri, image]
          })
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
      return new Map(
        canvases.map((canvas) => [
          this.#resolvedImages.get(canvas.image.uri)?.uri ?? canvas.image.uri,
          canvas
        ])
      )
    }

    return new Map()
  })

  #allmapsIdsByImageId = $derived.by<Map<string, string>>(() => {
    const sourceType = this.#editSource?.type

    if (sourceType === 'manifest') {
      const canvases = this.#editSource?.parsedIiif.canvases || []
      return new Map(
        canvases.map((canvas) => [
          this.#resolvedImages.get(canvas.image.uri)?.uri ?? canvas.image.uri,
          generateId(
            this.#resolvedImages.get(canvas.image.uri)?.uri ?? canvas.image.uri
          )
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
          label = parseLocalizedLanguageString(parsedIiifAtPath.label)
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
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.#fetchingInsideCollection

    return this.#getParsedIiifAtPath(this.#urlState.params.path)
  })

  // #parsedIiifParents = $derived.by<IIIFResource[]>(() => {
  //   // Update this derived when fetching states change
  //   this.#fetchingInsideCollection

  //   const parents: IIIFResource[] = []
  //   let currentPath: CollectionPath = []

  //   for (let i = 0; i < this.#urlState.params.path.length; i++) {
  //     currentPath = this.#urlState.params.path.slice(0, i)
  //     const parsedIiifAtPath = this.#getParsedIiifAtPath(currentPath)

  //     if (parsedIiifAtPath) {
  //       parents.push(parsedIiifAtPath)
  //     }
  //   }

  //   return parents
  // })

  #imageCount = $derived(this.#imagesByImageId.size)

  constructor(
    apiBaseUrl: string,
    annotationsApiBaseUrl: string,
    urlState: UrlState<typeof searchParams>,
    errorState: ErrorState
  ) {
    this.#apiBaseUrl = apiBaseUrl
    this.#annotationsApiBaseUrl = annotationsApiBaseUrl

    this.#urlState = urlState
    this.#errorState = errorState

    $effect(() => {
      const newUrl = urlState.params.url

      if (newUrl) {
        if (!this.#requestedUrl || this.#requestedUrl !== newUrl) {
          this.#fetch(newUrl)
        }
      } else {
        this.#reset()
      }
    })

    $effect(() => {
      const manifest = this.#parsedManifest
      const image = this.activeImage
      const view = getView(page)
      this.imageError = undefined
      if (!view || view === 'images' || !manifest || !image?.embedded) return
      let active = true
      this.#resolveCanvasImage(manifest, image)
        .then((resolved) => {
          if (active) {
            const original = this.#manifestServiceUris.get(image)
            if (original) this.#navigationUris.set(original, resolved.uri)
            for (const uri of image.serviceUris)
              this.#navigationUris.set(uri, resolved.uri)
            this.#resolvedImages.set(image.uri, resolved)
          }
        })
        .catch((error) => {
          if (active) this.imageError = error
        })
      return () => {
        active = false
      }
    })

    $effect(() => {
      const parsedIiif = this.#source?.parsedIiif
      if (
        parsedIiif &&
        parsedIiif.type === 'collection' &&
        'items' in parsedIiif
      ) {
        this.#fetchingInsideCollection = true
        parsedIiif
          .fetchUntilPath(this.#urlState.params.path.map(({ index }) => index))
          .catch((error) => (this.#errorState.error = error))
          .finally(() => (this.#fetchingInsideCollection = false))
      } else {
        this.#fetchingInsideCollection = false
      }
    })
  }

  async #manifestImageUris(manifest: IIIFManifest, sourceUrl = manifest.uri) {
    const data = await fetchManifestRecord(
      this.#apiBaseUrl,
      manifest,
      sourceUrl
    )
    const uris = new Map(
      data.canvases.flatMap((canvas) =>
        canvas.images
          .slice(0, 1)
          .map((image) => [canvas.uri, image.uri] as const)
      )
    )
    for (const canvas of manifest.canvases) {
      const canonical = uris.get(canvas.uri)
      if (canonical) {
        this.#manifestServiceUris.set(canvas.image, canvas.image.uri)
        for (const uri of canvas.image.serviceUris)
          this.#navigationUris.set(uri, canonical)
        canvas.image.uri = canonical
      }
    }
  }

  async #resolveCanvasImage(manifest: IIIFManifest, image: EmbeddedIIIFImage) {
    let manifestImages = this.#manifestImages.get(manifest)
    if (!manifestImages) {
      manifestImages = this.#manifestImageUris(manifest)
      this.#manifestImages.set(manifest, manifestImages)
      manifestImages.catch(() => this.#manifestImages.delete(manifest))
    }
    await manifestImages
    const uri = this.#manifestServiceUris.get(image) ?? image.uri
    const record = await resolveEditorImage(this.#apiBaseUrl, uri)
    const parsed = Image.parse(record.data)
    parsed.uri = record.uri
    return parsed
  }

  #getParsedIiifAtPath(path: CollectionPath) {
    if (this.#source && this.#source.type === 'collection') {
      return this.#source?.parsedIiif.getItemAtPath(
        path.map(({ index }) => index)
      )
    }
  }

  async #fetchIiif(url: string, sourceIiif: unknown, imageUri?: string) {
    const parsedIiif = IIIF.parse(sourceIiif, { keepSource: true })

    if (parsedIiif.type === 'image' && imageUri) parsedIiif.uri = imageUri

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
      const manifestImages = this.#manifestImageUris(parsedIiif, url)
      await manifestImages
      this.#manifestImages.set(parsedIiif, manifestImages)
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

    if (this.#requestedUrl === url) this.#source = source
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
    this.#resolvedImages.clear()
    this.#navigationUris.clear()
    this.#requestedUrl = url

    if (this.#abortController) {
      this.#abortController.abort()
    }

    const controller = new AbortController()
    this.#abortController = controller

    this.#fetching = true
    this.#errorState.error = null

    try {
      const isInfoUrl = url.endsWith('/info.json')
      const uri = isInfoUrl ? url.slice(0, -'/info.json'.length) : url
      const imageApiUrl = `${this.#apiBaseUrl}/images/${generateId(uri)}`
      let imageUri: string | undefined
      let sourceData: unknown
      let isImage = isInfoUrl
      if (!isImage) {
        const lookup = await fetch(imageApiUrl, { signal: controller.signal })
        isImage = lookup.ok
        if (!isImage && lookup.status !== 404)
          throw new Error(`Image lookup failed (${lookup.status})`)
      }
      if (isImage) {
        const record = await resolveEditorImage(
          this.#apiBaseUrl,
          uri,
          controller.signal
        )
        imageUri = record.uri
        sourceData = record.data
      } else {
        sourceData = await superFetch(url, { signal: controller.signal })
      }
      if (controller.signal.aborted) return

      if (
        sourceData &&
        typeof sourceData === 'object' &&
        'type' in sourceData &&
        typeof sourceData.type === 'string' &&
        ['Annotation', 'AnnotationPage'].includes(sourceData.type)
      ) {
        if (url.startsWith(this.#annotationsApiBaseUrl)) {
          // TODO: show message, Allmaps doesn't use georeference data from annotation
          // but loads from API
          await this.#loadGeoreferenceAnnotation(sourceData)
        } else {
          throw new Error(
            'Only Georeference Annotations loaded from Allmaps are supported'
          )
        }
      } else {
        await this.#fetchIiif(url, sourceData, imageUri)
      }
    } catch (err) {
      if (controller.signal.aborted) return
      this.#errorState.error = err
      this.#reset()
    } finally {
      if (!controller.signal.aborted) this.#fetching = false
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
    this.#requestedUrl = undefined
  }

  get imagesByImageId() {
    return this.#imagesByImageId
  }

  get source() {
    return this.#source
  }

  get editSource() {
    return this.#editSource
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

    const requested = this.#urlState.params.imageId
    if (requested) {
      const resolved = this.#navigationUris.get(requested)
      if (resolved && this.#imagesByImageId.has(resolved)) return resolved
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
  apiBaseUrl: string,
  annotationsApiBaseUrl: string,
  urlState: UrlState<typeof searchParams>,
  errorState: ErrorState
) {
  return setContext(
    SOURCE_KEY,
    new SourceState(apiBaseUrl, annotationsApiBaseUrl, urlState, errorState)
  )
}

export function getSourceState() {
  const sourceState = getContext<ReturnType<typeof setSourceState>>(SOURCE_KEY)

  if (!sourceState) {
    throw new Error('SourceState is not set')
  }

  return sourceState
}
