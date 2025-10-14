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

<div class="flex flex-col sm:flex-row gap-1 justify-self-end">
  <Popover
    bind:open={
      () => uiState.getPopoverOpen('mapSettings'),
      (open) => uiState.setPopoverOpen('mapSettings', open)
    }
    disabled={!mapSettingsEnabled}
  >
    {#snippet button()}
      <div class="bg-white size-8 transition-all rounded-full p-1.5 shadow-md">
        <GearSixIcon size="100%" weight="regular" />
      </div>
    {/snippet}

    {#snippet contents()}<MapSettings />{/snippet}
  </Popover>

  <Popover
    disabled={!geocoderEnabled}
    bind:open={
      () => uiState.getPopoverOpen('geocoder'),
      (open) => uiState.setPopoverOpen('geocoder', open)
    }
  >
    {#snippet button()}
      <div class="bg-white size-8 transition-all rounded-full p-1.5 shadow-md">
        <MagnifyingGlassIcon size="100%" weight="regular" />
      </div>
    {/snippet}

    {#snippet contents()}<Geocoder
        bind:open={
          () => uiState.getPopoverOpen('geocoder'),
          (open) => uiState.setPopoverOpen('geocoder', open)
        }
      />{/snippet}
  </Popover>

  <button
    disabled={!zoomToExtentEnabled}
    class="bg-white size-8 transition-all rounded-full p-1.5 shadow-md not-disabled:cursor-pointer disabled:text-gray"
    onclick={handleZoomToExtentClick}
  >
    <CornersOutIcon size="100%" weight="regular" />
  </button>
</div>
