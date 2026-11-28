<script lang="ts">
  import '../../../css/ui-base.css'
  import './select.css'
  import Icon from 'phosphor-svelte/lib/CaretDownIcon'
  import { SelectTrigger } from '@ui-sdk/svelte/select'
  import type { ComponentProps, Snippet } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { WithElementRef } from '../types.js'

  let {
    ref = $bindable(null),
    class: className,
    icon,
    children: renderChildren,
    ...rest
  }: WithElementRef<ComponentProps<typeof SelectTrigger>, HTMLButtonElement> & {
    icon?: Snippet
  } = $props()
</script>

<SelectTrigger
  {...rest}
  {@attach elementRef<HTMLButtonElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={['allmaps-ui allmaps-select-trigger', className]}
>
  {#snippet children(state)}
    {#if icon}
      <span aria-hidden="true" class="inline-flex shrink-0 empty:hidden">
        {@render icon()}
      </span>
    {/if}
    {@render renderChildren?.(state)}
    <Icon size={16} aria-hidden="true" class="ms-auto" />
  {/snippet}
</SelectTrigger>
