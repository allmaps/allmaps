<script lang="ts">
  import { UrlState } from '$lib/state/url.svelte.js'

  import iiifLogoBlack from '$lib/images/iiif-black.svg'

  type Props = {
    urlState: UrlState
    onSubmit: (url: string) => void
    autofocus?: boolean
    placeholder?: string
  }

  let {
    urlState,
    onSubmit,
    autofocus = false,
    placeholder = 'Open a IIIF resource from a URL'
  }: Props = $props()

  let value = $state(urlState.url)

  $effect(() => {
    if (urlState.url) {
      value = urlState.url
    } else {
      value = ''
    }
  })

  let input: HTMLInputElement

  function handleSubmit(event: Event) {
    event.preventDefault()

    if (value) {
      onSubmit(value)
    }
  }
</script>

<form
  onsubmit={handleSubmit}
  class="text-sm flex items-center px-3 py-0.5 gap-1 w-full rounded-full shadow-xs focus-within:shadow-lg bg-white
    border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-all"
>
  <img src={iiifLogoBlack} class="size-4 opacity-75" alt="IIIF logo" />
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="input"
    {autofocus}
    bind:value
    bind:this={input}
    class="bg-transparent w-full px-2 py-1 focus:outline-hidden truncate"
    {placeholder}
  />
</form>
