<script lang="ts">
  import { SelectGroupLabel } from '@ui-sdk/svelte/select'
  import type { ComponentProps } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { WithElementRef } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    ...rest
  }: WithElementRef<
    ComponentProps<typeof SelectGroupLabel>,
    HTMLDivElement
  > = $props()
</script>

<SelectGroupLabel
  {...rest}
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={['allmaps-ui allmaps-select-group-heading', className]}
/>
