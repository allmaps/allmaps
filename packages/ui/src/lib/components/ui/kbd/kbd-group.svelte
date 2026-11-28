<script module lang="ts">
  import { definePrimitive } from '@ui-sdk/core'
  import { createParts } from '@ui-sdk/svelte/primitive'

  const primitive = definePrimitive({
    name: 'kbd-group',
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
  class={cn('inline-flex items-center gap-1 border-0 p-0', className)}
  {...restProps}
  id={restProps.id ?? undefined}
>
  {@render children?.()}
</Root>
