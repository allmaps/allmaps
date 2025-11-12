<script lang="ts">
  import {
    MagnifyingGlass as MagnifyingGlassIcon,
    CornersOut as CornersOutIcon,
    GearSix as GearSixIcon
  } from 'phosphor-svelte'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import { Popover } from '@allmaps/components'

  import MapSettings from '$lib/components/popovers/MapSettings.svelte'
  import Geocoder from '$lib/components/popovers/Geocoder.svelte'

  type Props = {
    zoomToExtentEnabled: boolean
    geocoderEnabled: boolean
    mapSettingsEnabled: boolean
  }

  let { zoomToExtentEnabled, geocoderEnabled, mapSettingsEnabled }: Props =
    $props()

  // let geocoderOpen = $state(false)

  const uiState = getUiState()

  function handleZoomToExtentClick() {
    uiState.dispatchZoomToExtent()
  }
</script>

<div class="flex flex-col gap-1 justify-self-end sm:flex-row">
  <Popover
    bind:open={uiState.popoverOpen.mapSettings}
    disabled={!mapSettingsEnabled}
  >
    {#snippet button()}
      <div class="size-8 rounded-full bg-white p-1.5 shadow-md transition-all">
        <GearSixIcon size="100%" weight="regular" />
      </div>
    {/snippet}

    {#snippet contents()}<MapSettings />{/snippet}
  </Popover>

  <Popover disabled={!geocoderEnabled} bind:open={uiState.popoverOpen.geocoder}>
    {#snippet button()}
      <div class="size-8 rounded-full bg-white p-1.5 shadow-md transition-all">
        <MagnifyingGlassIcon size="100%" weight="regular" />
      </div>
    {/snippet}

    {#snippet contents()}<Geocoder
        bind:open={uiState.popoverOpen.geocoder}
      />{/snippet}
  </Popover>

  <button
    disabled={!zoomToExtentEnabled}
    class="size-8 rounded-full bg-white p-1.5 shadow-md transition-all not-disabled:cursor-pointer disabled:text-gray"
    onclick={handleZoomToExtentClick}
  >
    <CornersOutIcon size="100%" weight="regular" />
  </button>
</div>
