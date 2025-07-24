<script lang="ts">
  import { Button } from '$lib/components/ui/button/index.js'
  import * as Popover from '$lib/components/ui/popover/index.js'
  import { List } from 'phosphor-svelte'

  import MapsList from './MapsList.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { OptionsState } from './options/OptionsState.svelte'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    optionsStateByMapId
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    optionsStateByMapId?: Map<string, OptionsState>
  } = $props()
</script>

<Popover.Root>
  <Popover.Trigger
    ><Button variant="secondary"><List />List</Button>
  </Popover.Trigger>
  <Popover.Content class="w-100">
    <MapsList
      {georeferencedMaps}
      {selectedMapId}
      mapOptionsStateByMapId={optionsStateByMapId}
    />
  </Popover.Content>
</Popover.Root>
