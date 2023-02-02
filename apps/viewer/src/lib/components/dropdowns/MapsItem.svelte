<script lang="ts">
  import { mapsById } from '$lib/shared/stores/maps.js'
  // import { selectedMapIds } from '$lib/shared/stores/selected.js'

  import Thumbnail from '$lib/components/Thumbnail.svelte'

  import type { Writable } from 'svelte/store'
  import type { SelectedMap } from '$lib/shared/types.js'

  export let selectedMap: Writable<SelectedMap>

  const mapId = $selectedMap.mapId
  const checkboxId = `dropdown-maps-${mapId}`

  const sourceMap = $mapsById.get($selectedMap.mapId)
</script>

<input type="checkbox" id={checkboxId} bind:checked={$selectedMap.selected} class="hidden peer" />
<label
  for={checkboxId}
  class="inline-flex items-center justify-between w-full p-5 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
>
  <div class="block">
    {#if sourceMap}
      <Thumbnail imageUri={sourceMap.map.image.uri} width={192} height={192} />
    {/if}

    <div class="w-full text-lg font-semibold">{mapId}</div>
    <div class="w-full text-sm">
      Hier over de kaart
    </div>
  </div>
</label>
