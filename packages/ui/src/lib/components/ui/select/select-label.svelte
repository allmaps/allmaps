<script lang="ts">
  import { type WithElementRef } from '../types.js'
  import type { HTMLAttributes } from 'svelte/elements'

  let {
    ref = $bindable(null),
    class: className,
    children,
    ...restProps
  }: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props()
</script>

<div
  bind:this={ref}
  data-slot="select-label"
  class={['allmaps-ui allmaps-select-label', className]}
  {...restProps}
>
  {@render children?.()}
</div>
