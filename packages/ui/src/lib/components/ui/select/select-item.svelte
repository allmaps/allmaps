<script lang="ts">
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import { SelectItem, SelectItemIcon } from '@ui-sdk/svelte/select'
  import type { ComponentProps, Snippet } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { WithElementRef } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    value,
    label,
    icon,
    children: renderChildren,
    ...rest
  }: WithElementRef<ComponentProps<typeof SelectItem>, HTMLDivElement> & {
    icon?: Snippet
  } = $props()
</script>

<SelectItem
  {...rest}
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  {value}
  {label}
  class={['allmaps-ui allmaps-select-item', className]}
>
  {#snippet children(state)}
    <span class="allmaps-select-item-indicator">
      {#if state.selected}
        <CheckIcon size={16} weight="bold" aria-hidden="true" />
      {/if}
    </span>
    {#if icon}
      <SelectItemIcon class="me-2 inline-flex shrink-0" aria-hidden="true">
        {@render icon()}
      </SelectItemIcon>
    {/if}
    <span class="allmaps-select-item-text">
      {#if renderChildren}{@render renderChildren(state)}{:else}{label ??
          value}{/if}
    </span>
  {/snippet}
</SelectItem>
