import { prepareAnnotation } from './annotation.ts'
import { loadAnnotation } from './load-annotation.ts'
import type { FetchFn } from '@allmaps/types'
import type {
  ExampleBounds,
  ExampleInitialView,
  ExampleMap,
  ExampleSettings,
  ExampleViewMode
} from './types.js'

export async function initializeView(
  factory: (view: ExampleInitialView) => Promise<ExampleMap>,
  settings: ExampleSettings,
  viewMode: ExampleViewMode,
  signal: AbortSignal,
  imageInfoFetch: FetchFn,
  onReady: (example: ExampleMap) => void,
  knownBounds?: ExampleBounds
) {
  let prepared: Awaited<ReturnType<typeof prepareAnnotation>> | undefined
  let current: ExampleMap | undefined
  try {
    if (viewMode === 'list' || (viewMode === 'bounds' && !knownBounds)) {
      prepared = await prepareAnnotation(
        settings.annotationUrl,
        settings.transformation,
        signal,
        imageInfoFetch
      )
      knownBounds = prepared.bounds
      if (viewMode === 'bounds') prepared.warpedMapList.destroy()
    }
    signal.throwIfAborted()
    current = await factory({
      ...(viewMode === 'fit' ? {} : { bounds: knownBounds }),
      ...(viewMode === 'list' ? { warpedMapList: prepared?.warpedMapList } : {})
    })
    const originalDestroy = current.destroy.bind(current)
    let destroyed = false
    const destroy = () => {
      if (destroyed) return
      destroyed = true
      signal.removeEventListener('abort', destroy)
      try {
        originalDestroy()
      } finally {
        // A map cancelled before its layer is attached does not own the list yet.
        if (viewMode === 'list' && prepared?.warpedMapList.getMapIds().length) {
          prepared.warpedMapList.destroy()
        }
      }
    }
    current.destroy = destroy
    signal.addEventListener('abort', destroy, { once: true })
    // Handle late factories and cancellation before map readiness.
    void current.ready.catch(() => {})
    signal.throwIfAborted()
    await current.ready
    signal.throwIfAborted()
    onReady(current)
    if (viewMode === 'list') {
      if (settings.opacity !== 1)
        current.warpedMapLayer.setOpacity(settings.opacity)
    } else {
      await loadAnnotation(
        current,
        settings,
        signal,
        prepared?.annotation,
        imageInfoFetch,
        viewMode === 'fit'
      )
    }
    signal.throwIfAborted()
    return { example: current, bounds: current.getBounds() }
  } catch (error) {
    if (current) current.destroy()
    else if (viewMode === 'list') prepared?.warpedMapList.destroy()
    throw error
  }
}
