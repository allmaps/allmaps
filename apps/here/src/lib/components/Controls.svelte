<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon,
    GpsFix as GpsFixIcon
  } from 'phosphor-svelte'

  import { NorthArrow } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'

  import { createRouteUrl } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  import type { Snippet } from 'svelte'

  type Props = {
    selectedMapId: string
    children?: Snippet
  }

  let { selectedMapId, children }: Props = $props()

  const mapsState = getMapsState()
  const compassState = getCompassState()

  const hasMaps = $derived(mapsState.mapsWithImageInfo.length > 1)

  let previousMapId = $derived(mapsState.getPreviousMapId(selectedMapId))
  let nextMapId = $derived(mapsState.getNextMapId(selectedMapId))

  function handleNorthArrowClick() {
    compassState.nextCompassMode()
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'BracketLeft' && previousMapId) {
      goto(createRouteUrl(page, getAllmapsId(previousMapId)))
    } else if (event.code === 'BracketRight' && nextMapId) {
      goto(createRouteUrl(page, getAllmapsId(nextMapId)))
    }
  }

  onMount(() => {
    document.addEventListener('keyup', handleKeyup)

    return () => {
      document.removeEventListener('keyup', handleKeyup)
    }
  })
</script>

<div class="w-full grid grid-cols-[1fr_max-content_1fr] items-center gap-2">
  {#if hasMaps && previousMapId && nextMapId}
    <div
      class="bg-white shadow text-center self-center inline-grid grid-cols-2 rounded-md place-self-start pointer-events-auto"
    >
      <a
        href={createRouteUrl(page, getAllmapsId(previousMapId))}
        role="button"
        class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg focus:z-10 focus:ring-2 focus:ring-pink-500"
        ><CaretLeftIcon size="16" weight="bold" /></a
      >
      <a
        href={createRouteUrl(page, getAllmapsId(nextMapId))}
        role="button"
        class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-lg focus:z-10 focus:ring-2 focus:ring-pink-500"
        ><CaretRightIcon size="16" weight="bold" /></a
      >
    </div>
  {:else}
    <a
      href="/"
      role="button"
      class="place-self-start self-center px-2 py-2 text-sm font-medium bg-white rounded-lg
      focus:z-10 focus:ring-2 focus:ring-pink-500 max-w-48 pointer-events-auto shadow
      flex flex-row items-center gap-1"
    >
      <GpsFixIcon size="20" weight="bold" />
      <span>More maps</span></a
    >
    <!-- TODO:
     Add dropdown with options:
      - "Find more maps around your location"
      - "Find more maps around shared location"
      - "Find more maps around both locations"
      -->
  {/if}

  {#if children}
    {@render children()}
  {:else}
    <div class="contents"></div>
  {/if}

  <div class="pointer-events-auto place-self-end">
    <NorthArrow
      rotation={compassState.rotation}
      followOrientation={compassState.compassMode === 'follow-orientation'}
      on:click={handleNorthArrowClick}
    />
  </div>
</div>
