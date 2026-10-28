<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: SelectPrimitive.GroupProps = $props()
</script>

<SelectPrimitive.Group
  bind:ref
  data-slot="select-group"
  class={['allmaps-ui allmaps-select-group', className]}
  {...restProps}
/>
