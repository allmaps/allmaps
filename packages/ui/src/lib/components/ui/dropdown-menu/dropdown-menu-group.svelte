<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuGroup } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    ...restProps
  }: ComponentProps<typeof MenuGroup> & { ref?: HTMLDivElement | null } =
    $props()
</script>

<MenuGroup
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  {...restProps}
/>
