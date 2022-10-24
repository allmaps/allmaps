import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { page } from '$app/stores'
import { get, writable } from 'svelte/store'

let initialUrl = ''

function getUrlFromQueryString(location: Location): string | null {
  const searchParams = new URLSearchParams(location.search)
  const url = searchParams.get('url')
  return url
}

function getUrlFromHash(location: Location): string | null {
  const hashQueryString = window.location.hash.slice(1)
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

if (browser) {
  const queryStringUrl = getUrlFromQueryString(window.location)
  const hashUrl = getUrlFromHash(window.location)

  if (queryStringUrl !== null && queryStringUrl.length) {
    initialUrl = queryStringUrl
  } else if (hashUrl !== null && hashUrl.length) {
    initialUrl = hashUrl
  }
}

const url = writable<string>(initialUrl)

url.subscribe((value) => {
  if (browser) {
    const $page = get(page)
    if ($page.url) {
      const searchParams = $page.url.searchParams
      if (value !== searchParams.get('url')) {
        $page.url.searchParams.set('url', value)

        // TODO: also use page path in goto
        goto(`?${$page.url.searchParams.toString()}`, {
          keepfocus: true
        })
      }
    }
  }
})

export default url
