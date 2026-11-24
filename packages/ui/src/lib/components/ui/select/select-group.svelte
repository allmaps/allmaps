<script lang="ts">
  import { SelectGroup } from '@ui-sdk/svelte/select'
  import type { ComponentProps } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { WithElementRef } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    ...rest
  }: WithElementRef<
    ComponentProps<typeof SelectGroup>,
    HTMLDivElement
  > = $props()
</script>

<SelectGroup
  {...rest}
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={['allmaps-ui allmaps-select-group', className]}
/>
