<script lang="ts">
  import { elementRef } from '../element-ref.js'
  import { MenuGroup } from '@ui-sdk/svelte/menu'
  import type { ComponentProps } from 'svelte'
  import { setCheckboxGroup } from './checkbox-group.js'

  let {
    ref = $bindable(null),
    value = $bindable([]),
    onValueChange,
    ...props
  }: ComponentProps<typeof MenuGroup> & {
    ref?: HTMLDivElement | null
    value?: string[]
    onValueChange?: (value: string[]) => void
  } = $props()

  setCheckboxGroup({
    includes: (item) => value.includes(item),
    setChecked(item, checked) {
      value = checked
        ? [...new Set([...value, item])]
        : value.filter((v) => v !== item)
      onValueChange?.(value)
    }
  })
</script>

<MenuGroup
  {...props}
  {@attach elementRef<HTMLDivElement>(
    () => ref,
    (node) => (ref = node)
  )}
/>
