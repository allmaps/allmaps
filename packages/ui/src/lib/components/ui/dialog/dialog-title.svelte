<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { DialogTitle } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'
  import { cn } from '../utils.js'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: ComponentProps<typeof DialogTitle> & {
    ref?: HTMLHeadingElement | null
  } = $props()
</script>

<DialogTitle
  {@attach elementRef<HTMLHeadingElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('text-lg leading-none font-semibold', className)}
  {...restProps}
/>
