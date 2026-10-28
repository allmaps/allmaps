<script lang="ts">
  import { Separator } from 'bits-ui'
  import type { Separator as SeparatorPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SeparatorPrimitive.RootProps = $props()
</script>

<Separator.Root
  bind:ref
  data-slot="select-separator"
  class={['allmaps-ui allmaps-select-separator', className]}
  {...restProps}
/>
