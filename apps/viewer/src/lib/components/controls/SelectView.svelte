<script lang="ts">
  import { Globe as GlobeIcon, Image as ImageIcon } from 'phosphor-svelte'

  import ControlContainer from './ControlContainer.svelte'
  import Control from './Control.svelte'

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
  <Control
    ariaLabel="Show map view"
    title="Show map view"
    size="large"
    active={isMapView}
    pressed={isMapView}
    onclick={() => (uiState.view = 'map')}
  >
    <GlobeIcon class="size-full" />
    {#snippet label()}Map{/snippet}
  </Control>
  <Control
    ariaLabel="Show image view"
    title="Show image view"
    size="large"
    active={isImageView}
    pressed={isImageView}
    onclick={() => (uiState.view = 'image')}
  >
    <ImageIcon class="size-full" />
    {#snippet label()}Image{/snippet}
  </Control>
</ControlContainer>
