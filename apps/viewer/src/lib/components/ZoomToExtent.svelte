<script lang="ts">
  import { ArrowsOut as ArrowsOutIcon } from 'phosphor-svelte'

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

<button
  onclick={handleClick}
  class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
>
  <ArrowsOutIcon class="size-5" />
</button>
