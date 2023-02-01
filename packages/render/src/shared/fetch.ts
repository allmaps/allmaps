// TODO: move to stdlib

export async function fetchUrl(url: string) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(response.statusText)
  }

  return response
}

export async function fetchJson(url: string) {
  const response = await fetchUrl(url)
  return await response.json()
}
