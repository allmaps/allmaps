<script lang="ts">
  import { afterNavigate } from '$app/navigation'

  import url from '$lib/shared/stores/url.js'

  let urlValue: string
  export let placeholder =
    'Type the URL of a IIIF Image, Manifest, Collection or Georef Annotation'

  url.subscribe((value) => {
    urlValue = value
  })

  function inputClick(event: MouseEvent) {
    const target = event.target

    if (target instanceof HTMLInputElement) {
      target.select()
    }
  }

  function submit() {
    if (urlValue) {
      setStoreValue(urlValue)
    }
  }

  function setStoreValue(urlValue: string) {
    $url = urlValue
  }

  afterNavigate(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const url = searchParams.get('url')

    if (url) {
      setStoreValue(url)
    } else {
      setStoreValue('')
    }
  })
</script>

<form
  class="flex items-center gap-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 text-sm"
  on:submit|preventDefault={submit}
>
  <input
    type="input"
    on:click={inputClick}
    bind:value={urlValue}
    class="bg-transparent w-full p-2 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form>
