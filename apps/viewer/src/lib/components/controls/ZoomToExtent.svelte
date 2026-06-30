<script lang="ts">
  import { ArrowsOut as ArrowsOutIcon } from 'phosphor-svelte'

  import Control from './Control.svelte'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  type Props = {
    onZoomToExtent: () => void
  }

  let { onZoomToExtent }: Props = $props()

  function handleClick() {
    onZoomToExtent()
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.key === '0') {
      onZoomToExtent()
    }
  }
</script>

<svelte:window onkeypress={handleKeyPress} />

<Control
  ariaLabel="Zoom to extent"
  title="Zoom to extent"
  onclick={handleClick}
>
  <ArrowsOutIcon class="size-full" />
</Control>
