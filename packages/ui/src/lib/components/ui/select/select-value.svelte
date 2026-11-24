<script lang="ts">
  import { SelectValue } from '@ui-sdk/svelte/select'
  import type { ComponentProps } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { WithElementRef } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    ...rest
  }: WithElementRef<
    ComponentProps<typeof SelectValue>,
    HTMLSpanElement
  > = $props()
</script>

<SelectValue
  {...rest}
  {@attach elementRef<HTMLSpanElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={['allmaps-ui allmaps-select-value', className]}
/>
