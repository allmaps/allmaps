<script lang="ts">
  import { TooltipContent } from '@ui-sdk/svelte/tooltip'
  import { onMount, type ComponentProps, type Snippet } from 'svelte'
  import type { NamedProps } from '../types.js'
  import { cn } from '../utils.js'

  let {
    children,
    sideOffset = 6,
    class: className,
    ...props
  }: Omit<
    NamedProps<ComponentProps<typeof TooltipContent>>,
    'render' | 'children'
  > & {
    children: Snippet
  } = $props()
  let mounted = $state(false)
  onMount(() => {
    mounted = true
  })
</script>

<TooltipContent
  {...props}
  {sideOffset}
  class={cn(
    'data-closed:not-data-ending-style:hidden pointer-events-none z-50 w-max max-w-(--available-width) origin-(--transform-origin) rounded bg-foreground px-2 py-1 font-allmaps-ui text-xs font-medium text-background shadow-sm',
    'transition-[opacity,scale] duration-150 ease-out data-starting-style:opacity-0 data-ending-style:opacity-0 data-starting-style:scale-95 data-ending-style:scale-95 data-ending-style:duration-100 data-instant:transition-none motion-reduce:transition-none',
    className
  )}
>
  {#snippet render({ props: elementProps, state })}
    <div {...elementProps} hidden={!mounted && !state.open}>
      {@render children()}
    </div>
  {/snippet}
</TooltipContent>
