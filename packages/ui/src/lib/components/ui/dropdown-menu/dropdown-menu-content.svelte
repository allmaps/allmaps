<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { cn } from '../utils.js'
  import type { WithoutChildrenOrChild } from '../types.js'
  import DropdownMenuPortal from '../popup-portal.svelte'
  import { MenuContent } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    sideOffset = 4,
    portalProps,
    class: className,
    ...restProps
  }: ComponentProps<typeof MenuContent> & { ref?: HTMLDivElement | null } & {
    portalProps?: WithoutChildrenOrChild<
      ComponentProps<typeof DropdownMenuPortal>
    >
  } = $props()
</script>

<DropdownMenuPortal disabled={!portalProps} {...portalProps}>
  <MenuContent
    {@attach elementRef<HTMLDivElement>(
      () => ref,
      (node) => (ref = node)
    )}
    {sideOffset}
    class={cn(
      'bg-popover text-popover-foreground data-open:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-open:fade-in-0 data-ending-style:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border border-gray-200 p-1 shadow-md outline-none',
      className
    )}
    {...restProps}
  />
</DropdownMenuPortal>
