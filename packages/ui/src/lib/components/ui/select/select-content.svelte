<script lang="ts">
  import '../../../css/ui-base.css'
  import './select.css'
  import { SelectContent } from '@ui-sdk/svelte/select'
  import type { ComponentProps } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import SelectPortal from './select-portal.svelte'
  import SelectScrollDownButton from './select-scroll-down-button.svelte'
  import SelectScrollUpButton from './select-scroll-up-button.svelte'

  let {
    ref = $bindable(null),
    class: className,
    sideOffset = 4,
    align = 'start',
    portalProps,
    children: renderChildren,
    ...rest
  }: ComponentProps<typeof SelectContent> & {
    ref?: HTMLDivElement | null
    portalProps?: Omit<ComponentProps<typeof SelectPortal>, 'children'>
  } = $props()
</script>

<SelectPortal {...portalProps}>
  <SelectContent
    {...rest}
    {@attach elementRef<HTMLDivElement>(
      () => ref,
      (node) => (ref = node)
    )}
    {sideOffset}
    {align}
    class={['allmaps-ui allmaps-select-content', className]}
  >
    {#snippet children(state)}
      <SelectScrollUpButton />
      <div class="allmaps-select-viewport">
        {@render renderChildren?.(state)}
      </div>
      <SelectScrollDownButton />
    {/snippet}
  </SelectContent>
</SelectPortal>
