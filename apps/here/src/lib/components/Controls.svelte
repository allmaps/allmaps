<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'
  import { goto } from '$app/navigation'

  import {
    CaretLeft as CaretLeftIcon,
    CaretRight as CaretRightIcon,
    Envelope as EnvelopeIcon
  } from 'phosphor-svelte'

  import { NorthArrow } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'

  import { createRouteUrl, getFrom } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'

  type Props = {
    selectedMapId: string
  }

  let { selectedMapId }: Props = $props()

  const mapsState = getMapsState()
  const compassState = getCompassState()
  const sensorsState = getSensorsState()

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

<div class="w-full grid grid-cols-[1fr_max-content_1fr]">
  {#if hasMaps && previousMapId && nextMapId}
    <div
      class="bg-white text-center self-center inline-grid grid-cols-2 rounded-md place-self-start shadow-xs pointer-events-auto"
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
      class="place-self-start px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg focus:z-10 focus:ring-2 focus:ring-pink-500"
      >More maps</a
    >
  {/if}

  {#if sensorsState.position}
    <a
      class="bg-white rounded-lg self-center pointer-events-auto px-4 py-2 flex gap-2"
      href={createRouteUrl(page, `${getAllmapsId(selectedMapId)}/share`, {
        from: getFrom(sensorsState.position)
      })}
    >
      <EnvelopeIcon size="24" />
      <span>Share this map</span>
    </a>
  {:else}
    <div></div>
  {/if}

  <div class="pointer-events-auto place-self-end">
    <NorthArrow
      rotation={compassState.rotation}
      followOrientation={compassState.compassMode === 'follow-orientation'}
      on:click={handleNorthArrowClick}
    />
  </div>
</div>
