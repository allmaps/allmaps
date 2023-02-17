export async function fetchUrl(url: string, abortSignal?: AbortSignal) {
  const response = await fetch(url, {
    signal: abortSignal
  })

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response
}

export async function fetchJson(url: string, abortSignal?: AbortSignal) {
  const response = await fetchUrl(url, abortSignal)
  return await response.json()
}
