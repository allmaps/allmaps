<script lang="ts">
  import { ProjectionPicker } from '@allmaps/components'
  import {
    createBboxIndex,
    createFullTextIndex
  } from '@allmaps/components/projections'

  import { getProjectionsState } from '@allmaps/components/state'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type { PickerProjection } from '@allmaps/components/projections'

  import type { DbMap3 } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  } & Record<string, unknown>

  let { map, ...restProps }: Props = $props()

  const mapsState = getMapsState()
  const projectionsState = getProjectionsState()
  const uiState = getUiState()

  let value = $state<string>()

  let searchProjectionsByString = $derived(
    createFullTextIndex(projectionsState.projections)
  )

  let searchProjectionsByBbox = $derived(
    createBboxIndex(projectionsState.projections)
  )

  function handleSelect(projection: PickerProjection) {
    if (typeof projection.definition !== 'string') {
      console.error('Only projections with string definitions are supported')
    }

    if (projection.definition !== map.resourceCrs?.definition) {
      mapsState.setResourceCrs({
        mapId: map.id,
        resourceCrs: {
          name: projection.name,
          definition: projection.definition as string
        }
      })
    }
  }
</script>

<ProjectionPicker
  projections={projectionsState.projections}
  bind:value
  onselect={handleSelect}
  {searchProjectionsByString}
  {searchProjectionsByBbox}
  bbox={uiState.lastBbox}
  {...restProps}
/>
