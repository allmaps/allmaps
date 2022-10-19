import { browser } from '$app/environment'
import { goto } from '$app/navigation'
import { page } from '$app/stores'
import { get, writable } from 'svelte/store'

let initialUrl = ''

if (browser) {
  const searchParams = new URLSearchParams(window.location.search)
  const url = searchParams.get('url')

  if (url && url.length) {
    initialUrl = url
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
