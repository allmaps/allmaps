<script lang="ts">
  import * as Dialog from '$lib/dialog.js'
  import { Button } from '$lib/button.js'
  import type { DialogExampleProps } from './DialogPlayground.svelte'

  let { backdrop, onOpenChange }: DialogExampleProps = $props()

  const sheets = Array.from({ length: 48 }, (_, index) => ({
    number: index + 1,
    reference:
      String.fromCharCode(65 + Math.floor(index / 8)) + ((index % 8) + 1)
  }))
</script>

<Dialog.Root {onOpenChange}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props}>Long dialog</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content {backdrop}>
    {#snippet stickyHeader()}
      <Dialog.Title>Atlas sheet index</Dialog.Title>
    {/snippet}
    <Dialog.Description class="text-center sm:text-start">
      Grid references for all 48 map sheets.
    </Dialog.Description>
    <ol class="m-0 list-none p-0">
      {#each sheets as sheet (sheet.number)}
        <li
          class="flex items-baseline justify-between gap-4 border-b border-gray-200 py-2 text-sm last:border-0"
        >
          <span>Sheet {sheet.number}</span>
          <span class="font-mono text-gray-600">{sheet.reference}</span>
        </li>
      {/each}
    </ol>
  </Dialog.Content>
</Dialog.Root>
