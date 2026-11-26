<script lang="ts">
  import * as Dialog from '$lib/dialog.js'
  import { Button } from '$lib/button.js'
  import type { DialogExampleProps } from './DialogPlayground.svelte'

  let { backdrop, onOpenChange }: DialogExampleProps = $props()
</script>

<Dialog.Root {onOpenChange}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props}>Short dialog</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content {backdrop}>
    <Dialog.Header>
      <Dialog.Title class="px-8 sm:ps-0">About this atlas</Dialog.Title>
      <Dialog.Description>
        This atlas contains 48 map sheets, arranged from west to east in six
        rows.
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
