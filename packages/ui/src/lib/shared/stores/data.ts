import { writable } from 'svelte/store'

function getDataFromQueryString(location: Location): string | null {
  const searchParams = new URLSearchParams(location.search)
  const data = searchParams.get('data')
  return data
}

function getDataFromHash(location: Location): string | null {
  const hashQueryString = location.hash.slice(1)

  if (!hashQueryString) {
    return null
  }

  const searchParams = new URLSearchParams(hashQueryString)
  const dataParam = searchParams.get('data')

  const dataJsonPrefix = 'data:application/json,'

  if (dataParam && dataParam.length) {
    if (dataParam.startsWith(dataJsonPrefix)) {
      const data = dataParam.slice(dataJsonPrefix.length)
      return data
    } else {
      return dataParam
    }
  }

  return null
}

export function fromUrl() {
  if (typeof window !== 'undefined') {
    const queryStringData = getDataFromQueryString(window.location)
    const hashData = getDataFromHash(window.location)

    if (queryStringData !== null && queryStringData.length) {
      return queryStringData
    } else if (hashData !== null && hashData.length) {
      return hashData
    }
  }

  return ''
}

export default writable<string>(fromUrl())
