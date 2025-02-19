<script lang="ts">
  import { page } from '$app/state'

  import {
    Images as ImagesIcon,
    Polygon as PolygonIcon,
    MapPinSimple as MapPinSimpleIcon,
    MapTrifold as MapTrifoldIcon,
    CaretRight as CaretRightIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId } from '$lib/shared/router.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'

  import ImageSelector from '$lib/components/ImageSelector.svelte'
  import Drawer from '$lib/components/Drawer.svelte'

  const sourceState = getSourceState()
  const mapsMergedState = getMapsMergedState()

  const resultsEnabled = $derived(mapsMergedState.completeMaps.length > 0)
</script>

{#snippet separator()}
  <div class="h-full flex items-center justify-center">
    <CaretRightIcon size={16} class="inline" weight="bold" color="#aaa" />
  </div>
{/snippet}

<div class="w-full h-full flex flex-col items-center p-2 gap-2">
  <nav
    class="p-1 z-10 grid grid-cols-[1fr_min-content_1fr_min-content_1fr_min-content_1fr] rounded-lg shadow-md font-semibold bg-white gap-2"
  >
    <a
      href={createRouteUrl(page, 'images', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId(page) === 'images' ? 'active' : undefined}
      class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-blue/25 flex items-center justify-center gap-2"
    >
      <ImagesIcon size={28} class="inline" />
      <span class="hidden md:inline-block">Images</span>
    </a>
    {@render separator()}
    <a
      href={createRouteUrl(page, 'mask', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId(page) === 'mask' ? 'active' : undefined}
      class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-green/25 flex items-center justify-center gap-2"
    >
      <PolygonIcon size={28} class="inline" />
      <span class="hidden md:inline-block">Draw mask</span>
    </a>
    {@render separator()}
    <a
      href={createRouteUrl(page, 'georeference', {
        image: sourceState.activeImageId || undefined
      })}
      data-state={getRouteId(page) === 'georeference' ? 'active' : undefined}
      class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-yellow/25 flex items-center justify-center gap-2"
    >
      <MapPinSimpleIcon size={28} class="inline" />
      <span class="hidden md:inline-block">Georeference</span>
    </a>
    {@render separator()}
    <a
      href={resultsEnabled
        ? createRouteUrl(page, 'results', {
            image: sourceState.activeImageId || undefined
          })
        : undefined}
      data-state={getRouteId(page) === 'results' ? 'active' : undefined}
      class={[
        !resultsEnabled && 'text-gray-400',
        resultsEnabled
          ? 'data-[state=active]:bg-pink/25'
          : 'data-[state=active]:bg-pink-100/25',
        'rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 flex items-center justify-center gap-2'
      ]}
    >
      <MapTrifoldIcon size={28} class="inline" />
      <span class="hidden md:inline-block">Results</span>
    </a>
  </nav>

  <div
    class="w-full h-full shrink min-h-0 flex gap-2 items-end justify-between *:relative *:z-10 *:pointer-events-auto"
  >
    {#if sourceState.imageCount > 1}
      <ImageSelector />
    {:else}
      <div></div>
    {/if}

    <Drawer />
  </div>
</div>
