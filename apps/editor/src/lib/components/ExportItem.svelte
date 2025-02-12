<script lang="ts">
  import { ArrowSquareOut as ArrowSquareOutIcon } from 'phosphor-svelte'

  import Copy from '$lib/components/Copy.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    url: string
    openUrl?: string
    label: string
    children?: Snippet
  }

  let { url, openUrl, label, children }: Props = $props()

  let input: HTMLInputElement

  function handleFocus() {
    input.select()
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-row items-center gap-2">
    <a class="font-bold contents" href={openUrl || url}
      ><span>{label}</span> <ArrowSquareOutIcon /></a
    >
  </div>
  {#if children}
    <div>{@render children()}</div>
  {/if}
  <div class="flex justify-between items-center gap-2">
    <input
      bind:this={input}
      readonly
      type="text"
      value={url}
      class="w-full px-2 py-1 rounded-lg bg-white outline-none border-solid border-gray-100 border-1 transition-colors
      focus-visible:border-pink inset-shadow-xs"
      onfocus={handleFocus}
    />
    <Copy text={url} />
  </div>
</div>
