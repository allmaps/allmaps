/** Only errors tied to particular maps may be skipped. Size limits on the
 * complete document remain fatal, so an export is never silently truncated. */
export class MapExportError extends Error {
  mapIds: string[]
  retryable: boolean

  constructor(mapIds: string[], cause: unknown, retryable = true) {
    super(
      cause instanceof Error
        ? cause.message
        : 'The image could not be exported.',
      { cause }
    )
    this.name = 'MapExportError'
    this.mapIds = mapIds
    this.retryable = retryable
  }
}

export function imageHttpError(status: number) {
  const advice =
    status === 401 || status === 403
      ? 'Access to this image was denied.'
      : status === 404 || status === 410
        ? 'This image is not available at the requested URL.'
        : status === 429
          ? 'The image service is rate limiting requests. Try again later.'
          : status === 413
            ? 'The requested image is too large for this service. Reduce the export resolution.'
            : status >= 500
              ? 'The image service is unavailable. Try again later.'
              : 'The image service rejected the request.'
  return new Error(`${advice} (HTTP ${status})`)
}

export const imageNetworkMessage =
  'The image service could not be reached, or it does not allow downloads from this browser (CORS). Try again or check the service.'

/** Renderer info.json errors retain their HTTP/network classification. */
export function imageInfoError(cause: unknown) {
  if (cause instanceof Error && cause.name === 'TimeoutError')
    return new Error(
      'The image service took too long to return info.json. Try again later.'
    )
  if (cause && typeof cause === 'object') {
    if ('status' in cause && typeof cause.status === 'number')
      return new Error(
        `Could not load info.json. ${imageHttpError(cause.status).message}`
      )
    if ('kind' in cause && cause.kind === 'network-or-cors')
      return new Error(`Could not load info.json. ${imageNetworkMessage}`)
  }
  return new Error(
    `The image information (info.json) could not be loaded.${cause instanceof Error ? ` ${cause.message}` : ''}`,
    { cause }
  )
}
