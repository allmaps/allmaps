<script lang="ts">
  import { mapsBySourceId } from '$lib/shared/stores/maps.js'
  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
  import { Copy } from '@allmaps/ui'
  // import { selectedMaps } from '$lib/shared/stores/selected.js'
  import { sourcesById } from '$lib/shared/stores/sources.js'
  import { addUrlSource } from '$lib/shared/stores/sources.js'

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
</script>

<section class="w-full h-full overflow-y-auto">
  <div class="container p-4 mx-auto">
    <div class="flex flex-row items-center justify-between mb-5">
      <h2 class="text-xl font-medium">Annotations</h2>
      <button
        class="p-2 text-sm w-8 font-medium text-gray-900 bg-gray-100 rounded-lg border border-gray-300 hover:bg-gray-200 focus:ring-4 focus:outline-none focus:ring-gray-300"
        on:click={toggleGridCols}
        aria-label={gridCols === 1
          ? 'Switch to 2 columns'
          : 'Switch to 1 column'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="icon icon-tabler icons-tabler-filled icon-tabler-layout-list w-full h-full"
          ><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path
            d="M18 3a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-2a3 3 0 0 1 3 -3z"
          /><path
            d="M18 13a3 3 0 0 1 3 3v2a3 3 0 0 1 -3 3h-12a3 3 0 0 1 -3 -3v-2a3 3 0 0 1 3 -3z"
          /></svg
        >
      </button>
    </div>
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

    {#each Object.entries($mapsBySourceId) as [sourceId, maps]}
      <div class="mb-5">
        <Copy string={getUrlbyId(sourceId)} big />

        <ol class="grid grid-cols-{gridCols} gap-4 m-2">
          {#each maps as viewerMap}
            <li class="flex">
              <MapsItem {viewerMap} />
            </li>
          {/each}
        </ol>
      </div>
    {/each}

    <div class="flex flex-row items-center justify-between mb-5">
      <h2 class="text-xl font-medium">Export</h2>
    </div>
    <div class="relative w-full flex flex-row mb-4">
      <div
        class="p-4 grow text-gray-900 bg-gray-50 rounded-l-lg border-gray-100 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-ellipsis"
      >
        Create an Export
      </div>
      <button
        class="top-0 right-0 p-1 w-8 text-sm font-medium text-white rounded-r-lg border-gray-100 border-2 focus:ring-4 focus:outline-none focus:ring-blue-300"
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

    <!-- selected maps list selectedMaps -->
    <!-- <ol class="flex flex-col">
      {#each $selectedMaps as viewerMap}
        <li class="flex flex-row">
          <div class="flex flex-row items-center justify-between w-full p-4 bg-gray-50 border border-gray-300 rounded-lg">
            <div class="flex flex-row items-center">
              <div class="flex flex-col">
                <h3 class="text-lg font-medium">{viewerMap.index}</h3>
                <p class="text-sm text-gray-500">asd</p>
              </div>
            </div>
            <button
              class="p-1 w-8 text-sm font-medium text-white rounded-lg border-gray-100 border-2 focus:ring-4 focus:outline-none focus:ring-blue-300"
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
              </button
            >
        </li>
      {/each}
  </div> -->
  </div>
</section>
