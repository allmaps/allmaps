<script lang="ts">
  import { Select } from '@allmaps/components'

  import {
    Polynomial1,
    ThinPlateSpline,
    Helmert
  } from '@allmaps/components/icons'

  import { getMapsState } from '$lib/state/maps.svelte.js'

  import type { DbMap3, DbTransformation } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  }

  const mapsState = getMapsState()

  let { map }: Props = $props()

  const items = [
    { value: 'polynomial1', label: 'Polynomial', Icon: Polynomial1 },
    {
      value: 'thinPlateSpline',
      label: 'Thin plate spline',
      Icon: ThinPlateSpline
    },
    { value: 'helmert', label: 'Helmert', Icon: Helmert }
  ]

  let value = $state<DbTransformation>(map.transformation || 'polynomial1')

  function handleValueChange() {
    mapsState.setTransformation({
      mapId: map.id,
      transformation: value
    })
  }

  $effect(() => {
    if (map.transformation && value !== map.transformation) {
      value = map.transformation
    }
  })
</script>

<Select {items} bind:value type="single" onValueChange={handleValueChange} />
