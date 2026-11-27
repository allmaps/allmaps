<script lang="ts">
  import * as Dialog from '$lib/dialog.js'
  import { Button } from '$lib/button.js'
  import Playground from './Playground.svelte'

  const sheets = Array.from({ length: 48 }, (_, index) => ({
    number: index + 1,
    reference:
      String.fromCharCode(65 + Math.floor(index / 8)) + ((index % 8) + 1)
  }))
</script>

<Playground>
  {#snippet preview()}
    <div class="flex flex-wrap justify-center gap-3">
      <Dialog.Root>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button {...props}>Open short example</Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Header>
            <Dialog.Title class="px-8 sm:ps-0">About this atlas</Dialog.Title>
            <Dialog.Description>
              This atlas contains 48 map sheets, arranged from west to east in
              six rows.
            </Dialog.Description>
          </Dialog.Header>
        </Dialog.Content>
      </Dialog.Root>
      <Dialog.Root>
        <Dialog.Trigger>
          {#snippet child({ props })}
            <Button {...props}>Open long example</Button>
          {/snippet}
        </Dialog.Trigger>
        <Dialog.Content
          class="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)]"
        >
          <Dialog.Header>
            <Dialog.Title class="px-8 sm:ps-0">Atlas sheet index</Dialog.Title>
            <Dialog.Description
              >Grid references for all 48 map sheets.</Dialog.Description
            >
          </Dialog.Header>
          <ol class="m-0 list-none overflow-y-auto overscroll-contain p-0">
            {#each sheets as sheet (sheet.number)}
              <li
                class="flex items-baseline justify-between gap-4 border-b border-gray-200 py-2 pe-2 text-sm last:border-0"
              >
                <span>Sheet {sheet.number}</span>
                <span class="font-mono text-gray-600">{sheet.reference}</span>
              </li>
            {/each}
          </ol>
        </Dialog.Content>
      </Dialog.Root>
    </div>
  {/snippet}
</Playground>
