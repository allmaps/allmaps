<script lang="ts">
  type Props = {
    placeholder: string
    baseUrl: string
  }

  const { placeholder, baseUrl }: Props = $props()

  let value = $state('')

  function handleSubmit(event: SubmitEvent) {
    const url = `${baseUrl}${value}`
    window.open(url, '_blank')?.focus()

    event.preventDefault
  }

  let disabled = $derived(value.length === 0)
</script>

<form onsubmit={handleSubmit} class="flex gap-2 mt-3">
  <input
    bind:value
    type="text"
    {placeholder}
    class="font-mono block px-2 py-1 w-full rounded-lg border border-gray-300 focus-within:ring-1 focus-within:ring-pink-500 focus-within:border-pink-500 text-sm"
  />

  <button
    type="submit"
    {disabled}
    class="text-white bg-pink-500 hover:bg-pink-400 no-underline transition-colors disabled:bg-gray-500 focus:ring focus:ring-pink-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 focus:outline-none shrink-0"
  >
    Open
  </button>
</form>
