<script lang="ts">
  import { cn } from '../utils.js'
  import { elementRef } from '../element-ref.js'
  import { MenuTrigger } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    child,
    class: className,
    ...restProps
  }: ComponentProps<typeof MenuTrigger> & {
    child?: ComponentProps<typeof MenuTrigger>['render']
  } & { ref?: HTMLButtonElement | null } = $props()
</script>

<MenuTrigger
  {@attach elementRef<HTMLButtonElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn('delay-0', className)}
  render={child}
  {...restProps}
/>
