<script lang="ts">
  import OptionsButton from './options/OptionsButton.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { OptionsState } from './options/OptionsState.svelte'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    optionsStateByMapId = new Map()
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    optionsStateByMapId?: Map<string, OptionsState>
  } = $props()
</script>

{#snippet item(georeferencedMap: GeoreferencedMap)}
  MapId: {georeferencedMap.id}
  <OptionsButton optionsState={optionsStateByMapId.get(georeferencedMap.id!)!}
  ></OptionsButton>
{/snippet}

<ul>
  {#each georeferencedMaps as georeferencedMap, g}
    <div>
      {@render item(georeferencedMap)}
    </div>
  {/each}
</ul>
