<script lang="ts">
  import '../../../css/ui.css'
  import './select.css'
  import { Select as SelectPrimitive } from 'bits-ui'
  import { type WithoutChild } from '../types.js'
  import type { WithoutChildrenOrChild } from '../types.js'
  import SelectPortal from './select-portal.svelte'
  import SelectScrollDownButton from './select-scroll-down-button.svelte'
  import SelectScrollUpButton from './select-scroll-up-button.svelte'
  import type { ComponentProps } from 'svelte'

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    portalProps,
    children,
    preventScroll = true,
    ...restProps
  }: WithoutChild<SelectPrimitive.ContentProps> & {
    portalProps?: WithoutChildrenOrChild<ComponentProps<typeof SelectPortal>>
  } = $props()
</script>

<SelectPortal {...portalProps}>
  <SelectPrimitive.Content
    bind:ref
    {sideOffset}
    {preventScroll}
    data-slot="select-content"
    class={['allmaps-ui allmaps-select-content', className]}
    {...restProps}
  >
    <SelectScrollUpButton />
    <SelectPrimitive.Viewport class="allmaps-select-viewport">
      {@render children?.()}
    </SelectPrimitive.Viewport>
    <SelectScrollDownButton />
  </SelectPrimitive.Content>
</SelectPortal>
