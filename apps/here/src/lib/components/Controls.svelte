<script lang="ts">
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  import {
    ArrowLeft as ArrowLeftIcon,
    ArrowRight as ArrowRightIcon,
    SquaresFour as SquaresFourIcon
  } from 'phosphor-svelte'

  import { NorthArrow } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { createRouteUrl } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  import type { Snippet } from 'svelte'

  type Props = {
    mapId: string
    children?: Snippet
  }

  let { mapId, children }: Props = $props()

  const mapsState = getMapsState()
  const compassState = getCompassState()
  const uiState = getUiState()

  const hasMaps = $derived(mapsState.mapsWithImageInfo.length > 1)

  let previousMapId = $derived(mapsState.getPreviousMapId(mapId))
  let nextMapId = $derived(mapsState.getNextMapId(mapId))

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
      bind:clientWidth={uiState.elementSizes.bottom.left[0]}
      bind:clientHeight={uiState.elementSizes.bottom.left[1]}
      class="bg-white shadow hover:shadow-lg transition-shadow text-center self-end inline-flex rounded-md place-self-start pointer-events-auto"
    >
      <a
        href={createRouteUrl(page, '/')}
        role="button"
        class="place-self-start self-end px-2 py-2 text-sm font-medium bg-white rounded-l-lg
      focus:z-10 focus:ring-2 focus:ring-pink-500 max-w-48 pointer-events-auto shadow
      flex flex-row items-center gap-1"
      >
        <SquaresFourIcon size="20" weight="bold" />
        <span class="hidden sm:inline">More maps</span></a
      >
      <a
        href={createRouteUrl(page, getAllmapsId(previousMapId))}
        role="button"
        class="px-2 py-2 text-sm font-medium bg-white border border-gray-200 focus:z-10 focus:ring-2 focus:ring-pink-500"
        ><ArrowLeftIcon size="16" weight="bold" /></a
      >
      <a
        href={createRouteUrl(page, getAllmapsId(nextMapId))}
        role="button"
        class="px-2 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-lg focus:z-10 focus:ring-2 focus:ring-pink-500"
        ><ArrowRightIcon size="16" weight="bold" /></a
      >
    </div>
  {:else}
    <a
      bind:clientWidth={uiState.elementSizes.bottom.left[0]}
      bind:clientHeight={uiState.elementSizes.bottom.left[1]}
      href={createRouteUrl(page, '/')}
      role="button"
      class="place-self-start self-end px-2 py-2 text-sm font-medium bg-white rounded-lg
      focus:z-10 focus:ring-2 focus:ring-pink-500 max-w-48 pointer-events-auto shadow
      flex flex-row items-center gap-1"
    >
      <SquaresFourIcon size="20" weight="bold" />
      <span class="hidden sm:inline">More maps</span></a
    >
  {/if}

  <div
    class="place-self-end"
    bind:clientWidth={uiState.elementSizes.bottom.center[0]}
    bind:clientHeight={uiState.elementSizes.bottom.center[1]}
  >
    {#if children}
      {@render children()}
    {/if}
  </div>

  <div
    bind:clientWidth={uiState.elementSizes.bottom.right[0]}
    bind:clientHeight={uiState.elementSizes.bottom.right[1]}
    class="pointer-events-auto place-self-end"
  >
    {#if compassState.rotation !== undefined}
      <div class="contents" in:fade>
        <NorthArrow
          rotation={compassState.rotation}
          followOrientation={compassState.compassMode === 'follow-orientation'}
          on:click={handleNorthArrowClick}
        />
      </div>
    {/if}
  </div>
</div>
