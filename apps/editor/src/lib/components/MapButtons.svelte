<script lang="ts">
  import {
    MagnifyingGlass as MagnifyingGlassIcon,
    CornersOut as CornersOutIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import Popover from '$lib/components/Popover.svelte'
  import Geocoder from '$lib/components/popovers/Geocoder.svelte'

  type Props = {
    showGeocoder: boolean
  }

  let { showGeocoder }: Props = $props()

  const uiState = getUiState()

  function handleZoomToExtentClick() {
    uiState.zoomToExtent()
  }
</script>

<div class="flex flex-row gap-1 justify-self-end">
  {#if showGeocoder}
    <Popover>
      {#snippet button()}
        <div
          class="bg-white size-8 sm:size-10 transition-all rounded-full p-2 shadow-md"
        >
          <MagnifyingGlassIcon size="100%" />
        </div>
      {/snippet}

      {#snippet contents()}<Geocoder />{/snippet}
    </Popover>
  {/if}
  <button
    class="bg-white size-8 sm:size-10 transition-all rounded-full p-2 shadow-md cursor-pointer"
    onclick={handleZoomToExtentClick}
  >
    <CornersOutIcon size="100%" />
  </button>
</div>
