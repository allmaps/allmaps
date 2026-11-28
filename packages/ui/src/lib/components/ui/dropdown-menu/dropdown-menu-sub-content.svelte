<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuSubContent } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof MenuSubContent> & {
    ref?: HTMLDivElement | null
  } = $props()
</script>

<MenuSubContent
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    'bg-popover text-popover-foreground data-open:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-open:fade-in-0 data-ending-style:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-end-2 data-[side=right]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] origin-(--transform-origin) overflow-hidden rounded-md border border-gray-200 p-1 shadow-lg',
    className
  )}
  {...restProps}
/>
