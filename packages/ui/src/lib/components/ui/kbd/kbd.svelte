<script module lang="ts">
  import { definePrimitive } from '@ui-sdk/core'
  import { createParts } from '@ui-sdk/svelte/primitive'

  const primitive = definePrimitive({
    name: 'kbd',
    state: () => ({}),
    api: () => ({}),
    slots: (slot) => ({ root: slot({}) })
  })
  const { Root } = createParts(primitive, { root: 'kbd' })
</script>

<script lang="ts">
  import { elementRef } from '../element-ref.js'
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

<Root
  {@attach elementRef<HTMLElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    'bg-gray-100/50 text-foreground pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm border-0 px-1 py-0 font-allmaps-ui-mono text-xs font-medium shadow-[1px_1px_0] shadow-border/75 select-none',
    "[&_svg:not([class*='size-'])]:size-3",
    '[:root:is(.dark,[data-theme=dark])_&]:bg-gray-800',
    className
  )}
  {...restProps}
  id={restProps.id ?? undefined}
>
  {@render children?.()}
</Root>
