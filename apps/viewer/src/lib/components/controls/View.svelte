<script lang="ts">
  import { view as viewStore } from '$lib/shared/stores/view.js'
  import type { View } from '$lib/shared/stores/view.js'

  let view: View

  viewStore.subscribe((value) => (view = value))

  function setViewMap() {
    $viewStore = 'map'
  }

  function setViewImage() {
    $viewStore = 'image'
  }
</script>

<div class="inline-flex rounded-md shadow-sm">
  <button
    on:click={setViewMap}
    aria-current={view === 'map' ? 'page' : 'false'}
    class="px-4 py-2 text-sm text-gray-900 font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
    class:text-blue-700={view === 'map'}
  >
    Map
  </button>

  <button
    on:click={setViewImage}
    aria-current={view === 'image' ? 'page' : 'false'}
    class="px-4 py-2 text-sm text-gray-900 font-medium bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
    class:text-blue-700={view === 'image'}
  >
    Image
  </button>
</div>
