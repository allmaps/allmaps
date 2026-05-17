<script lang="ts">
  import { CornersOut as CornersOutIcon } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import ControlContainer from '$lib/components/ControlContainer.svelte'

  const uiState = getUiState()

  function handleClick() {
    uiState.dispatchZoomToExtent()
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }
    if (event.key === '0') {
      uiState.dispatchZoomToExtent()
    }
  }
</script>

<svelte:window onkeypress={handleKeyPress} />

<ControlContainer>
  <button
    onclick={handleClick}
    class="cursor-pointer hover:bg-pink/10 hover:text-pink rounded transition-colors"
  >
    <CornersOutIcon class="size-5" weight="bold" />
  </button>
</ControlContainer>
