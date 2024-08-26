<script lang="ts">
  import { browser } from '$app/environment'
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'

  import { get } from 'svelte/store'

  import { afterNavigate } from '$app/navigation'

  import param from '$lib/shared/stores/param.js'
  import { fromUrl as urlFromUrl } from '$lib/shared/stores/url.js'
  import { fromUrl as dataFromUrl } from '$lib/shared/stores/data.js'

  // Max URL length including URL parameters is 2000
  // See https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers
  // URL parameters can be of at most 2000 characters minus length of domain + path
  // Let's say domain + path will be at most 100 characters long
  const MAX_URL_PARAM_LENGTH = 2000 - 100

  afterNavigate(() => {
    const newUrls = urlFromUrl()
    const newData = dataFromUrl()

    // console.log('newUrls', newUrls)
    // console.log('newData', newData)

    if (newUrls.length > 0) {
      param.set({
        type: 'url',
        urls: newUrls
      })
    } else if (newData) {
      param.set({
        type: 'data',
        data: newData
      })
    } else {
      param.set(undefined)
    }
  })

  function gotoSearchParams(searchParams: URLSearchParams) {
    // console.log('gotoSearchParams', searchParams.toString())
    //return
    goto(`?${searchParams.toString()}`, {
      replaceState: false,
      keepFocus: true
    })
  }

  param.subscribe(($param) => {
    if (browser && $param) {
      const $page = get(page)
      // console.log('param store', $param)

      if ($param.type === 'url' && $param.urls && $param.urls.length > 0) {
        const searchParams = $page.url.searchParams
        const searchParamsString = searchParams.toString()
        searchParams.delete('data')
        $param.urls.forEach((url, index) => {
          if (index === 0) {
            searchParams.set('url', url)
          } else {
            searchParams.append('url', url)
          }
        })
        // console.log('searchParams', searchParams.toString())
        // console.log('searchParamsString', searchParamsString)

        if (searchParamsString !== searchParams.toString()) {
          gotoSearchParams(searchParams)
        }
      } else if ($param.type === 'data' && $param.data) {
        if ($param.data.length > MAX_URL_PARAM_LENGTH) {
          // If length of URL + URL parameters is too long, use hash-based parameters
          const searchParams = new URLSearchParams()
          searchParams.set('data', $param.data)
          searchParams.toString()
          goto('/#' + searchParams.toString())
        } else {
          const searchParams = $page.url.searchParams
          searchParams.delete('url')
          searchParams.set('data', $param.data)
          gotoSearchParams(searchParams)
        }
      }
    }
  })
</script>
