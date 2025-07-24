<script lang="ts">
  import OptionsBar from './options/OptionsBar.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { OptionsState } from './options/OptionsState.svelte'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    mapOptionsStateByMapId
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    mapOptionsStateByMapId?: Map<string, OptionsState>
  } = $props()
</script>

{#snippet item(
  georeferencedMap: GeoreferencedMap,
  mapOptionsState: OptionsState
)}
  <div>
    MapId: {georeferencedMap.id}
  </div>
  <div>
    <OptionsBar optionsState={mapOptionsState}></OptionsBar>
  </div>
{/snippet}

<div class="">
  <ul>
    {#each georeferencedMaps as georeferencedMap, g}
      <div>
        {@render item(
          georeferencedMap,
          mapOptionsStateByMapId?.get(georeferencedMap.id!)!
        )}
      </div>
    {/each}
  </ul>
</div>
