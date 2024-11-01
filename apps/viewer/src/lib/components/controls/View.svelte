<script lang="ts">
  import { view } from '$lib/shared/stores/view.js'
  import experimentalFeatures from '$lib/shared/experimental-features.js'
  import { IconMenu2, IconX } from '@tabler/icons-svelte'
</script>

<div class="inline-flex rounded-md shadow-sm">
  {#if experimentalFeatures}
    <button
      on:click={() => ($view == 'map' ? ($view = 'list') : ($view = 'map'))}
      class="p-2 h-9 w-9 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
    >
      {#if $view === 'map'}
        <IconMenu2 class="w-full h-full" />
      {:else}
        <IconX class="w-full h-full" />
      {/if}
    </button>
  {:else}
    <button
      on:click={() => ($view = 'map')}
      aria-current={$view === 'map' ? 'page' : 'false'}
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      class:text-black={$view !== 'map'}
      class:text-pink-500={$view === 'map'}
    >
      Map
    </button>

    <button
      on:click={() => ($view = 'image')}
      aria-current={$view === 'image' ? 'page' : 'false'}
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      class:text-black={$view !== 'image'}
      class:text-pink-500={$view === 'image'}
    >
      Image
    </button>
  {/if}
</div>
