<script lang="ts">
  import { getMapsState } from '$lib/state/maps.svelte.js'

  import Select from '$lib/components/Select.svelte'

  import type { DbMap3, DbTransformation } from '$lib/types/maps.js'

  type Props = {
    map: DbMap3
  }

  const mapsState = getMapsState()

  let { map }: Props = $props()

  type Item = {
    value: DbTransformation
    label: string
    disabled?: boolean
  }

  const transformationTypes: Item[] = [
    { value: 'polynomial1', label: 'Polynomial' },
    { value: 'thinPlateSpline', label: 'Thin plate spline' }
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

<Select
  items={transformationTypes}
  bind:value
  type="single"
  onValueChange={handleValueChange}
/>
