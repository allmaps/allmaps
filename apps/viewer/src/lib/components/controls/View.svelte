<script lang="ts">
  import { view } from '$lib/shared/stores/view.js'
</script>

<div class="inline-flex rounded-md shadow-sm">
  <button
    on:click={() => ($view = 'map')}
    aria-current={$view === 'map' ? 'page' : 'false'}
    class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
    class:text-gray-900={$view !== 'map'}
    class:text-blue-700={$view === 'map'}
  >
    Map
  </button>

  <button
    on:click={() => ($view = 'list')}
    aria-current={$view === 'list' ? 'page' : 'false'}
    class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
    class:text-gray-900={$view !== 'list'}
    class:text-blue-700={$view === 'list'}
  >
    List
  </button>

  <button
    on:click={() => ($view = 'image')}
    aria-current={$view === 'image' ? 'page' : 'false'}
    class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
    class:text-gray-900={$view !== 'image'}
    class:text-blue-700={$view === 'image'}
  >
    Image
  </button>
</div>
