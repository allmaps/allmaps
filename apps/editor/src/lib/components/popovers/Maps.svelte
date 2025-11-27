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
  import { getVarsState } from '$lib/state/vars.svelte.js'

  import Confirm from '$lib/components/Confirm.svelte'
  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import SelectTransformation from '$lib/components/SelectTransformationWrapper.svelte'
  import ProjectionPicker from '$lib/components/ProjectionPickerWrapper.svelte'

  import EditGcps from '$lib/components/modals/EditGcps.svelte'
  import EditResourceMask from '$lib/components/modals/EditResourceMask.svelte'

  import type { DbMap, ResourceMask, GCPs } from '$lib/types/maps.js'
  import type { Env } from '$lib/types/env.js'

  const mapsState = getMapsState()
  const uiState = getUiState()
  const projectionsState = getProjectionsState()
  const varsState = getVarsState<Env>()

  const apiBaseUrl = varsState.get('PUBLIC_ALLMAPS_API_URL')
  const annotationsApiBaseUrl = varsState.get(
    'PUBLIC_ALLMAPS_ANNOTATIONS_API_URL'
  )

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
    const gcpsWithId = gcps.map((gcp) => ({
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
    class="grid auto-rows-auto grid-cols-[repeat(2,_max-content)_1fr] gap-1 sm:grid-cols-[repeat(8,_max-content)_1fr] sm:gap-2"
  >
    {#each mapsState.maps as map, index (map.id)}
      {@const gcpCount = Object.values(map.gcps).length}
      {@const isActiveMap = mapsState.activeMapId === map.id}
      <li
        class="col-span-9 grid grid-cols-subgrid"
        transition:slide={{ duration: 250, axis: 'y' }}
      >
        <div class="group col-span-8 grid grid-cols-subgrid">
          <div>
            {#if hasResourceMask(map)}
              <button
                class="relative size-16 cursor-pointer"
                onclick={() => handleMapClick(map.id)}
                aria-label="Select map {index + 1}"
              >
                <svg
                  class="h-full w-full fill-none stroke-pink stroke-2"
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
            class="col-span-7 flex items-center gap-1 place-self-start self-center sm:gap-2"
          >
            <span>Map {index + 1}</span>

            <div>
              {#if isActiveMap}
                <button
                  class="cursor-pointer rounded-full px-2 py-1 text-sm text-pink hover:underline"
                  onclick={() => (uiState.modalOpen.editResourceMask = true)}
                  >Edit or import mask…</button
                >
              {/if}

              {#if uiState.modalOpen.editResourceMask}
                <!-- TODO: what happens if ShareDB updates the map while editing? -->
                <EditResourceMask
                  bind:open={uiState.modalOpen.editResourceMask}
                  map={toGeoreferencedMap(
                    apiBaseUrl,
                    annotationsApiBaseUrl,
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
            class="col-span-9 grid grid-cols-[min-content_1fr]
              items-center gap-x-4 gap-y-2 pb-2 text-sm
              sm:pl-7"
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
              {#each gcps as gcp, index (gcp.id)}
                {@const isActiveGcp = mapsState.activeGcpId === gcp.id}
                <li class="contents">
                  <div class="col-span-8 grid grid-cols-subgrid gap-0">
                    <button
                      class="inline-block h-8 cursor-pointer"
                      onclick={() => handleGcpClick(map.id, gcp.id)}
                      aria-label="Select GCP {index + 1}"
                    >
                      <div
                        class="inline-flex size-4 items-center justify-center"
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
                      class="geograph-tnum col-span-7 grid grid-cols-subgrid place-items-end items-center gap-1 text-xs sm:text-base"
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
              class="cursor-pointer rounded-full px-2 py-1 text-sm text-pink hover:underline"
              onclick={() => (uiState.modalOpen.editGcps = true)}
              >Edit or import GCPs…</button
            >

            {#if uiState.modalOpen.editGcps}
              <!-- TODO: what happens if ShareDB updates the map while editing? -->
              <EditGcps
                bind:open={uiState.modalOpen.editGcps}
                map={toGeoreferencedMap(
                  apiBaseUrl,
                  annotationsApiBaseUrl,
                  map,
                  projectionsState.projectionsById
                )}
                onsubmit={(gcps) => handleGcpsEdited(map.id, gcps)}
              />
            {/if}
          </div>
        {/if}
      </li>
    {/each}
  </ol>
{/if}
