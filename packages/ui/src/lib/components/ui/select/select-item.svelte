<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import { Check as Icon } from 'phosphor-svelte'
  import { type WithoutChild } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    value,
    label,
    children: childrenProp,
    ...restProps
  }: WithoutChild<SelectPrimitive.ItemProps> = $props()
</script>

<SelectPrimitive.Item
  bind:ref
  {value}
  {label}
  data-slot="select-item"
  class={['allmaps-ui allmaps-select-item', className]}
  {...restProps}
>
  {#snippet children({ selected, highlighted })}
    <span class="allmaps-select-item-indicator">
      {#if selected}
        <Icon size={16} aria-hidden="true" />
      {/if}
    </span>
    <span class="allmaps-select-item-text">
      {#if childrenProp}
        {@render childrenProp({ selected, highlighted })}
      {:else}
        {label || value}
      {/if}
    </span>
  {/snippet}
</SelectPrimitive.Item>
