<script lang="ts">
  import { slide } from 'svelte/transition'

  import { Trash as TrashIcon } from 'phosphor-svelte'

  import { getResourceMask } from '$lib/shared/maps.js'
  import { getMaskDimensions, getMaskExtent } from '$lib/shared/geometry.js'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import Confirm from '$lib/components/Confirm.svelte'
  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import SelectTransformation from '$lib/components/SelectTransformation.svelte'

  import type { DbMap } from '$lib/types/maps.js'

  const mapsState = getMapsState()
  const uiState = getUiState()

  let mapCount = $derived(
    mapsState.maps ? Object.values(mapsState.maps).length : 0
  )

  function hasResourceMask(map: DbMap) {
    const resourceMask = getResourceMask(map)
    return resourceMask && resourceMask.length > 0
  }

  function thumbnailViewbox(map: DbMap, padding = 5, maxHeight = 50) {
    const maskDimensions = getMaskDimensions(map)
    const scaleFactor = maxHeight / Math.max(...maskDimensions)
    return `${-padding} ${-padding} ${
      maskDimensions[0] * scaleFactor + padding * 2
    } ${maskDimensions[1] * scaleFactor + padding * 2}`
  }

  function thumbnailPolygonPoints(map: DbMap, maxHeight = 50) {
    const maskExtent = getMaskExtent(map)
    const maskDimensions = getMaskDimensions(map)
    const scaleFactor = maxHeight / Math.max(...maskDimensions)

    const resourceMask = getResourceMask(map)

    const points = resourceMask.map((point) => [
      (point[0] - maskExtent[0][0]) * scaleFactor,
      (point[1] - maskExtent[1][0]) * scaleFactor
    ])

    return points.map((point) => point.join(',')).join(' ')
  }

  function formatResourceCoordinate(coordinate: number) {
    return coordinate.toFixed(0)
  }

  function formatGeoCoordinate(coordinate: number) {
    return coordinate.toFixed(5)
  }

  function handleMapClick(mapId: string) {
    uiState.lastClickedItem = {
      type: 'map',
      mapId
    }
    mapsState.activeMapId = mapId
  }

  function handleGcpClick(mapId: string, gcpId: string) {
    uiState.lastClickedItem = {
      type: 'gcp',
      mapId,
      gcpId
    }
    mapsState.activeMapId = mapId
    mapsState.activeGcpId = gcpId
  }
</script>

{#if mapCount === 0}
  <StartGeoreferencing />
{:else}
  <ol
    class="grid auto-rows-auto grid-cols-[repeat(2,_max-content)_1fr] sm:grid-cols-[repeat(8,_max-content)_1fr] gap-1 sm:gap-2"
  >
    {#each mapsState.maps as map, index (map.id)}
      {@const gcpCount = Object.values(map.gcps).length}
      {@const isActiveMap = mapsState.activeMapId === map.id}
      <li
        class="col-span-3 sm:col-span-9 grid grid-cols-subgrid"
        transition:slide={{ duration: 250, axis: 'y' }}
      >
        <div class="col-span-2 sm:col-span-8 grid grid-cols-subgrid group">
          <div>
            {#if hasResourceMask(map)}
              <button
                class="size-16 relative cursor-pointer"
                onclick={() => handleMapClick(map.id)}
                aria-label="Select map {index + 1}"
              >
                <svg
                  class="w-full h-full fill-none stroke-pink stroke-2"
                  viewBox={thumbnailViewbox(map)}
                >
                  <polygon
                    points={thumbnailPolygonPoints(map)}
                    class="group-hover:fill-pink/10 {isActiveMap
                      ? 'fill-pink/25'
                      : 'fill-none'}"
                    class:fill-none={mapsState.activeMapId !== map.id}
                  />
                </svg>
              </button>
            {/if}
          </div>
          <div
            class="col-span-1 sm:col-span-7 place-self-start self-center flex gap-1 sm:gap-2 items-center"
          >
            <span>Map {index + 1}</span>
            <span class="hidden sm:inline font-light text-sm text-gray-800"
              >{gcpCount} {gcpCount === 1 ? 'GCP' : 'GCPs'}
            </span>
            <div class="w-[140px] sm:w-[200px]">
              <SelectTransformation {map} />
            </div>
          </div>
        </div>
        <div class="place-self-end self-center">
          <Confirm
            onconfirm={() => mapsState.removeMap({ mapId: map.id })}
            question="Do you really want to delete this map?"
          >
            <TrashIcon />
          </Confirm>
        </div>

        {#if isActiveMap && gcpCount > 0}
          {@const gcps = Object.values(map.gcps).toSorted(
            (gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0)
          )}
          <ol
            class="col-span-3 sm:col-span-9 grid grid-cols-subgrid"
            transition:slide={{ duration: 250, axis: 'y' }}
          >
            {#each gcps as gcp, index}
              {@const isActiveGcp = mapsState.activeGcpId === gcp.id}
              <li class="contents">
                <div
                  class="col-span-2 sm:col-span-8 grid gap-0 grid-cols-subgrid"
                >
                  <button
                    class="inline-block h-8 cursor-pointer"
                    onclick={() => handleGcpClick(map.id, gcp.id)}
                    aria-label="Select GCP {index + 1}"
                  >
                    <div class="inline-flex size-4 justify-center items-center">
                      <span
                        class="size-3 rounded-full bg-pink transition-all"
                        class:size-3={!isActiveGcp}
                        class:size-4={isActiveGcp}
                      ></span>
                    </div>
                    <span class="relative top-2 text-sm">
                      {index + 1}
                    </span>
                  </button>

                  <div
                    class="sm:col-span-7 hidden sm:grid text-xs sm:text-base items-center gap-1 grid-cols-subgrid geograph-tnum place-items-end"
                  >
                    {#if gcp.resource}
                      <span inert class="text-gray-300">(</span><span
                        >{formatResourceCoordinate(gcp.resource[0])}<span
                          inert
                          class="text-gray-300">,</span
                        ></span
                      ><span class="space-x-1">
                        <span>{formatResourceCoordinate(gcp.resource[1])}</span
                        ><span inert class="text-gray-300">)</span></span
                      >
                    {:else}
                      <span class="col-span-3"></span>
                    {/if}
                    <span inert class="text-gray-300">⇒</span>
                    {#if gcp.geo}
                      <span inert class="text-gray-300">(</span><span
                        >{formatGeoCoordinate(gcp.geo[0])}<span
                          inert
                          class="text-gray-300">,</span
                        ></span
                      >
                      <span class="space-x-1">
                        <span>{formatGeoCoordinate(gcp.geo[1])}</span><span
                          inert
                          class="text-gray-300">)</span
                        ></span
                      >
                    {:else}
                      <span class="col-span-3"></span>
                    {/if}
                  </div>
                </div>
                <div class="place-self-end self-center">
                  <Confirm
                    onconfirm={() =>
                      mapsState.removeGcp({ mapId: map.id, gcpId: gcp.id })}
                    question="Do you really want to delete this GCP?"
                  >
                    <TrashIcon />
                  </Confirm>
                </div>
              </li>
            {/each}
          </ol>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
