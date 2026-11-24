<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuSubTrigger } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import ChevronRightIcon from 'phosphor-svelte/lib/CaretRightIcon'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    children: label,
    ...restProps
  }: ComponentProps<typeof MenuSubTrigger> & { ref?: HTMLDivElement | null } & {
    inset?: boolean
  } = $props()
</script>

<MenuSubTrigger
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  data-inset={inset}
  class={cn(
    "data-highlighted:bg-menu-highlight data-highlighted:text-popover-foreground data-open:bg-menu-highlight data-open:text-popover-foreground [&_svg:not([class*='text-'])]:text-muted-foreground flex delay-0 not-data-disabled:cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  {...restProps}
>
  {#snippet children(state)}
    {@render label?.(state)}
    <ChevronRightIcon class="ms-auto size-4" />
  {/snippet}
</MenuSubTrigger>
