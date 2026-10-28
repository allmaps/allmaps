/** Report IIIF metadata failures on the main thread; do not pass to tile workers. */
export function createImageFetch(
  signal: AbortSignal,
  onError: (message: string) => void
) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const requestSignal = AbortSignal.any([
      signal,
      ...(init?.signal ? [init.signal] : []),
      AbortSignal.timeout(15000)
    ])
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url
    const host = new URL(url).hostname
    try {
      const response = await fetch(input, { ...init, signal: requestSignal })
      if (!response.ok) {
        onError(
          `Could not load the map image from ${host} (HTTP ${response.status}).`
        )
      }
      return response
    } catch (error) {
      if (!signal.aborted && !init?.signal?.aborted) {
        onError(
          requestSignal.aborted
            ? `The map image request to ${host} timed out. Please try again.`
            : `Could not load the map image from ${host}. The server may be unavailable or blocking browser requests.`
        )
      }
      throw error
    }
  }
}
