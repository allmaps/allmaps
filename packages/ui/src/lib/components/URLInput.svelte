<script lang="ts">
  import { browser } from '$app/environment'
  import { get } from 'svelte/store'

  import url from '$lib/shared/stores/url.js'

  let urlValue: string
  let input: HTMLInputElement

  export let autofocus: boolean | undefined = undefined

  const hasInitialUrl = get(url) ? true : false

  autofocus = autofocus === undefined ? !hasInitialUrl : false

  export let placeholder =
    'Type the URL of a IIIF Image, Manifest, Collection or Georeference Annotation'

  url.subscribe((value) => {
    urlValue = value
  })

  function inputClick(event: Event) {
    selectInputText()
    event.preventDefault()
  }

  function selectInputText() {
    input.focus()
    input.select()
  }

  function submit() {
    if (urlValue) {
      setStoreValue(urlValue)
    }
  }

  function setStoreValue(urlValue: string) {
    $url = urlValue
  }

  if (browser) {
    document.addEventListener('keyup', (event: KeyboardEvent) => {
      const target = event.target as Element
      if (event.key === '/' && target.tagName !== 'INPUT') {
        selectInputText()
      }
    })
  }
</script>

<form
  class="flex items-center gap-2 w-full bg-gray-50 rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 text-sm"
  on:submit|preventDefault={submit}
>
  <!-- svelte-ignore a11y-autofocus -->
  <input
    type="input"
    {autofocus}
    on:click={inputClick}
    bind:value={urlValue}
    bind:this={input}
    class="bg-transparent w-full px-2 py-1 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form>
