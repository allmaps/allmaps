<script lang="ts">
  import Map from '$lib/components/Map.svelte'

  import type { Map as MapType } from '@allmaps/annotation'

  export let maps: MapType[]
  export let api = false
</script>

<ol class="grid grid-cols-4">
  {#each maps as map}
    <li>
      <Map {map} {api} />
    </li>
  {/each}
</ol>
