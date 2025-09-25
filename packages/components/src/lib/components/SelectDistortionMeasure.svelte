<script lang="ts">
  import Select from '$lib/components/Select.svelte'

  import { Angle as AngleIcon, Resize as ResizeIcon } from 'phosphor-svelte'

  import type { DistortionMeasure } from '@allmaps/transform'

  type Props = {
    value?: DistortionMeasure | ''
  }

  let { value = $bindable('') }: Props = $props()

  const items = [
    { value: '', label: 'None' },
    { value: 'log2sigma', label: 'Area distortion', Icon: ResizeIcon },
    { value: 'twoOmega', label: 'Angular distortion', Icon: AngleIcon }
  ]
</script>

<Select {items} bind:value />
