<script lang="ts">
  import { Globe as GlobeIcon, Image as ImageIcon } from 'phosphor-svelte'

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
      'px-2 py-1 hover:bg-pink/10 hover:text-pink rounded transition-all cursor-pointer font-medium',
      isMapView && 'bg-pink/5 text-pink flex items-center gap-1'
    ]}
  >
    <GlobeIcon class="size-6 inline min-[400px]:hidden" />
    <span class="hidden min-[400px]:inline">Map</span></button
  >
  <button
    onclick={() => (uiState.view = 'image')}
    class={[
      'px-2 py-1 hover:bg-pink/10 hover:text-pink rounded transition-colors cursor-pointer font-medium',
      isImageView && 'bg-pink/5 text-pink flex items-center gap-1'
    ]}
  >
    <ImageIcon class="size-6 inline min-[400px]:hidden" />
    <span class="hidden min-[400px]:inline">Image</span></button
  >
</ControlContainer>
