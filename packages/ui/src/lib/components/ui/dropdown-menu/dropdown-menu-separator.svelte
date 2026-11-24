<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuSeparator } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof MenuSeparator> & {
    ref?: HTMLDivElement | null
  } = $props()
</script>

<MenuSeparator
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('bg-border -mx-1 my-1 h-px', className)}
  {...restProps}
/>
