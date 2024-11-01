<script lang="ts">
  import { mapsBySourceId, removeAnnotation } from '$lib/shared/stores/maps.js'
  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
  import { Copy } from '@allmaps/ui'
  import { selectedMaps } from '$lib/shared/stores/selected.js'
  import { sourcesById } from '$lib/shared/stores/sources.js'
  import { addUrlSource } from '$lib/shared/stores/sources.js'
  import { IconListDetails, IconTrash } from '@tabler/icons-svelte'

  const getUrlbyId = (id: string) => {
    return $sourcesById?.get(id)?.url || ''
  }

  const addAnnotation = async () => {
    // check if newAnnotation is an URL
    if (!newAnnotation.startsWith('http')) return
    // add annotation to the map
    await addUrlSource(newAnnotation)
    // clear newAnnotation
    newAnnotation = ''
  }
  let newAnnotation = ''

  let gridCols = 2

  const toggleGridCols = () => {
    gridCols = gridCols === 1 ? 2 : 1
  }

  const deleteMap = (sourceId: string) => {
    removeAnnotation(sourceId)
  }

  $: mapsBySourceIdEntries = Object.entries($mapsBySourceId)
</script>

<section class="w-full h-full overflow-y-auto">
  <div class="container p-5 mx-auto">
    <div class="relative w-full flex flex-row mb-4">
      <input
        class="p-4 grow text-gray-900 bg-gray-50 rounded-l-lg border-gray-100 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-ellipsis"
        placeholder="Add a Annotation"
        bind:value={newAnnotation}
      />
      <button
        class="top-0 right-0 p-1 w-8 text-sm font-medium text-white rounded-r-lg border-gray-100 border-2 focus:ring-4 focus:outline-none focus:ring-blue-300"
        on:click={addAnnotation}
      >
        <svg
          class="w-full h-full"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 4v16m8-8H4"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke="black"
          ></path>
        </svg>
      </button>
    </div>

    <div class="flex flex-row items-center justify-end mb-5">
      <button
        class="p-2 text-sm w-8 font-medium text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-200"
        class:bg-gray-200={gridCols === 1}
        on:click={toggleGridCols}
        aria-label={gridCols === 1
          ? 'Switch to 2 columns'
          : 'Switch to 1 column'}
      >
        <IconListDetails class="w-full h-full" />
      </button>
    </div>

    <div class="flex flex-col mb-5">
      {#each mapsBySourceIdEntries as [sourceId, maps]}
        <div class="mb-5 p-3 border border-gray-300 rounded-lg bg-gray-50">
          <div class="flex flex-row items-center justify-between gap-1">
            <Copy string={getUrlbyId(sourceId)} />
            <button
              class="p-2 text-sm w-8 font-medium text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-transparent"
              disabled={mapsBySourceIdEntries.length === 1}
              on:click={() => deleteMap(sourceId)}
            >
              <IconTrash class="w-full h-full" />
            </button>
          </div>

          <ol class="grid grid-cols-{gridCols} gap-4 mt-3">
            {#each maps as viewerMap}
              <li class="flex">
                <MapsItem {viewerMap} />
              </li>
            {/each}
          </ol>
        </div>
      {/each}
    </div>

    <div class="flex flex-row items-center justify-between mb-5">
      <h2 class="text-xl font-medium">Export</h2>
    </div>

    <!-- selected maps list selectedMaps -->
    <ol class="flex flex-col">
      {#each $selectedMaps as viewerMap}
        <li class="flex flex-row">
          <div
            class="flex flex-row items-center justify-between w-full p-4 bg-gray-50 border border-gray-300"
          >
            <div class="flex flex-row items-center">
              <div class="flex flex-col">
                <h3 class="text-lg font-medium">{viewerMap.sourceId}</h3>
                <p class="text-sm text-gray-500">{viewerMap.mapId}</p>
              </div>
            </div>
          </div>
        </li>
      {/each}
      <!-- </div> -->
    </ol>

    <div class="relative w-full flex flex-row mt-2">
      <div
        class="p-4 grow text-gray-900 bg-gray-50 rounded-lg border-gray-100 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-ellipsis"
      >
        Create an Export
      </div>
    </div>
  </div>
</section>
