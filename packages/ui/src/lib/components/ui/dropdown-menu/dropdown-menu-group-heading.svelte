<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuGroupLabel } from '@ui-sdk/svelte/menu'
  import { cn } from '../utils.js'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    inset,
    ...restProps
  }: ComponentProps<typeof MenuGroupLabel> & { ref?: HTMLDivElement | null } & {
    inset?: boolean
  } = $props()
</script>

<MenuGroupLabel
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  data-inset={inset}
  class={cn('px-2 py-1.5 text-sm font-semibold data-[inset]:ps-8', className)}
  {...restProps}
/>
