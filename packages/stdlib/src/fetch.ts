import type { FetchFn } from '@allmaps/types'

export async function fetchUrl(
  input: RequestInfo | URL,
  init?: RequestInit,
  fetchFn?: FetchFn
): Promise<Response> {
  let response: Response

  if (typeof fetchFn === 'function') {
    response = await fetchFn(input, init)
  } else {
    response = await fetch(input, init)
  }

  if (!response.ok) {
    const json = await response.json()
    if (json && json.error) {
      throw new Error(json.error)
    } else if (response.statusText) {
      throw new Error(response.statusText)
    } else if (response.status === 404) {
      throw new Error(`Not found: ${input} (404)`)
    } else if (response.status === 500) {
      throw new Error('Internal server error (500)')
    } else {
      throw new Error(`Failed to fetch: ${input} (${response.status})`)
    }
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
