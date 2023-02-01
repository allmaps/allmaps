import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { page } from '$app/stores'
import { get, writable } from 'svelte/store'

let initialData = ''

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

  if (dataParam) {
    if (dataParam.startsWith(dataJsonPrefix)) {
      const data = dataParam.slice(dataJsonPrefix.length)
      return data
    }
  }

  return null
}

if (browser) {
  const queryStringData = getDataFromQueryString(window.location)
  const hashData = getDataFromHash(window.location)

  if (queryStringData !== null && queryStringData.length) {
    initialData = queryStringData
  } else if (hashData !== null && hashData.length) {
    initialData = hashData
  }
}

const data = writable<string>(initialData)

data.subscribe((value) => {
  if (browser) {
    // TODO: check length of value
    // if longer than 2000, use hash instead of url param
    const $page = get(page)
    if ($page.url) {
      const searchParams = $page.url.searchParams
      if (value !== searchParams.get('data') && value.length) {
        $page.url.searchParams.set('data', value)

        // TODO: also use page path in goto
        goto(`?${$page.url.searchParams.toString()}`, {
          keepFocus: true
        })
      }
    }
  }
})

export default data
