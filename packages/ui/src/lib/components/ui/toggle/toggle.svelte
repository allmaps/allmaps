<script lang="ts">
  import '../../../css/ui-base.css'
  import { Toggle as TogglePrimitive } from '@ui-sdk/svelte/toggle'
  import type { ComponentProps } from 'svelte'
  import { elementRef } from '../element-ref.js'
  import type { NamedProps, Rounded, WithElementRef } from '../types.js'
  import { cn } from '../utils.js'

  let {
    rounded = 'rounded',
    pressed = $bindable(false),
    ref = $bindable(null),
    class: className,
    ...rest
  }: WithElementRef<
    Omit<NamedProps<ComponentProps<typeof TogglePrimitive>>, 'defaultPressed'>,
    HTMLButtonElement
  > & { rounded?: Rounded } = $props()
</script>

<TogglePrimitive
  {...rest}
  defaultPressed={undefined}
  bind:pressed
  {@attach elementRef<HTMLButtonElement>(
    () => ref,
    (node) => (ref = node)
  )}
  class={cn(
    'inline-flex min-h-(--allmaps-ui-control-height) min-w-(--allmaps-ui-control-height) cursor-pointer items-center delay-0 justify-center gap-2 border border-border bg-background px-3 font-allmaps-ui text-sm font-medium text-foreground',
    'motion-safe:transition-colors motion-safe:duration-150 enabled:hover:bg-muted aria-pressed:border-ring aria-pressed:bg-accent aria-pressed:enabled:hover:bg-[color-mix(in_srgb,var(--color-accent)_90%,var(--color-primary))]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    'disabled:cursor-not-allowed disabled:opacity-50 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
    rounded === 'full' ? 'rounded-full' : 'rounded-md',
    className
  )}
/>
