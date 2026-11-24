<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogBackdrop } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof DialogBackdrop> & {
    ref?: HTMLDivElement | null
  } = $props()
</script>

<DialogBackdrop
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    'data-open:animate-in data-ending-style:animate-out data-ending-style:fade-out-0 data-open:fade-in-0 fixed inset-0 z-50 bg-black/50',
    className
  )}
  {...restProps}
/>
