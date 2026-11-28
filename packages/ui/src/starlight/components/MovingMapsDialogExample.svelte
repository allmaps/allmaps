<script lang="ts">
  import * as Dialog from '$lib/dialog.js'
  import { Button } from '$lib/button.js'
  import MovingMapsBackground from '$lib/components/MovingMapsBackground.svelte'
  import type { DialogExampleProps } from './DialogPlayground.svelte'

  let { backdrop, onOpenChange }: DialogExampleProps = $props()
  const mapsApiBaseUrl = import.meta.env.PUBLIC_REST_BASE_URL
</script>

<Dialog.Root {onOpenChange}>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button {...props}>Moving maps</Button>
    {/snippet}
  </Dialog.Trigger>
  <Dialog.Content {backdrop}>
    {#snippet background()}
      <MovingMapsBackground {mapsApiBaseUrl} />
    {/snippet}
    <Dialog.Header>
      <Dialog.Title class="px-8 sm:ps-0">Moving maps</Dialog.Title>
      <Dialog.Description>
        Each colored outline comes from a georeferenced map in Allmaps. When you
        open the dialog, the background loads maps from the Allmaps API and uses
        their control points to trace the shape each map covers on the ground.
        The outlines are drawn at a small scale so you can see their different
        shapes as they drift and rotate behind the dialog.
      </Dialog.Description>
    </Dialog.Header>
  </Dialog.Content>
</Dialog.Root>
