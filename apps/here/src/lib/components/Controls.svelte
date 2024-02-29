<script lang="ts">
  import { onMount } from 'svelte'
  import { goto } from '$app/navigation'

  import { maps, previousMapId, nextMapId } from '$lib/shared/stores/maps.js'

  const hasMaps = $maps.length > 0

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'BracketLeft' && $previousMapId !== undefined) {
      goto(`/?url=${$previousMapId}`)
    } else if (event.code === 'BracketRight' && $nextMapId !== undefined) {
      goto(`/?url=${$nextMapId}`)
    }
  }

  onMount(() => {
    document.addEventListener('keyup', handleKeyup)

    return () => {
      document.removeEventListener('keyup', handleKeyup)
    }
  })
</script>

<div class="inline-flex rounded-md shadow-sm">
  {#if hasMaps}
    <a
      href="/?url={$previousMapId}"
      role="button"
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      >Previous</a
    >

    <a
      href="/?url={$nextMapId}"
      role="button"
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-r-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      >Next</a
    >
  {:else}
    <a
      href="/"
      role="button"
      class="px-4 py-2 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-pink-500"
      >Show maps around current location</a
    >
  {/if}
</div>
