<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import * as Dialog from '$lib/dialog.js'

  let {
    backdrop,
    background,
    open = true
  }: Pick<ComponentProps<typeof Dialog.Content>, 'backdrop' | 'background'> & {
    open?: boolean
  } = $props()
</script>

<Dialog.Root {open}>
  <Dialog.Content {backdrop} {background}>
    <Dialog.Title>About this atlas</Dialog.Title>
  </Dialog.Content>
</Dialog.Root>
