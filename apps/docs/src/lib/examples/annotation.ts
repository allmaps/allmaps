import type { FetchFn } from '@allmaps/types'
import type { WebGL2WarpedMap } from '@allmaps/render/webgl2'
import type { ExampleTransformation } from './types.js'

export async function fetchAnnotation(
  annotationUrl: string,
  signal?: AbortSignal
) {
  const requestSignal = AbortSignal.any([
    ...(signal ? [signal] : []),
    AbortSignal.timeout(15000)
  ])
  try {
    const response = await fetch(annotationUrl, { signal: requestSignal })
    if (!response.ok) {
      throw new Error(
        `Could not load the annotation (HTTP ${response.status}).`
      )
    }
    const annotation: unknown = await response.json()
    signal?.throwIfAborted()
    return annotation
  } catch (error) {
    signal?.throwIfAborted()
    if (requestSignal.aborted) {
      throw new Error('The annotation request timed out. Please try again.', {
        cause: error
      })
    }
    throw error
  }
}

/** Prepare a shared list and its extent before creating a basemap. */
export async function prepareAnnotation(
  annotationUrl: string,
  transformation: ExampleTransformation,
  signal: AbortSignal,
  imageInfoFetch?: FetchFn
) {
  const annotation = await fetchAnnotation(annotationUrl, signal)
  const { WarpedMapList } = await import('@allmaps/render')
  signal.throwIfAborted()
  const warpedMapList = new WarpedMapList<WebGL2WarpedMap>(
    transformation === 'annotation'
      ? {}
      : { transformationType: transformation }
  )
  try {
    const results = warpedMapList.addGeoreferenceAnnotation(
      annotation,
      imageInfoFetch ? { fetchFn: imageInfoFetch } : undefined
    )
    const failure = results.find((result) => !result.ok)
    if (failure) throw failure.error
    const bounds = warpedMapList.getMapsBbox()
    if (!bounds || !bounds.every(Number.isFinite)) {
      throw new Error(
        'This annotation does not contain any georeferenced maps with a valid extent.'
      )
    }
    return { annotation, bounds, warpedMapList }
  } catch (error) {
    warpedMapList.destroy()
    throw error
  }
}
