<script lang="ts">
  import { cn } from '../utils.js'
  import { elementRef } from '../element-ref.js'
  import { DialogTrigger } from '@ui-sdk/svelte/dialog'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    child,
    class: className,
    ...restProps
  }: ComponentProps<typeof DialogTrigger> & {
    child?: ComponentProps<typeof DialogTrigger>['render']
  } & { ref?: HTMLButtonElement | null } = $props()
</script>

<DialogTrigger
  {@attach elementRef<HTMLButtonElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('delay-0', className)}
  render={child}
  {...restProps}
/>
