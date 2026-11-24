<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogDescription } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof DialogDescription> & {
    ref?: HTMLParagraphElement | null
  } = $props()
</script>

<DialogDescription
  {@attach elementRef<HTMLParagraphElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('text-muted-foreground text-sm', className)}
  {...restProps}
/>
