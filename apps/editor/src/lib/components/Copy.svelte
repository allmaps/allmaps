<script lang="ts">
  import { onMount } from 'svelte'

  import { Copy as CopyIcon, Check as CheckIcon } from 'phosphor-svelte'

  type Props = {
    text: string
  }

  let { text }: Props = $props()

  let showCheckInterval = $state<number | null>(null)

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text)

      showCheckInterval = window.setTimeout(() => {
        showCheckInterval = null
      }, 1000)
    } catch {}
  }

  onMount(() => {
    return () => {
      if (showCheckInterval) {
        clearInterval(showCheckInterval)
      }
    }
  })
</script>

<button
  class="cursor-pointer relative size-8 rounded-full aspect-square
   flex justify-center items-center"
  title="Copy to clipboard"
  onclick={handleClick}
>
  {#if showCheckInterval}
    <CheckIcon class="text-green" size={24} />
  {:else}
    <CopyIcon class="text-gray-500" size={24} />
  {/if}
</button>
