<script lang="ts">
  import { browser } from '$app/environment'

  import urlStore from '$lib/shared/stores/url.js'

  let urlValue: string
  let input: HTMLInputElement

  export let autofocus: boolean | undefined = undefined

  $: urlValue = $urlStore

  if (autofocus === undefined) {
    autofocus = $urlStore === ''
  }

  export let placeholder =
    'Type the URL of a IIIF Image, Manifest, Collection or Georeference Annotation'

  function selectInputText() {
    input.focus()
    input.setSelectionRange(0, urlValue.length)
  }

  function handleFocus() {
    selectInputText()
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      urlValue = $urlStore
    }
  }

  function handleMouseup(event: Event) {
    event.preventDefault()
  }

  function submit() {
    if (urlValue) {
      setStoreValue(urlValue)
    }
  }

  function setStoreValue(urlValue: string) {
    $urlStore = urlValue
  }

  if (browser) {
    document.addEventListener('keyup', (event: KeyboardEvent) => {
      const target = event.target as Element
      if (event.key === '/' && target.nodeName.toLowerCase() !== 'input') {
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
    on:focus|preventDefault={handleFocus}
    on:keyup={handleKeyup}
    on:mouseup={handleMouseup}
    bind:value={urlValue}
    bind:this={input}
    class="bg-transparent w-full px-2 py-1 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form>
