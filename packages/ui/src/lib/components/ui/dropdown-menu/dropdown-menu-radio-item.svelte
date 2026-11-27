<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuRadioItem } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import CircleIcon from 'phosphor-svelte/lib/CircleIcon'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    children: childrenProp,
    ...restProps
  }: ComponentProps<typeof MenuRadioItem> & {
    ref?: HTMLDivElement | null
  } = $props()
</script>

<MenuRadioItem
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    "data-highlighted:bg-menu-highlight data-highlighted:text-popover-foreground relative flex not-data-disabled:cursor-pointer items-center gap-2 rounded-sm py-1.5 ps-8 pe-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children(state)}
    <span
      class="pointer-events-none absolute start-2 flex size-3.5 items-center justify-center"
    >
      {#if state.checked}
        <CircleIcon class="size-2 fill-current" />
      {/if}
    </span>
    {@render childrenProp?.(state)}
  {/snippet}
</MenuRadioItem>
