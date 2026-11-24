<script lang="ts">
  import { cn } from '../utils.js'
  import { elementRef } from '../element-ref.js'
  import { DialogClose } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    child,
    class: className,
    ...restProps
  }: ComponentProps<typeof DialogClose> & {
    child?: ComponentProps<typeof DialogClose>['render']
  } & { ref?: HTMLButtonElement | null } = $props()
</script>

<DialogClose
  {@attach elementRef<HTMLButtonElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('delay-0', className)}
  render={child}
  {...restProps}
/>
