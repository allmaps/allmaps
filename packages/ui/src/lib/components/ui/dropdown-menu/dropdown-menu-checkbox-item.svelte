<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuCheckboxItem } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import { getCheckboxGroup } from './checkbox-group.js'
  import CheckIcon from 'phosphor-svelte/lib/CheckIcon'
  import MinusIcon from 'phosphor-svelte/lib/MinusIcon'
  import { cn } from '../utils.js'
  import type { HTMLAttributes } from 'svelte/elements'
  import type { Snippet } from 'svelte'

  const itemId = $props.id()
  let {
    ref = $bindable(null),
    value = itemId,
    onCheckedChange,
    onIndeterminateChange,
    checked = $bindable(false),
    indeterminate = $bindable(false),
    class: className,
    children: childrenProp,
    ...restProps
  }: Pick<
    ComponentProps<typeof MenuCheckboxItem>,
    'onCheckedChange' | 'checked' | 'disabled' | 'closeOnSelect' | 'label'
  > &
    HTMLAttributes<HTMLDivElement> & {
      value?: string
      ref?: HTMLDivElement | null
    } & {
      children?: Snippet
      indeterminate?: boolean
      onIndeterminateChange?: (value: boolean) => void
    } = $props()
  const group = getCheckboxGroup()
  const selected = $derived(
    !indeterminate && (group ? group.includes(value) : checked)
  )
</script>

<MenuCheckboxItem
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  {value}
  checked={selected}
  onCheckedChange={(next, details) => {
    onCheckedChange?.(next, details)
    if (details.canceled) return
    checked = next
    if (indeterminate) {
      indeterminate = false
      onIndeterminateChange?.(false)
    }
    group?.setChecked(value, next)
  }}
  class={cn(
    "data-highlighted:bg-menu-highlight data-highlighted:text-popover-foreground relative flex not-data-disabled:cursor-pointer items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet render({ props, children, state })}
    <div {...props} aria-checked={indeterminate ? 'mixed' : state.checked}>
      {@render children?.(state)}
    </div>
  {/snippet}
  {#snippet children({ checked })}
    <span
      class="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center"
    >
      {#if indeterminate}
        <MinusIcon class="size-4" />
      {:else}
        <CheckIcon class={cn('size-4', !checked && 'text-transparent')} />
      {/if}
    </span>
    {@render childrenProp?.()}
  {/snippet}
</MenuCheckboxItem>
