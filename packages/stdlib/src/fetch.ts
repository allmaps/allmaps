import type { FetchFn } from '@allmaps/types'

export type ResourceFetchErrorKind = 'network-or-cors' | 'http'

type ResourceFetchErrorOptions = {
  cause?: unknown
  corsLikely?: boolean
  message?: string
  status?: number
  statusText?: string
}

export class ResourceFetchError extends Error {
  kind: ResourceFetchErrorKind
  input: RequestInfo | URL
  url: string
  status?: number
  statusText?: string
  corsLikely: boolean
  cause?: unknown

  constructor(
    kind: ResourceFetchErrorKind,
    input: RequestInfo | URL,
    options: ResourceFetchErrorOptions = {}
  ) {
    super(options.message ?? getDefaultFetchErrorMessage(kind, input, options))

    this.name = 'ResourceFetchError'
    this.kind = kind
    this.input = input
    this.url = getInputUrl(input)
    this.status = options.status
    this.statusText = options.statusText
    this.corsLikely = options.corsLikely ?? false
    this.cause = options.cause
  }
}

function getInputUrl(input: RequestInfo | URL) {
  if (typeof input === 'string') {
    return input
  } else if (input instanceof URL) {
    return input.href
  } else {
    return input.url
  }
}

function getDefaultFetchErrorMessage(
  kind: ResourceFetchErrorKind,
  input: RequestInfo | URL,
  options: ResourceFetchErrorOptions
) {
  const url = getInputUrl(input)

  if (kind === 'network-or-cors') {
    return `Failed to fetch: ${url}`
  }

  if (options.status === 404) {
    return `Not found: ${url} (404)`
  } else if (options.status === 500) {
    return 'Internal server error (500)'
  } else if (options.statusText) {
    return options.statusText
  } else {
    return `Failed to fetch: ${url} (${options.status})`
  }
}

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  )
}

function isCorsLikely(input: RequestInfo | URL) {
  const location = globalThis.location
  if (!location) {
    return false
  }

  try {
    const url = new URL(getInputUrl(input), location.href)
    return url.origin !== location.origin
  } catch {
    return false
  }
}

export async function fetchUrl(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn?: FetchFn
): Promise<Response> {
  let response: Response

  try {
    if (typeof fetchFn === 'function') {
      response = await fetchFn(input, init)
    } else {
      response = await fetch(input, init)
    }
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    throw new ResourceFetchError('network-or-cors', input, {
      cause: error,
      corsLikely: isCorsLikely(input)
    })
  }

  if (!response.ok) {
    let message: string | undefined

    try {
      const json = await response.clone().json()
      if (json && typeof json.error === 'string') {
        message = json.error
      }
    } catch {
      // Ignore invalid JSON error bodies and use the response status instead.
    }

    if (!message && response.statusText) {
      message = response.statusText
    }

    throw new ResourceFetchError('http', input, {
      message,
      status: response.status,
      statusText: response.statusText
    })
  }

  return response
}

export async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn?: FetchFn
): Promise<unknown> {
  const response = await fetchUrl(input, init, fetchFn)
  return await response.json()
}

export async function fetchImageInfo(
  imageUri: string,
  init?: RequestInit,
  fetchFn?: FetchFn
) {
  return await fetchJson(`${imageUri}/info.json`, init, fetchFn)
}

export async function fetchImageBitmap(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn?: FetchFn
) {
  const response = await fetchUrl(input, init, fetchFn)
  const blob = await response.blob()
  return await createImageBitmap(blob)
}
