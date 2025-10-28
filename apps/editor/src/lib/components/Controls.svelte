<script lang="ts">
  import { page } from '$app/state'
  import { fade } from 'svelte/transition'

  import {
    Images as ImagesIcon,
    Polygon as PolygonIcon,
    MapPinSimple as MapPinSimpleIcon,
    MapTrifold as MapTrifoldIcon,
    CaretRight as CaretRightIcon,
    Rows as RowsIcon
    // ArrowRight as CaretRightIcon,
    // CaretDown as CaretDownIcon
  } from 'phosphor-svelte'

  import { Popover } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import { getView, getViewUrl } from '$lib/shared/router.js'

  import MapButtons from '$lib/components/MapButtons.svelte'
  import ImageSelector from '$lib/components/ImageSelector.svelte'
  import MapSelector from '$lib/components/MapSelector.svelte'
  import Maps from '$lib/components/popovers/Maps.svelte'
  import Scope from '$lib/components/Scope.svelte'

  const uiState = getUiState()
  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const scopeState = getScopeState()
  const urlState = getUrlState()

  // let imagesViewButton: HTMLAnchorElement
  // let maskViewButton: HTMLAnchorElement
  // let georeferenceViewButton: HTMLAnchorElement
  // let resultsViewButton: HTMLAnchorElement

  let resultsEnabled = $derived(
    mapsMergedState.completeMaps.length > 0 || mapsState.activeMap !== undefined
  )

  let editEnabled = $derived(sourceState.canEdit)

  let isMapView = $derived(
    page.route.id === '/(views)/georeference' ||
      page.route.id === '/(views)/results'
  )

  let isImageView = $derived(
    page.route.id === '/(views)/mask' ||
      page.route.id === '/(views)/georeference'
  )

  let isResultsView = $derived(page.route.id === '/(views)/results')
</script>

{#snippet separator()}
  <div class="flex h-full items-center justify-center">
    <CaretRightIcon size={16} class="inline" weight="bold" color="#aaa" />
  </div>
{/snippet}

<div class="flex h-full w-full flex-col items-center justify-between gap-2 p-2">
  <div
    class:opacity-50={uiState.popoverOpen.info || uiState.popoverOpen.export}
    class="pointer-events-none grid w-full grid-cols-[1fr_max-content_1fr] items-start gap-2
      transition-opacity duration-200
      *:pointer-events-auto sm:items-center"
  >
    <div></div>
    <nav
      class="grid grid-cols-[1fr_min-content_1fr_min-content_1fr_min-content_1fr] gap-0.5 rounded-lg bg-white p-1 font-semibold shadow-md sm:gap-1"
    >
      <a
        href={urlState.generateUrl(getViewUrl('images'), {
          imageId: sourceState.activeImageId || undefined
        })}
        data-state={getView(page) === 'images' ? 'active' : undefined}
        class="data-[state=active]:bg-blue/25 hover:bg-blue/10 flex items-center justify-center gap-2 rounded-md bg-white px-2 py-1 transition-colors duration-200 sm:px-4 sm:py-2"
      >
        <ImagesIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Images</span>
      </a>
      {@render separator()}
      <a
        href={editEnabled
          ? urlState.generateUrl(getViewUrl('mask'), {
              imageId: sourceState.activeImageId || undefined
            })
          : undefined}
        data-state={editEnabled && getView(page) === 'mask'
          ? 'active'
          : undefined}
        class={[
          !editEnabled && 'text-gray-400',
          editEnabled
            ? 'data-[state=active]:bg-green/25 hover:bg-green/10'
            : 'data-[state=active]:bg-green-100/25',
          'flex items-center justify-center gap-2 rounded-md bg-white px-2 py-1 transition-colors duration-200 sm:px-4 sm:py-2'
        ]}
      >
        <PolygonIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Draw mask</span>
      </a>
      {@render separator()}
      <a
        href={editEnabled
          ? urlState.generateUrl(getViewUrl('georeference'), {
              imageId: sourceState.activeImageId || undefined
            })
          : undefined}
        data-state={editEnabled && getView(page) === 'georeference'
          ? 'active'
          : undefined}
        class={[
          !editEnabled && 'text-gray-400',
          editEnabled
            ? 'data-[state=active]:bg-yellow/25 hover:bg-yellow/10'
            : 'data-[state=active]:bg-yellow-100/25',
          'flex items-center justify-center gap-2 rounded-md bg-white px-2 py-1 transition-colors duration-200 sm:px-4 sm:py-2'
        ]}
      >
        <MapPinSimpleIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Georeference</span>

        <!-- <Popover customAnchor={georeferenceViewButton}>
          {#snippet button()}
            <CaretDownIcon size={16} weight="bold" />
          {/snippet}
          {#snippet contents()}

          {/snippet}
        </Popover> -->
      </a>
      {@render separator()}
      <a
        href={resultsEnabled
          ? urlState.generateUrl(getViewUrl('results'), {
              imageId: sourceState.activeImageId || undefined
            })
          : undefined}
        data-state={resultsEnabled && getView(page) === 'results'
          ? 'active'
          : undefined}
        class={[
          !resultsEnabled && 'text-gray-400',
          resultsEnabled
            ? 'data-[state=active]:bg-pink/25 hover:bg-pink/10'
            : 'data-[state=active]:bg-pink-100/25',
          'flex items-center justify-center gap-2 rounded-md bg-white px-2 py-1 transition-colors duration-200 sm:px-4 sm:py-2'
        ]}
      >
        <MapTrifoldIcon size={28} class="inline" />
        <span class="hidden lg:inline-block">Results</span>
        <!-- <CaretDownIcon size={16} weight="bold" /> -->
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
    class="pointer-events-none grid w-full grid-cols-[1fr_max-content_1fr] items-center
      gap-2 *:pointer-events-auto"
  >
    <div></div>
    <div>
      {#if isResultsView && resultsEnabled}
        <div
          class="z-50 flex items-center
            gap-2 rounded-lg bg-white p-1 shadow-md"
          transition:fade={{ duration: 100 }}
        >
          <span class="hidden pl-1 sm:inline-block">Show</span>
          <div class="w-48">
            <Scope />
          </div>
        </div>
      {/if}
    </div>
    <div class="flex flex-row items-center justify-center gap-2 place-self-end">
      {#if isResultsView && scopeState.mapsCount > 1}
        <MapSelector />
      {:else if sourceState.imageCount > 1}
        <ImageSelector />
      {/if}
      {#if editEnabled}
        <Popover
          bind:open={uiState.popoverOpen.maps}
          interactOutsideBehavior={'ignore'}
        >
          {#snippet button()}
            <div
              class="bg-pink hover:bg-pink/90 flex flex-row items-center justify-center
            gap-1 rounded-md p-2 font-medium text-white
            shadow-md transition-all"
            >
              <RowsIcon class="size-5" weight="bold" />
              <!-- <span>Masks &amp; GCPs</span> -->
              <span>Maps</span>
            </div>
          {/snippet}
          {#snippet contents()}<Maps />{/snippet}
        </Popover>
      {/if}
    </div>
  </div>
</div>
