<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'

  import urlStore from '$lib/shared/stores/url.js'

  const dispatch = createEventDispatcher()

  let urlValues: string[] = []
  let input: HTMLInputElement

  export let autofocus: boolean | undefined = undefined

  $: urlValues = $urlStore

  $: {
    dispatch('value', {
      value: urlValues
    })
  }
  $: console.log('urlStore', $urlStore)

  if (autofocus === undefined) {
    autofocus = $urlStore.length === 0
  }

  export let placeholder =
    'Type URLs of IIIF Images, Manifests, Collections or Georeference Annotations (separated by commas)'

  function selectInputText() {
    input.focus()
    input.setSelectionRange(0, input.value.length)
  }

  function handleFocus() {
    selectInputText()
  }

  function handleInputKeyup(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      input.value = $urlStore.join(', ')
    }
    console.log('input', input.value)
    //submit()
  }

  function handleMouseup(event: Event) {
    event.preventDefault()
  }

  export function getValue(): string[] {
    return input.value.split(',').map(url => url.trim()).filter(url => url !== '')
  }

  export function submit() {
    console.log('submit')
    const urls = getValue()
    console.log('urls', urls)
    if (urls.length > 0) {
      setStoreValue(urls)
    }
  }

  function setStoreValue(urls: string[]) {
    urlStore.set(urls)
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
  class="flex items-center gap-2 w-full rounded-lg border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 text-sm"
  on:submit|preventDefault={submit}
>
  <!-- svelte-ignore a11y-autofocus -->
  <input
    type="input"
    {autofocus}
    on:focus|preventDefault={handleFocus}
    on:keyup={handleInputKeyup}
    on:mouseup={handleMouseup}
    bind:this={input}
    class="bg-transparent w-full rounded-lg px-2 py-1 focus:outline-none truncate"
    {placeholder}
    value={$urlStore.join(', ')}
  />
  <div class="shrink-0">
    <slot />
  </div>
</form>