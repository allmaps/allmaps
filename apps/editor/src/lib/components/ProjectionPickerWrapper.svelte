<script lang="ts">
  import { ProjectionPicker } from '@allmaps/components'
  import {
    createBboxIndex,
    createFullTextIndex
  } from '@allmaps/components/projections'

  import { getProjectionsState } from '@allmaps/components/state'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import { getApiUrl } from '$lib/shared/urls.js'
  import { toDbProjection } from '$lib/shared/maps.js'

  import type { PickerProjection } from '@allmaps/components/projections'

  import type { DbMap3 } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  } & Record<string, unknown>

  let { map, ...restProps }: Props = $props()

  const mapsState = getMapsState()
  const projectionsState = getProjectionsState()
  const uiState = getUiState()

  let projectionId = $derived(
    map.resourceCrs?.id
      ? getApiUrl(`projections/${map.resourceCrs?.id}`)
      : undefined
  )

  let value = $derived(projectionId)

  let searchProjectionsByString = $derived(uiState.projectionIndices.fullText)
  let searchProjectionsByBbox = $derived(uiState.projectionIndices.bbox)

  $effect(() => {
    if (
      projectionsState.projections.length &&
      !uiState.projectionIndices.fullText
    ) {
      uiState.projectionIndices.fullText = createFullTextIndex(
        projectionsState.projections
      )
    }
  })

  $effect(() => {
    if (
      projectionsState.projections.length &&
      !uiState.projectionIndices.bbox
    ) {
      uiState.projectionIndices.bbox = createBboxIndex(
        projectionsState.projections
      )
    }
  })

  $effect(() => {
    projectionsState.fetchProjections()
  })

  function handleSelect(projection: PickerProjection) {
    if (!projection.definition) {
      mapsState.setResourceCrs({
        mapId: map.id,
        resourceCrs: undefined
      })
    } else if (typeof projection.definition !== 'string') {
      console.error('Only projections with string definitions are supported')
    } else if (projection.id !== projectionId) {
      mapsState.setResourceCrs({
        mapId: map.id,
        resourceCrs: toDbProjection(projection)
      })
    }
  }
</script>

{#if projectionsState.ready}
  <ProjectionPicker
    projections={projectionsState.projections}
    bind:value
    onselect={handleSelect}
    {searchProjectionsByString}
    {searchProjectionsByBbox}
    bbox={uiState.lastBbox}
    {...restProps}
  />
{/if}
