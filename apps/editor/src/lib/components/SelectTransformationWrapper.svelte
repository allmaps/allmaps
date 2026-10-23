<script lang="ts">
  import { SelectTransformation } from '@allmaps/ui'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type { DbMap3, DbTransformation } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  } & Record<string, unknown>

  let { map, ...restProps }: Props = $props()

  const mapsState = getMapsState()

  // Read from and write to the shared map. A local copy goes stale when
  // someone else changes the transformation, and writing it back would undo
  // their change; with two editors open, each would keep undoing the other.
  function getTransformation(): DbTransformation {
    return map.transformation || 'polynomial1'
  }

  function setTransformation(transformation: DbTransformation) {
    if (transformation !== getTransformation()) {
      mapsState.setTransformation({
        mapId: map.id,
        transformation
      })
    }
  }
</script>

<SelectTransformation
  bind:value={getTransformation, setTransformation}
  {...restProps}
/>
