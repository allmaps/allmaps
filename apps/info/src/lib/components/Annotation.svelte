<script lang="ts">
  import Maps from '$lib/components/Maps.svelte'

  import type { Map as MapType } from '@allmaps/annotation'

  export let maps: MapType[]
</script>

<p>This is a Georef Annotation.</p>

{#if maps}
  <p>
    It contains {maps.length} georeferenced maps:
  </p>
  <Maps {maps} />
{/if}
