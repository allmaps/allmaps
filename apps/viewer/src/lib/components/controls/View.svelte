<script lang="ts">
  import { view } from '$lib/shared/stores/view.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'
  import { Hamburger, Close } from '@allmaps/ui'
</script>

<div class="inline-flex rounded-md shadow-sm">
  <button
    on:click={() => ($view == 'map' ? ($view = 'list') : ($view = 'map'))}
    class="px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
  >
    {#if $view === 'map'}
      <Hamburger />
    {:else}
      <Close />
    {/if}
  </button>

  <!-- <button
    on:click={() => ($view = 'map')}
    aria-current={$view === 'map' ? 'page' : 'false'}
    class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
    class:text-black={$view !== 'map'}
    class:text-pink-500={$view === 'map'}
  >
    Map
  </button>

  {#if experimentalFeatures}
    <button
      on:click={() => ($view = 'list')}
      aria-current={$view === 'list' ? 'page' : 'false'}
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      class:text-gray-900={$view !== 'list'}
      class:text-pink-500={$view === 'list'}
    >
      List
    </button>
  {/if}

  <button
    on:click={() => ($view = 'image')}
    aria-current={$view === 'image' ? 'page' : 'false'}
    class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
    class:text-black={$view !== 'image'}
    class:text-pink-500={$view === 'image'}
  >
    Image
  </button> -->
</div>
