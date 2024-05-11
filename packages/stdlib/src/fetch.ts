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
    throw new Error(response.statusText)
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
