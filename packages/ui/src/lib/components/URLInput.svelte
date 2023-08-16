<script lang="ts">
  import { onMount } from 'svelte'

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

  function handleInputKeyup(event: KeyboardEvent) {
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

  function handleDocumentKeyup(event: KeyboardEvent) {
    const target = event.target as Element
    if (event.key === '/' && target.nodeName.toLowerCase() !== 'input') {
      selectInputText()
    }
  }

  onMount(() => {
    document.addEventListener('keyup', handleDocumentKeyup)

    return () => {
      document.removeEventListener('keyup', handleDocumentKeyup)
    }
  })
</script>

<form
  class="flex items-center gap-2 w-full rounded-lg border border-gray-300 focus-within:border-blue-dark focus-within:ring-1 focus-within:ring-blue-dark text-sm"
  on:submit|preventDefault={submit}
>
  <!-- svelte-ignore a11y-autofocus -->
  <input
    type="input"
    {autofocus}
    on:focus|preventDefault={handleFocus}
    on:keyup={handleInputKeyup}
    on:mouseup={handleMouseup}
    bind:value={urlValue}
    bind:this={input}
    class="bg-transparent w-full rounded-lg px-2 py-1 focus:outline-none truncate"
    {placeholder}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form>
