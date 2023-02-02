<script lang="ts">
  import { selectedMapsById } from '$lib/shared/stores/selected.js'

  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
</script>

<ol class="p-2">
  {#each [...$selectedMapsById.entries()] as [mapId, selectedMap] (mapId)}
    <li class="flex flex-row">
      <MapsItem selectedMap={selectedMap} />
  </li>
  {/each}
</ol>
