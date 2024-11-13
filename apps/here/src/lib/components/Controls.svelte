<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  import { mapsWithImageInfo } from '$lib/shared/stores/maps-with-image-info.js'
  import { previousMapId, nextMapId } from '$lib/shared/stores/selected-map.js'

  import { NorthArrow } from '@allmaps/ui'

  import { orientation } from '$lib/shared/stores/orientation.js'
  import {
    compassMode,
    nextCompassMode
  } from '$lib/shared/stores/compass-mode.js'
  import { rotation } from '$lib/shared/stores/rotation.js'
  import { bearing } from '$lib/shared/stores/selected-map.js'

  const hasMaps = $mapsWithImageInfo.length > 0

  $: {
    if ($compassMode === 'image') {
      $rotation = $bearing
    } else if ($compassMode === 'north') {
      $rotation = 0
    } else if ($compassMode === 'follow-orientation' && $orientation?.alpha) {
      $rotation = -$orientation?.alpha
    }
  }

  function handleNorthArrowClick() {
    nextCompassMode()
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'BracketLeft' && $previousMapId !== undefined) {
      goto(`/?url=${$previousMapId}`)
    } else if (event.code === 'BracketRight' && $nextMapId !== undefined) {
      goto(`/?url=${$nextMapId}`)
    }
  }

  onMount(() => {
    document.addEventListener('keyup', handleKeyup)

    return () => {
      document.removeEventListener('keyup', handleKeyup)
    }
  })
</script>

<div class="w-full grid grid-cols-[1fr,min-content,1fr] pointer-events-none">
  <div></div>

  <div class="inline-flex rounded-md self-end shadow-sm pointer-events-auto">
    {#if hasMaps}
      <a
        href="/?url={$previousMapId}"
        role="button"
        class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
        >Previous</a
      >

      <a
        href="/?url={$nextMapId}"
        role="button"
        class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
        >Next</a
      >
    {:else}
      <a
        href="/"
        role="button"
        class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
        >Show maps around current location</a
      >
    {/if}
  </div>

  <div class="pointer-events-auto place-self-end">
    <NorthArrow
      rotation={$rotation}
      followOrientation={$compassMode === 'follow-orientation'}
      on:click={handleNorthArrowClick}
    />
  </div>
</div>
