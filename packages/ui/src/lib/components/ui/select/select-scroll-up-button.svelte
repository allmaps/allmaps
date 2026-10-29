<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import Icon from 'phosphor-svelte/lib/CaretUpIcon'
  import { type WithoutChildrenOrChild } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<SelectPrimitive.ScrollUpButtonProps> = $props()
</script>

<SelectPrimitive.ScrollUpButton
  bind:ref
  data-slot="select-scroll-up-button"
  class={['allmaps-ui allmaps-select-scroll-up-button', className]}
  {...restProps}
>
  <Icon size={16} aria-hidden="true" />
</SelectPrimitive.ScrollUpButton>
