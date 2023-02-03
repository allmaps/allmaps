<script lang="ts">
  import { writable } from 'svelte/store'

  import { selectMap, deselectMap } from '$lib/shared/stores/selected.js'

  import Thumbnail from '$lib/components/Thumbnail.svelte'

  import type { ViewerMap } from '$lib/shared/types.js'

  export let viewerMap: ViewerMap

  const selected = writable(viewerMap.state.selected)

  const mapId = viewerMap.mapId
  const checkboxId = `dropdown-maps-${mapId}`

  selected.subscribe(($selected) => {
    if ($selected) {
      selectMap(mapId)
    } else {
      deselectMap(mapId)
    }
  })
</script>

<input
  type="checkbox"
  id={checkboxId}
  bind:checked={$selected}
  class="hidden peer"
/>
<label
  for={checkboxId}
  class="inline-flex items-center justify-between w-full p-1 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700"
>
  <div class="block">
    {#if viewerMap}
      <Thumbnail imageUri={viewerMap.map.image.uri} width={192} height={192} />
    {/if}

    <div class="w-full text-lg font-semibold">{mapId}</div>
    <div class="w-full text-sm">Hier over de kaart</div>
  </div>
</label>
