<script lang="ts">
  type Props = {
    url?: string
    onsubmit: (url: string) => void
    autofocus?: boolean
    placeholder?: string
  }

  let {
    url,
    onsubmit,
    autofocus = false,
    placeholder = 'Open a IIIF resource from a URL'
  }: Props = $props()

  let value = $state(url || '')

  $effect(() => {
    if (url) {
      value = url
    } else {
      value = ''
    }
  })

  let input: HTMLInputElement

  function handleSubmit(event: Event) {
    event.preventDefault()

    if (value) {
      onsubmit(value)
    }
  }
</script>

<form
  onsubmit={handleSubmit}
  class="text-sm flex items-center cursor-pointer px-3 py-0.5 gap-1 w-full rounded-full shadow-xs focus-within:shadow-lg bg-white
    border border-gray-300 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-all"
>
  <!-- svelte-ignore a11y_autofocus -->
  <input
    name="url"
    type="input"
    {autofocus}
    bind:value
    bind:this={input}
    class="bg-transparent w-full px-2 py-1 focus:outline-hidden truncate"
    {placeholder}
  />
</form>
