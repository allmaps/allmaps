<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import RenderOptionsButton from '$lib/components/elements/RenderOptionsButton.svelte'
  import RenderOptionsDropdown from '$lib/components/dropdowns/RenderOptions.svelte'
  import DropdownButton from '$lib/components/elements/DropdownButton.svelte'

  import { mapCount } from '$lib/shared/stores/maps.js'
  import {
    setPrevMapActive,
    setNextMapActive
  } from '$lib/shared/stores/active.js'

  import { selectedMapCount } from '$lib/shared/stores/selected.js'

  function prevMap() {
    setPrevMapActive(true)
  }

  function nextMap() {
    setNextMapActive(true)
  }

  function handleKeyUp(event: KeyboardEvent) {
    // TODO: only when not in input
    if (event.key === '[') {
      prevMap()
    } else if (event.key === ']') {
      nextMap()
    }
  }

  onMount(() => {
    document.addEventListener('keyup', handleKeyUp)
  })

  onDestroy(() => {
    document.removeEventListener('keyup', handleKeyUp)
  })
</script>

<div
  class="inline-flex items-center p-2 space-x-1 md:space-x-3 text-sm bg-white border border-gray-200 rounded-lg"
>
  {#if $selectedMapCount >= 2}
    <div>{$selectedMapCount} maps selected</div>
  {:else}
    <div>Viewing {$mapCount} maps</div>
  {/if}
  <!-- path in collection, cluster, selection. click will display popover with thumbnails -->
  <!-- title, id current Map, click will display info about current map + URLs -->

  <!-- <DropdownButton>
    <RenderOptionsButton slot="button" />
    <RenderOptionsDropdown slot="dropdown" />
  </DropdownButton> -->

  <!-- order icon, popover https://kbpdfstudio.qoppa.com/wp-content/uploads/Z-order2.png -->

  <!-- <button class="w-5 h-5">
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clip-rule="evenodd"
        d="M15.79 14.77a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L11.832 10l3.938 3.71a.75.75 0 01.02 1.06zm-6 0a.75.75 0 01-1.06.02l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 111.04 1.08L5.832 10l3.938 3.71a.75.75 0 01.02 1.06z"
        fill-rule="evenodd"
      />
    </svg>
  </button> -->

  <button class="w-5 h-5" on:click={prevMap}>
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clip-rule="evenodd"
        d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
        fill-rule="evenodd"
      />
    </svg>
  </button>

  <button class="w-5 h-5" on:click={nextMap}>
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clip-rule="evenodd"
        d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        fill-rule="evenodd"
      />
    </svg>
  </button>
  <!-- <button class="w-5 h-5">
    <svg
      aria-hidden="true"
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        clip-rule="evenodd"
        d="M10.21 14.77a.75.75 0 01.02-1.06L14.168 10 10.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        fill-rule="evenodd"
      />
      <path
        clip-rule="evenodd"
        d="M4.21 14.77a.75.75 0 01.02-1.06L8.168 10 4.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
        fill-rule="evenodd"
      />
    </svg>
  </button> -->
</div>
