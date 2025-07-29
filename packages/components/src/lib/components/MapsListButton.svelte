<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Popover from '$lib/components/ui/popover/index.js'
  import { List } from 'phosphor-svelte'

  import MapsList from './MapsList.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Bbox } from '@allmaps/types'

  import type { MapOptionsState } from './options/OptionsState.svelte'
  import type { PickerProjection } from '$lib/shared/projections/projections'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    optionsStateByMapId,
    projections,
    searchProjections,
    geoBbox = undefined,
    suggestProjections = undefined
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    optionsStateByMapId?: Map<string, MapOptionsState>
    projections: PickerProjection[]
    searchProjections?: (s: string) => PickerProjection[]
    geoBbox?: Bbox
    suggestProjections?: (b: Bbox) => PickerProjection[]
  } = $props()
</script>

<Popover.Root>
  <Popover.Trigger
    ><Button variant="secondary"
      ><List />{georeferencedMaps.length +
        ' Map' +
        (georeferencedMaps.length > 1 ? 's' : '')}</Button
    >
  </Popover.Trigger>
  <Popover.Content class="w-160">
    <MapsList
      {georeferencedMaps}
      bind:selectedMapId
      mapOptionsStateByMapId={optionsStateByMapId}
      {projections}
      {searchProjections}
      {geoBbox}
      {suggestProjections}
    />
  </Popover.Content>
</Popover.Root>
