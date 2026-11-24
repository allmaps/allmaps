<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { cn } from '../utils.js'
  import { MenuItem } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    variant = 'default',
    child,
    ...restProps
  }: ComponentProps<typeof MenuItem> & {
    child?: ComponentProps<typeof MenuItem>['render']
  } & { ref?: HTMLDivElement | null } & {
    inset?: boolean
    variant?: 'default' | 'destructive'
  } = $props()
</script>

<MenuItem
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  data-inset={inset}
  data-variant={variant}
  class={cn(
    "data-highlighted:bg-menu-highlight data-highlighted:text-popover-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex delay-0 not-data-disabled:cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-popover-foreground no-underline outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    className
  )}
  render={child}
  {...restProps}
/>
