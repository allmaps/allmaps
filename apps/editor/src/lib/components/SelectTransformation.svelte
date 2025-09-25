<script lang="ts">
  import { SelectTransformation } from '@allmaps/components'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type { DbMap3, DbTransformation } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  } & Record<string, unknown>

  let { map, ...restProps }: Props = $props()

  const mapsState = getMapsState()

  let value = $state<DbTransformation>(map.transformation || 'polynomial1')

  $effect(() => {
    if (value !== map.transformation) {
      mapsState.setTransformation({
        mapId: map.id,
        transformation: value
      })
    }
  })
</script>

<SelectTransformation bind:value {...restProps} />
