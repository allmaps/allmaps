<script lang="ts">
  import { cn } from '../utils.js'
  import type { WithElementRef } from '../types.js'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLElement>, HTMLElement> = $props()
</script>

<kbd
  bind:this={ref}
  data-slot="kbd-group"
  class={cn('inline-flex items-center gap-1', className)}
  {...restProps}
>
  {@render children?.()}
</kbd>
