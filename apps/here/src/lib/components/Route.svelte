<script lang="ts">
  import { page } from '$app/state'
  import { slide } from 'svelte/transition'

  import { CaretCircleDown as CaretCircleDownIcon } from 'phosphor-svelte'

  import turfLength from '@turf/length'

  import { gotoRoute, createRouteUrl } from '$lib/shared/router.js'

  import type { GeojsonRoute } from '$lib/shared/types.js'

  type Props = {
    geojsonRoute?: GeojsonRoute
  }

  let { geojsonRoute }: Props = $props()

  let open = $state(geojsonRoute?.url !== undefined)

  let geojsonRouteUrl = $derived(geojsonRoute?.url)

  function handleLoadGeojson() {
    gotoRoute(
      createRouteUrl(page, '/', {
        geojson: geojsonRouteUrl
      })
    )
  }

  function clearGeojson() {
    gotoRoute(
      createRouteUrl(page, '/', {
        geojson: null
      })
    )
  }

  let showCurrentRoute = $derived(geojsonRouteUrl !== undefined)

  let loadButtonEnabled = $derived(
    geojsonRouteUrl &&
      geojsonRouteUrl.length > 0 &&
      geojsonRouteUrl !== geojsonRoute?.url
  )

  let length = $derived(
    geojsonRoute?.route
      ? turfLength({
          type: 'Feature',
          properties: {},
          geometry: geojsonRoute?.route
        })
      : 0
  )
</script>

<div
  class="bg-linear-to-tr from-blue-300 to-blue-500 p-4 shadow hover:shadow-md transition-shadow rounded-lg w-fit"
>
  <button
    onclick={() => (open = !open)}
    class="cursor-pointer flex flex-row items-center justify-center gap-2"
  >
    <p class="text-center text-gray-800">
      Allmaps Here can display GeoJSON routes on historic maps.
    </p>
    <CaretCircleDownIcon
      size="24"
      class={['transition-all', open ? 'rotate-180' : 'rotate-0']}
    />
  </button>
  {#if open}
    <div
      class="flex flex-col gap-4 mt-4"
      transition:slide={{ duration: 200, axis: 'y' }}
    >
      {#if showCurrentRoute}
        <div
          class="{geojsonRoute?.error
            ? 'bg-red text-white'
            : 'bg-blue-300'} inset-shadow rounded-md p-2 flex gap-2 items-center justify-between"
        >
          {#if geojsonRoute?.error}
            <span>Error: {geojsonRoute?.error}</span>
          {:else}
            <div>
              <span>Current route: {length.toFixed(2)} km</span>
              {#if geojsonRoute?.markers.length}
                <span>with {geojsonRoute.markers.length} POIs</span>
              {/if}
            </div>
          {/if}
          <button
            class="cursor-pointer px-2 py-1 shrink-0 bg-white/30 rounded"
            onclick={clearGeojson}
          >
            Remove
          </button>
        </div>
      {/if}

      <div class="flex items-center justify-between gap-2">
        <input
          class="bg-white w-full rounded-lg p-2 border-2 border-gray/40"
          type="url"
          placeholder="URL of GeoJSON file with route"
          bind:value={geojsonRouteUrl}
        />

        <button
          disabled={!loadButtonEnabled}
          class="cursor-pointer shrink-0 bg-blue-200 px-2 py-1 rounded"
          onclick={handleLoadGeojson}>Load GeoJSON</button
        >
      </div>
      <p class="text-xs text-center text-gray-800 px-8">
        The GeoJSON file must be a FeatureCollection <br />with Point and
        LineString Features, or a single LineString Feature.
      </p>
    </div>
  {/if}
</div>
