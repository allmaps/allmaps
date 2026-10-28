<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import { CaretDown as Icon } from 'phosphor-svelte'
  import { type WithoutChildrenOrChild } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollDownButtonProps> = $props()
</script>

<SelectPrimitive.ScrollDownButton
  bind:ref
  data-slot="select-scroll-down-button"
  class={['allmaps-ui allmaps-select-scroll-down-button', className]}
  {...restProps}
>
  <Icon size={16} aria-hidden="true" />
</SelectPrimitive.ScrollDownButton>
