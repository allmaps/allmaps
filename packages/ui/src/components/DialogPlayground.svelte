<script lang="ts">
  import * as Dialog from '$lib/dialog.js'
  import { Button } from '$lib/button.js'
  import Playground from './Playground.svelte'
</script>

<Playground>
  {#snippet preview()}
    <Dialog.Root>
      <Dialog.Trigger>
        {#snippet child({ props })}
          <Button {...props}>About this atlas</Button>
        {/snippet}
      </Dialog.Trigger>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>About this atlas</Dialog.Title>
          <Dialog.Description
            >This atlas contains 48 map sheets.</Dialog.Description
          >
        </Dialog.Header>
      </Dialog.Content>
    </Dialog.Root>
  {/snippet}
</Playground>
