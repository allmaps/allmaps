<script lang="ts">
  import { page } from '$app/state'
  import { fade } from 'svelte/transition'

  import {
    Images as ImagesIcon,
    Polygon as PolygonIcon,
    MapPinSimple as MapPinSimpleIcon,
    MapTrifold as MapTrifoldIcon,
    CaretRight as CaretRightIcon,
    List as ListIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId } from '$lib/shared/router.js'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'

  import { Popover } from '@allmaps/components'

  import MapButtons from '$lib/components/MapButtons.svelte'
  import ImageSelector from '$lib/components/ImageSelector.svelte'
  import Maps from '$lib/components/popovers/Maps.svelte'
  import Scope from '$lib/components/Scope.svelte'

  const sourceState = getSourceState()
  const scopeState = getScopeState()
  const mapsMergedState = getMapsMergedState()

  let resultsEnabled = $derived(mapsMergedState.completeMaps.length > 0)

  let isMapView = $derived(
    page.route.id === '/georeference' || page.route.id === '/results'
  )

  let isImageView = $derived(
    page.route.id === '/mask' || page.route.id === '/georeference'
  )

  let isResultsView = $derived(page.route.id === '/results')
</script>

{#snippet separator()}
  <div class="h-full flex items-center justify-center">
    <CaretRightIcon size={16} class="inline" weight="bold" color="#aaa" />
  </div>
{/snippet}

<div class="w-full h-full flex flex-col items-center justify-between p-2 gap-2">
  <div
    class="w-full z-10 grid grid-cols-[1fr_max-content_1fr] gap-2 items-start md:items-center
      pointer-events-none *:pointer-events-auto"
  >
    <div></div>
    <nav
      class="p-1 grid grid-cols-[1fr_min-content_1fr_min-content_1fr_min-content_1fr] rounded-lg shadow-md font-semibold bg-white gap-0.5 sm:gap-1"
    >
      <a
        href={createRouteUrl(page, 'images', {
          image: sourceState.activeImageId || undefined
        })}
        data-state={getRouteId(page) === 'images' ? 'active' : undefined}
        class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-blue/25 hover:bg-blue/10 flex items-center justify-center gap-2"
      >
        <ImagesIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Images</span>
      </a>
      {@render separator()}
      <a
        href={createRouteUrl(page, 'mask', {
          image: sourceState.activeImageId || undefined
        })}
        data-state={getRouteId(page) === 'mask' ? 'active' : undefined}
        class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-green/25 hover:bg-green/10 flex items-center justify-center gap-2"
      >
        <PolygonIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Draw mask</span>
      </a>
      {@render separator()}
      <a
        href={createRouteUrl(page, 'georeference', {
          image: sourceState.activeImageId || undefined
        })}
        data-state={getRouteId(page) === 'georeference' ? 'active' : undefined}
        class="rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 data-[state=active]:bg-yellow/25 hover:bg-yellow/10
          flex items-center justify-center gap-2"
      >
        <MapPinSimpleIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Georeference</span>
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
            ? 'data-[state=active]:bg-pink/25 hover:bg-pink/10'
            : 'data-[state=active]:bg-pink-100/25',
          'rounded-md transition-colors px-2 py-1 sm:px-4 sm:py-2 bg-white duration-200 flex items-center justify-center gap-2'
        ]}
      >
        <MapTrifoldIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Results</span>
      </a>
    </nav>

    <div class="contents">
      {#if isMapView || isImageView}
        <MapButtons
          geocoderEnabled={isMapView}
          zoomToExtentEnabled={isMapView || isImageView}
          mapSettingsEnabled={isMapView}
        />
      {/if}
    </div>
  </div>

  <!-- class="w-full h-full shrink min-h-0 flex gap-2 items-end justify-between *:relative *:z-10 *:pointer-events-auto" -->
  <div
    class="w-full z-10 grid grid-cols-[1fr_max-content_1fr] gap-2 items-center
      pointer-events-none *:pointer-events-auto"
  >
    <div></div>
    <div>
      {#if isResultsView && resultsEnabled && scopeState.mapsCount > 1}
        <div
          class="flex items-center gap-2
            bg-white z-50 p-1 rounded-lg shadow-md"
          transition:fade={{ duration: 100 }}
        >
          <span class="hidden sm:inline-block pl-1">Show maps from</span>
          <div class="w-48">
            <Scope />
          </div>
        </div>
      {/if}
    </div>
    <div class="flex flex-row gap-2 items-center justify-center place-self-end">
      {#if sourceState.imageCount > 1}
        <ImageSelector />
      {/if}

      <Popover interactOutsideBehavior={'ignore'}>
        {#snippet button()}
          <div
            class="bg-white rounded-md shadow-md p-2
            flex flex-row gap-1 items-center justify-center"
          >
            <ListIcon class="size-5" />
            <span>Maps</span>
          </div>
        {/snippet}
        {#snippet contents()}<Maps />{/snippet}
      </Popover>
    </div>
  </div>
</div>
