<script module lang="ts">
  import { svelteExample } from './playground-usage.js'
  const sides = ['top', 'right', 'bottom', 'left'] as const
  export function formatUsage(side: (typeof sides)[number] = 'top') {
    return svelteExample(
      ["import * as Tooltip from '@allmaps/ui/tooltip'"],
      `<Tooltip.Root>
  <Tooltip.Trigger aria-label="Source information">Info</Tooltip.Trigger>
  <Tooltip.Content side="${side}">View source metadata</Tooltip.Content>
</Tooltip.Root>`
    )
  }
</script>

<script lang="ts">
  import * as Tooltip from '$lib/tooltip.js'
  import Playground from './Playground.svelte'
  import PlaygroundSelect from './PlaygroundSelect.svelte'
  let side = $state<(typeof sides)[number]>('top')
</script>

<Playground usage={formatUsage(side)}>
  {#snippet preview()}
    <Tooltip.Root>
      <Tooltip.Trigger
        aria-label="Source information"
        class="cursor-pointer rounded-ui border border-border bg-background px-3 py-1 text-foreground"
        >Info</Tooltip.Trigger
      >
      <Tooltip.Content {side}>View source metadata</Tooltip.Content>
    </Tooltip.Root>
  {/snippet}
  {#snippet controls()}
    <PlaygroundSelect label="Side" options={sides} bind:value={side} />
  {/snippet}
</Playground>
