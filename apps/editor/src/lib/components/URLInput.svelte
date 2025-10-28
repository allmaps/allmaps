<script lang="ts">
  import { getUrlState } from '$lib/shared/params.js'

  import iiifLogoBlack from '$lib/images/iiif-black.svg'

  let urlState = getUrlState()

  type Props = {
    onSubmit: (url: string) => void
    // autofocus?: boolean
    placeholder?: string
  }

  let {
    onSubmit,
    // autofocus = false,
    placeholder = 'Open a IIIF resource from a URL'
  }: Props = $props()

  let value = $state(urlState.params.url)

  $effect(() => {
    if (urlState.params.url) {
      value = urlState.params.url
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
  class="shadow-xs flex w-full cursor-pointer items-center gap-1 rounded-full border border-gray-300 bg-white px-3
    py-0.5 text-sm transition-all focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500"
>
  <img src={iiifLogoBlack} class="size-4 opacity-75" alt="IIIF logo" />
  <input
    name="url"
    type="input"
    bind:value
    bind:this={input}
    onfocus={() => input.select()}
    class="focus:outline-hidden w-full truncate bg-transparent px-2 py-1"
    {placeholder}
  />
</form>
