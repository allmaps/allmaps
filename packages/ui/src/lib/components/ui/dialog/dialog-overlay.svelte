<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogBackdrop } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    variant = 'default',
    ...restProps
  }: ComponentProps<typeof DialogBackdrop> & {
    ref?: HTMLDivElement | null
    variant?: 'default' | 'dark'
  } = $props()
</script>

<DialogBackdrop
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    'fixed inset-0 z-50 transition-opacity duration-200 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-150 motion-reduce:transition-none',
    variant === 'dark' ? 'bg-black/90' : 'bg-black/50',
    className
  )}
  {...restProps}
/>
