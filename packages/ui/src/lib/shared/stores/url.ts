import { writable } from 'svelte/store'

function getUrlsFromQueryString(location: Location): string[] {
  const searchParams = new URLSearchParams(location.search)
  return searchParams.getAll('url')
}

function getUrlsFromHash(location: Location): string[] {
  const hashQueryString = location.hash.slice(1)

  if (!hashQueryString) {
    return []
  }

  const searchParams = new URLSearchParams(hashQueryString)
  const data = searchParams.get('data')

  const dataUrlPrefix = 'data:text/x-url,'

  if (data && data.startsWith(dataUrlPrefix)) {
    const url = data.slice(dataUrlPrefix.length)
    return [url]
  }

  return []
}

export function fromUrl(): string[] {
  if (typeof window !== 'undefined') {
    const queryStringUrls = getUrlsFromQueryString(window.location)
    const hashUrls = getUrlsFromHash(window.location)

    if (queryStringUrls.length > 0) {
      return queryStringUrls
    } else if (hashUrls.length > 0) {
      return hashUrls
    }
  }

  return []
}

export default writable<string[]>(fromUrl())
