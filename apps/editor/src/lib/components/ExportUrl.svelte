<script lang="ts">
  import { ArrowSquareOut as ArrowSquareOutIcon } from 'phosphor-svelte'

  import Copy from '$lib/components/CopyButton.svelte'

  import type { Snippet } from 'svelte'

  type Props = {
    url: string
    openUrl?: string
    label: string
    header?: Snippet
    children?: Snippet
  }

  let { url, openUrl, label, header, children }: Props = $props()

  let input: HTMLInputElement

  function handleFocus() {
    input.select()
  }
</script>

<div class="flex flex-col gap-2">
  <div class="flex flex-row items-center justify-between gap-2">
    <h3 class="text-lg font-bold">
      <a class="inline-flex items-center gap-2" href={openUrl || url}
        ><span>{label}</span> <ArrowSquareOutIcon /></a
      >
    </h3>

    {#if header}
      <div>{@render header()}</div>
    {/if}
  </div>
  {#if children}
    <div class="contents">
      {@render children()}
    </div>
  {/if}
  <div class="flex items-center justify-between gap-2">
    <input
      bind:this={input}
      readonly
      type="text"
      value={url}
      class="w-full rounded-lg border-1 border-solid border-gray-100 bg-white px-2 py-1 inset-shadow-xs transition-colors
      outline-none focus-visible:border-pink"
      onfocus={handleFocus}
    />
    <Copy value={url} />
  </div>
</div>
