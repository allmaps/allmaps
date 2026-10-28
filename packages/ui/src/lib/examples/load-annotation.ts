import { fetchAnnotation } from './annotation.ts'
import type { FetchFn } from '@allmaps/types'
import type { ExampleMap, ExampleSettings } from './types.js'

export async function loadAnnotation(
  example: ExampleMap,
  settings: ExampleSettings,
  signal?: AbortSignal,
  preparedAnnotation?: unknown,
  imageInfoFetch?: FetchFn,
  fitAfterLoading = true
) {
  await example.ready
  signal?.throwIfAborted()

  let annotation = preparedAnnotation
  if (annotation === undefined) {
    annotation = await fetchAnnotation(settings.annotationUrl, signal)
  }
  signal?.throwIfAborted()

  // Keep the custom fetch function on individual maps. Layer-wide fetch options
  // also reach tile workers, where a function cannot be structured-cloned.
  const results = example.warpedMapLayer.addGeoreferenceAnnotation(
    annotation,
    imageInfoFetch ? { fetchFn: imageInfoFetch } : undefined
  )
  const failure = results.find((result) => !result.ok)
  if (failure) {
    throw failure.error ?? new Error('Could not read the annotation.')
  }
  if (!results.length) {
    throw new Error('This annotation does not contain any georeferenced maps.')
  }

  if (settings.opacity !== 1)
    example.warpedMapLayer.setOpacity(settings.opacity)
  if (settings.transformation !== 'annotation') {
    example.warpedMapLayer.setLayerTransformationType(settings.transformation)
  }
  if (fitAfterLoading) example.fitBounds()
}
