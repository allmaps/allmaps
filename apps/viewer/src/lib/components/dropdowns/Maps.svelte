<script lang="ts">
  import { maps } from '$lib/shared/stores/maps.js'

  import MapsItem from '$lib/components/dropdowns/MapsItem.svelte'
</script>

<ol class="p-2">
  <!-- {#each [...$maps] as viewerMap (viewerMap.mapId + viewerMap.state.selected)} -->
  {#each $maps as viewerMap}
    <li class="flex flex-row">
      <MapsItem {viewerMap} />
    </li>
  {/each}
</ol>
