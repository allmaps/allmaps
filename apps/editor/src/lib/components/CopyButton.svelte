<script lang="ts">
  import { onMount } from 'svelte'

  import { Copy as CopyIcon, Check as CheckIcon } from 'phosphor-svelte'

  type Props = {
    value: string
  }

  let { value }: Props = $props()

  let showCheckInterval = $state<number>()

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value)

      showCheckInterval = window.setTimeout(() => {
        showCheckInterval = undefined
      }, 1000)
    } catch {
      console.error('Copying to clipboard failed')
    }
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
  class="relative flex aspect-square size-8 cursor-pointer
   items-center justify-center rounded-full"
  title="Copy to clipboard"
  onclick={handleClick}
>
  {#if showCheckInterval}
    <CheckIcon class="text-green" size={24} />
  {:else}
    <CopyIcon class="text-gray-500" size={24} />
  {/if}
</button>
