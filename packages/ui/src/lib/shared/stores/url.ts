import { writable } from 'svelte/store'

function getUrlFromQueryString(location: Location): string | null {
  const searchParams = new URLSearchParams(location.search)
  const url = searchParams.get('url')
  return url
}

function getUrlFromHash(location: Location): string | null {
  const hashQueryString = location.hash.slice(1)

  if (!hashQueryString) {
    return null
  }

  const searchParams = new URLSearchParams(hashQueryString)
  const data = searchParams.get('data')

  const dataUrlPrefix = 'data:text/x-url,'

  if (data) {
    if (data.startsWith(dataUrlPrefix)) {
      const url = data.slice(dataUrlPrefix.length)
      return url
    }
  }

  return null
}

export function fromUrl() {
  if (typeof window !== 'undefined') {
    const queryStringUrl = getUrlFromQueryString(window.location)
    const hashUrl = getUrlFromHash(window.location)

    if (queryStringUrl !== null && queryStringUrl.length) {
      return queryStringUrl
    } else if (hashUrl !== null && hashUrl.length) {
      return hashUrl
    }
  }

  return ''
}

export default writable<string>(fromUrl())
