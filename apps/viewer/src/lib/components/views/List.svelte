<script lang="ts">
  import { maps } from '$lib/shared/stores/maps.js'
  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
  import { urlStore, Copy } from '@allmaps/ui'
  // import { selectedMaps } from '$lib/shared/stores/selected.js'
</script>

<section class="w-full h-full overflow-y-auto">
  <div class="container p-4 mx-auto">
    <div class="flex flex-row items-center justify-between mb-5">
      <h2 class="text-xl font-medium">Annotations</h2>
    </div>
    <div class="relative w-full flex flex-row mb-4">
      <div
        class="p-4 grow text-gray-900 bg-gray-50 rounded-l-lg border-gray-100 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-ellipsis"
      >
        Add a Annotation
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

    <Copy string={$urlStore} big />
    <ol class="flex flex-col">
      {#each $maps as viewerMap}
        <li class="flex flex-row">
          <MapsItem {viewerMap} />
        </li>
      {/each}
    </ol>

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
