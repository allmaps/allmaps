export type SourceLoadErrorCode =
  | 'annotation-without-maps'
  // TODO: add `canvas-without-maps` once Viewer and Editor can load IIIF Canvas resources directly.
  | 'image-without-maps'
  | 'manifest-without-maps'

type SourceLoadErrorInfo = {
  message: string
  title: string
}

const sourceLoadErrors: Record<SourceLoadErrorCode, SourceLoadErrorInfo> = {
  'annotation-without-maps': {
    title: 'Annotation contains no maps',
    message:
      'This Georeference Annotation does not contain any georeferenced maps.'
  },
  'image-without-maps': {
    title: 'No georeferenced maps found',
    message:
      'This IIIF image was loaded, but Allmaps could not find georeferenced maps for it.'
  },
  'manifest-without-maps': {
    title: 'No georeferenced maps found',
    message:
      'This IIIF manifest does not contain embedded Georeference Annotations, and Allmaps could not find georeferenced maps for it.'
  }
}

export class SourceLoadError extends Error {
  code: SourceLoadErrorCode
  status = 422
  title: string

  constructor(code: SourceLoadErrorCode) {
    super(sourceLoadErrors[code].message)

    this.name = 'SourceLoadError'
    this.code = code
    this.title = sourceLoadErrors[code].title
  }
}

type SourceHttpErrorOptions = {
  cause?: unknown
  details?: string
}

export class SourceHttpError extends Error {
  url: string
  status: number
  statusText: string
  title = 'Could not load remote resource'
  details?: string
  cause?: unknown

  constructor(
    url: string,
    status: number,
    statusText = '',
    options: SourceHttpErrorOptions = {}
  ) {
    const statusLabel = statusText ? ` ${statusText}` : ''

    super(`Remote server returned HTTP ${status}${statusLabel}.`)

    this.name = 'SourceHttpError'
    this.url = url
    this.status = status
    this.statusText = statusText
    this.details = options.details
    this.cause = options.cause
  }
}

export function getSourceLoadErrorTitle(message: string) {
  const code = getSourceLoadErrorCode(message)
  return code ? sourceLoadErrors[code].title : undefined
}

export function getSourceLoadErrorCode(message: string) {
  return (
    Object.entries(sourceLoadErrors) as [
      SourceLoadErrorCode,
      SourceLoadErrorInfo
    ][]
  ).find(([, sourceLoadError]) => sourceLoadError.message === message)?.[0]
}

export function getSourceErrorCode(error: unknown) {
  if (error instanceof SourceLoadError) {
    return error.code
  }

  return error instanceof Error
    ? getSourceLoadErrorCode(error.message)
    : undefined
}

export function getSourceErrorTitle(error: unknown) {
  if (error instanceof SourceLoadError || error instanceof SourceHttpError) {
    return error.title
  }

  return error instanceof Error
    ? getSourceLoadErrorTitle(error.message)
    : undefined
}

export function getSourceErrorDetails(error: unknown) {
  return error instanceof SourceHttpError ? error.details : undefined
}

export function getSourceLoadErrorStatus(error: unknown) {
  return error instanceof SourceLoadError || error instanceof SourceHttpError
    ? error.status
    : 500
}

export function getSourceLoadErrorEditorUrl(
  code: SourceLoadErrorCode | undefined,
  sourceUrl: string | null | undefined
) {
  if (
    !sourceUrl ||
    (code !== 'manifest-without-maps' && code !== 'image-without-maps')
  ) {
    return
  }

  const params = new URLSearchParams({ url: sourceUrl })

  return `https://editor.allmaps.org/images?${params.toString()}`
}
