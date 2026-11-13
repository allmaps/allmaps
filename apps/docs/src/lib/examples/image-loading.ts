import type { ExampleRenderer } from './types.js'

type ImageErrorEvent = Event & {
  error?: Error
  data?: {
    imageInfoUrl?: string
    tileUrl?: string
    status?: number
  }
}

/** Annotation loading finishes before the IIIF image and its tiles load. */
export function watchImageLoading(
  renderer: ExampleRenderer,
  onLoaded: () => void,
  onError: (message: string) => void,
  signal: AbortSignal,
  timeout = 30000
) {
  const loadingTimeout = setTimeout(() => {
    onError(
      'The map image is taking too long to load. Please try again or choose another example.'
    )
  }, timeout)
  function stopWaiting() {
    clearTimeout(loadingTimeout)
  }
  signal.addEventListener('abort', stopWaiting, { once: true })
  function handleLoaded() {
    stopWaiting()
    onLoaded()
  }
  function handleError(event: Event) {
    const { error, data } = event as ImageErrorEvent
    if (error?.name === 'AbortError') return
    stopWaiting()

    const url = data?.imageInfoUrl ?? data?.tileUrl
    let host = ''
    if (url) {
      try {
        host = ` from ${new URL(url).hostname}`
      } catch {
        // Keep a useful message even when the server URL is malformed.
      }
    }
    const detail = data?.status
      ? ` (HTTP ${data.status})`
      : error?.message
        ? `: ${error.message}`
        : ''
    onError(`Could not load the map image${host}${detail}.`)
  }

  renderer.addEventListener('imageinfofetcherror', handleError, { signal })
  renderer.addEventListener('error', handleError, { signal })
  renderer.tileCache.addEventListener('tilefetcherror', handleError, { signal })
  renderer.tileCache.addEventListener('firstmaptileloaded', handleLoaded, {
    signal
  })
}
