<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuRadioGroup } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    value = $bindable(),
    ...restProps
  }: ComponentProps<typeof MenuRadioGroup> & {
    ref?: HTMLDivElement | null
  } = $props()
</script>

<MenuRadioGroup
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  bind:value
  {...restProps}
/>
