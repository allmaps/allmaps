<script lang="ts">
  import '../../../css/ui.css'
  import './select.css'
  import { Select as SelectPrimitive } from 'bits-ui'
  import Icon from 'phosphor-svelte/lib/CaretDownIcon'
  import { type WithoutChild } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    children,
    size = 'default',
    ...restProps
  }: WithoutChild<SelectPrimitive.TriggerProps> & {
    size?: 'sm' | 'default'
  } = $props()
</script>

<SelectPrimitive.Trigger
  bind:ref
  data-slot="select-trigger"
  data-size={size}
  class={['allmaps-ui allmaps-select-trigger', className]}
  {...restProps}
>
  {@render children?.()}
  <Icon size={16} aria-hidden="true" />
</SelectPrimitive.Trigger>
