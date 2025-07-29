<script lang="ts">
  import * as Card from '$lib/components/ui/card/index.js'
  import Checkbox from './ui/checkbox/checkbox.svelte'

  import OptionsToggles from './options/OptionsToggles.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Bbox } from '@allmaps/types'

  import type { MapOptionsState } from './options/OptionsState.svelte'
  import type { PickerProjection } from '$lib/shared/projections/projections'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    mapOptionsStateByMapId,
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    mapOptionsStateByMapId?: Map<string, MapOptionsState>
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()
</script>

{#snippet item(
  georeferencedMap: GeoreferencedMap,
  mapOptionsState: MapOptionsState
)}
  <Card.Root>
    <Card.Header>
      <Checkbox
        bind:checked={
          () => selectedMapId == georeferencedMap.id,
          (v) => {
            if (v == false) {
              selectedMapId = undefined
            } else {
              selectedMapId = georeferencedMap.id
            }
          }
        }
      />
      <div>
        MapId: {georeferencedMap.id}
      </div>
    </Card.Header>
    <Card.Content>
      <OptionsToggles
        optionsState={mapOptionsState}
        {projections}
        {searchProjections}
        {geoBbox}
        {suggestProjections}
      />
    </Card.Content>
  </Card.Root>
{/snippet}

<div class="space-y-2">
  {#each georeferencedMaps as georeferencedMap, g}
    {@render item(
      georeferencedMap,
      mapOptionsStateByMapId?.get(georeferencedMap.id!)!
    )}
  {/each}
</div>
