import { getContext, setContext } from 'svelte'

import type { Manifest } from '@allmaps/iiif-parser'

import type { ImageError, ImagesState } from '$lib/state/images.svelte.js'
import type { MapRenderError, MapsState } from '$lib/state/maps.svelte.js'
import type { SourceError, SourceState } from '$lib/state/source.svelte.js'
import type { Source } from '$lib/types/shared.js'

const ERRORS_KEY = Symbol('errors')

type JsonObject = Record<string, unknown>

export type ViewerBlockingError =
  | {
      type: 'source'
      sourceError: SourceError
    }
  | {
      type: 'images'
      imageErrors: ImageError[]
      sourceImageCount: number
    }
  | {
      type: 'map-render'
      mapRenderError: MapRenderError
    }

export type SourceInfoWarningType =
  | 'invalid-annotation'
  | 'image'
  | 'map-render'

export type SourceInfoWarningDetail = {
  type: SourceInfoWarningType
  text: string
}

export type ViewerErrorType =
  | ViewerBlockingError['type']
  | SourceInfoWarningType

function isJsonObject(value: unknown): value is JsonObject {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function hasGeoreferencingValue(value: unknown): boolean {
  if (typeof value === 'string') {
    return value === 'georeferencing'
  } else if (Array.isArray(value)) {
    return value.some(hasGeoreferencingValue)
  }

  return false
}

function hasGeoreferencingPurpose(annotation: unknown): boolean {
  if (!isJsonObject(annotation)) {
    return false
  }

  return (
    hasGeoreferencingValue(annotation.motivation) ||
    hasGeoreferencingValue(annotation.purpose)
  )
}

function countAnnotationPageItems(annotationPage: unknown) {
  if (!isJsonObject(annotationPage)) {
    return
  }

  const items = annotationPage.items

  if (!Array.isArray(items)) {
    return
  }

  if (hasGeoreferencingPurpose(annotationPage)) {
    return items.length
  }

  return items.filter(hasGeoreferencingPurpose).length
}

function countSourceAnnotationItems(source: Source) {
  if (!isJsonObject(source.data)) {
    return
  }

  if (source.data.type === 'Annotation') {
    return 1
  }

  if (source.data.type === 'AnnotationPage') {
    return countAnnotationPageItems(source.data)
  }
}

function countManifestAnnotationItems(manifest: Manifest) {
  let count = 0

  for (const canvas of manifest.canvases) {
    for (const annotationPage of canvas.annotations ?? []) {
      count += countAnnotationPageItems(annotationPage) ?? 0
    }
  }

  return count
}

function countInvalidAnnotations(source?: Source) {
  if (!source) {
    return 0
  }

  if (source.parsed.type === 'annotation') {
    const annotationCount = countSourceAnnotationItems(source)

    if (annotationCount === undefined) {
      return 0
    }

    return Math.max(0, annotationCount - source.parsed.maps.length)
  }

  const invalidEmbeddedAnnotationCount =
    source.parsed.invalidEmbeddedAnnotations?.length ?? 0

  if (invalidEmbeddedAnnotationCount > 0) {
    return invalidEmbeddedAnnotationCount
  }

  if (source.parsed.iiif.type !== 'manifest') {
    return 0
  }

  return Math.max(
    0,
    countManifestAnnotationItems(source.parsed.iiif) -
      (source.parsed.embeddedMaps?.length ?? 0)
  )
}

function getInvalidAnnotationWarningDetail(
  invalidAnnotationCount: number
): SourceInfoWarningDetail | undefined {
  if (invalidAnnotationCount === 0) {
    return
  }

  return {
    type: 'invalid-annotation',
    text: `${pluralize(
      invalidAnnotationCount,
      'Georeference Annotation'
    )} could not be parsed.`
  }
}

function getImageLoadWarningDetail(
  sourceImageCount: number,
  imageErrorCount: number
): SourceInfoWarningDetail | undefined {
  if (imageErrorCount === 0) {
    return
  }

  if (sourceImageCount > 0 && imageErrorCount === sourceImageCount) {
    return {
      type: 'image',
      text: `All ${pluralize(sourceImageCount, 'image')} could not be loaded`
    }
  } else if (sourceImageCount > 0) {
    return {
      type: 'image',
      text: `${imageErrorCount} of ${pluralize(
        sourceImageCount,
        'image'
      )} could not be loaded.`
    }
  }

  return {
    type: 'image',
    text: `${pluralize(imageErrorCount, 'image')} could not be loaded`
  }
}

function getMapRenderWarningDetail(
  mapRenderErrorCount: number
): SourceInfoWarningDetail | undefined {
  if (mapRenderErrorCount === 0) {
    return
  }

  return {
    type: 'map-render',
    text: `${pluralize(mapRenderErrorCount, 'map')} could not be warped`
  }
}

function compactDetails(details: Array<SourceInfoWarningDetail | undefined>) {
  return details.filter((detail) => detail !== undefined)
}

export class ErrorsState {
  #sourceState: SourceState
  #mapsState: MapsState
  #imagesState: ImagesState

  #imageErrors = $derived.by(() => [...this.#imagesState.imageErrors.values()])
  #mapRenderErrors = $derived.by(() => this.#mapsState.mapRenderErrors)

  #invalidAnnotationCount = $derived.by(() =>
    countInvalidAnnotations(this.#sourceState.source)
  )

  #sourceInfoWarningDetails = $derived.by(() =>
    compactDetails([
      getInvalidAnnotationWarningDetail(this.#invalidAnnotationCount),
      getMapRenderWarningDetail(this.#mapRenderErrors.length),
      getImageLoadWarningDetail(
        this.#imagesState.sourceImageCount,
        this.#imagesState.imageErrorCount
      )
    ])
  )

  #viewerBlockingError = $derived.by((): ViewerBlockingError | undefined => {
    if (this.#sourceState.error) {
      return {
        type: 'source',
        sourceError: this.#sourceState.error
      }
    }

    if (
      this.#mapsState.mapCount > 0 &&
      this.#mapRenderErrors.length === this.#mapsState.mapCount
    ) {
      return {
        type: 'map-render',
        mapRenderError: this.#mapRenderErrors[0]
      }
    }

    if (this.#imagesState.allSourceImagesFailed) {
      return {
        type: 'images',
        imageErrors: this.#imageErrors,
        sourceImageCount: this.#imagesState.sourceImageCount
      }
    }
  })

  constructor(
    sourceState: SourceState,
    mapsState: MapsState,
    imagesState: ImagesState
  ) {
    this.#sourceState = sourceState
    this.#mapsState = mapsState
    this.#imagesState = imagesState
  }

  get viewerBlockingError() {
    return this.#viewerBlockingError
  }

  get sourceInfoWarningDetails() {
    return this.#sourceInfoWarningDetails
  }

  get hasSourceInfoWarnings() {
    return this.#sourceInfoWarningDetails.length > 0
  }

  get sourceImageCount() {
    return this.#imagesState.sourceImageCount
  }

  get imageErrorCount() {
    return this.#imagesState.imageErrorCount
  }
}

export function setErrorsState(
  sourceState: SourceState,
  mapsState: MapsState,
  imagesState: ImagesState
) {
  return setContext(
    ERRORS_KEY,
    new ErrorsState(sourceState, mapsState, imagesState)
  )
}

export function getErrorsState() {
  const errorsState = getContext<ErrorsState>(ERRORS_KEY)
  if (!errorsState) {
    throw new Error('ErrorsState is not set')
  }

  return errorsState
}
