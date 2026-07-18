<script lang="ts">
  import Select from '$lib/components/Select.svelte'

  import { Polynomial1, ThinPlateSpline, Helmert } from '$lib/icons.js'

  import type { TransformationType } from '@allmaps/transform'

  type Props = {
    value: TransformationType
  }

  let { value = $bindable() }: Props = $props()

  const items = [
    { value: 'polynomial1', label: 'Polynomial', Icon: Polynomial1 },
    {
      value: 'thinPlateSpline',
      label: 'Thin plate spline',
      Icon: ThinPlateSpline
    },
    { value: 'helmert', label: 'Helmert', Icon: Helmert }
  ]
</script>

<Select {items} bind:value />
