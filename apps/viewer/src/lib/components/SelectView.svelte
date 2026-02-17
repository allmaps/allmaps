<script lang="ts">
  import ControlContainer from '$lib/components/ControlContainer.svelte'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  let isMapView = $derived(uiState.view === 'map')
  let isImageView = $derived(uiState.view === 'image')

  function handleKeyPress(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.key === 'm') {
      uiState.view = 'map'
    } else if (event.key === 'i') {
      uiState.view = 'image'
    }
  }
</script>

<svelte:window onkeypress={handleKeyPress} />

<ControlContainer>
  <button
    onclick={() => (uiState.view = 'map')}
    class={[
      'px-2 py-1 hover:bg-pink/10 hover:text-pink rounded transition-all cursor-pointer',
      ,
      isMapView && 'font-bold bg-pink/5 text-pink'
    ]}>Map</button
  >
  <button
    onclick={() => (uiState.view = 'image')}
    class={[
      'px-2 py-1 hover:bg-pink/10 hover:text-pink rounded transition-colors cursor-pointer',
      isImageView && 'font-bold bg-pink/5 text-pink'
    ]}>Image</button
  >
</ControlContainer>
