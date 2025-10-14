<script lang="ts">
  import { slide } from 'svelte/transition'

  import { Trash as TrashIcon } from 'phosphor-svelte'

  import {
    toDbGcps3,
    toGeoreferencedMap,
    getResourceMask
  } from '$lib/shared/maps.js'
  import { generateRandomId } from '$lib/shared/ids.js'

  import { getMaskDimensions, getMaskExtent } from '$lib/shared/geometry.js'

  import { getProjectionsState } from '@allmaps/components/state'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import Confirm from '$lib/components/Confirm.svelte'
  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import SelectTransformation from '$lib/components/SelectTransformationWrapper.svelte'
  import ProjectionPicker from '$lib/components/ProjectionPickerWrapper.svelte'

  import EditGcps from '$lib/components/modals/EditGcps.svelte'
  import EditResourceMask from '$lib/components/modals/EditResourceMask.svelte'

  import type { DbMap, ResourceMask, GCPs } from '$lib/types/maps.js'

  const mapsState = getMapsState()
  const uiState = getUiState()
  const projectionsState = getProjectionsState()

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

  function handleGcpsEdited(mapId: string, gcps: GCPs) {
    const gcpsWithId = gcps.map((gcp, index) => ({
      ...gcp,
      id: generateRandomId()
    }))
    const dbGcps = toDbGcps3(gcpsWithId)
    mapsState.replaceGcps({ mapId, gcps: dbGcps })
  }

  function handleResourceMaskEdited(mapId: string, resourceMask: ResourceMask) {
    mapsState.replaceResourceMask({ mapId, resourceMask })
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
        class="col-span-9 grid grid-cols-subgrid"
        transition:slide={{ duration: 250, axis: 'y' }}
      >
        <div class="col-span-8 grid grid-cols-subgrid group">
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
                    class:fill-none={!isActiveMap}
                  />
                </svg>
              </button>
            {/if}
          </div>
          <div
            class="col-span-7 place-self-start self-center flex gap-1 sm:gap-2 items-center"
          >
            <span>Map {index + 1}</span>

            <div>
              {#if isActiveMap}
                <button
                  class="cursor-pointer px-2 py-1 rounded-full hover:underline text-sm text-pink"
                  onclick={() => uiState.setModalOpen('editResourceMask', true)}
                  >Edit or import mask…</button
                >
              {/if}

              {#if uiState.getModalOpen('editResourceMask')}
                <!-- TODO: what happens if ShareDB updates the map while editing? -->
                <EditResourceMask
                  bind:open={
                    () => uiState.getModalOpen('editResourceMask'),
                    (open) => uiState.setModalOpen('editResourceMask', open)
                  }
                  map={toGeoreferencedMap(
                    map,
                    projectionsState.projectionsById
                  )}
                  onsubmit={(resourceMask) =>
                    handleResourceMaskEdited(map.id, resourceMask)}
                />
              {/if}
            </div>
          </div>
        </div>
        <div class="place-self-end self-center">
          <Confirm onconfirm={() => mapsState.removeMap({ mapId: map.id })}>
            {#snippet button()}
              <TrashIcon />
            {/snippet}
            {#snippet question()}
              Do you really want to delete this map?
            {/snippet}
          </Confirm>
        </div>

        {#if isActiveMap}
          <div
            class="sm:pl-7 pb-2 col-span-9
              grid grid-cols-[min-content_1fr] gap-x-4 gap-y-2 items-center
              text-sm"
          >
            <label for="select-transformation">Transformation:</label>
            <SelectTransformation {map} id="select-transformation" />

            <label for="select-projection">Projection:</label>
            <ProjectionPicker {map} id="select-projection" />
          </div>
          {#if gcpCount > 0}
            {@const gcps = Object.values(map.gcps).toSorted(
              (gcpA, gcpB) => (gcpA.index || 0) - (gcpB.index || 0)
            )}
            <ol
              class="col-span-9 grid grid-cols-subgrid"
              transition:slide={{ duration: 250, axis: 'y' }}
            >
              {#each gcps as gcp, index}
                {@const isActiveGcp = mapsState.activeGcpId === gcp.id}
                <li class="contents">
                  <div class="col-span-8 grid gap-0 grid-cols-subgrid">
                    <button
                      class="inline-block h-8 cursor-pointer"
                      onclick={() => handleGcpClick(map.id, gcp.id)}
                      aria-label="Select GCP {index + 1}"
                    >
                      <div
                        class="inline-flex size-4 justify-center items-center"
                      >
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
                      class="col-span-7 grid text-xs sm:text-base items-center gap-1 grid-cols-subgrid geograph-tnum place-items-end"
                    >
                      {#if gcp.resource}
                        <span inert class="text-gray-300">(</span><span
                          >{formatResourceCoordinate(gcp.resource[0])}<span
                            inert
                            class="text-gray-600">,</span
                          ></span
                        ><span class="space-x-1">
                          <span
                            >{formatResourceCoordinate(gcp.resource[1])}</span
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
                            class="text-gray-600">,</span
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
                    >
                      {#snippet button()}
                        <TrashIcon />
                      {/snippet}
                      {#snippet question()}
                        Do you really want to delete this GCP?
                      {/snippet}
                    </Confirm>
                  </div>
                </li>
              {/each}
            </ol>
          {/if}

          <div class="col-span-9 place-self-end">
            <button
              class="cursor-pointer px-2 py-1 rounded-full hover:underline text-sm text-pink"
              onclick={() => uiState.setModalOpen('editGcps', true)}
              >Edit or import GCPs…</button
            >

            {#if uiState.getModalOpen('editGcps')}
              <!-- TODO: what happens if ShareDB updates the map while editing? -->
              <EditGcps
                bind:open={
                  () => uiState.getModalOpen('editGcps'),
                  (open) => uiState.setModalOpen('editGcps', open)
                }
                map={toGeoreferencedMap(map, projectionsState.projectionsById)}
                onsubmit={(gcps) => handleGcpsEdited(map.id, gcps)}
              />
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
