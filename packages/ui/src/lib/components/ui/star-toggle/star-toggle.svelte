<script lang="ts">
  import type { ComponentProps } from 'svelte'
  import StarIcon from 'phosphor-svelte/lib/StarIcon'
  import Toggle from '../toggle/toggle.svelte'
  import { cn } from '../utils.js'

  type Props = Omit<
    ComponentProps<typeof Toggle>,
    'pressed' | 'onPressedChange' | 'children' | 'rounded'
  > & {
    starred?: boolean
    onStarredChange?: (starred: boolean) => void
  }

  let {
    starred = $bindable(false),
    ref = $bindable(null),
    onStarredChange,
    'aria-label': label = 'Star map',
    class: className,
    ...rest
  }: Props = $props()

  let icon: HTMLSpanElement

  function handlePressedChange(pressed: boolean) {
    if (
      pressed &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      icon.animate([{ scale: '1' }, { scale: '1.15' }, { scale: '1' }], {
        duration: 180,
        easing: 'ease-out'
      })
    }
    onStarredChange?.(pressed)
  }
</script>

<Toggle
  {...rest}
  rounded="full"
  bind:ref
  bind:pressed={starred}
  onPressedChange={handlePressedChange}
  aria-label={label}
  class={cn(
    'min-h-8 min-w-8 border-0 bg-transparent p-0 pointer-coarse:min-h-10 pointer-coarse:min-w-10',
    'aria-pressed:bg-transparent aria-pressed:enabled:hover:bg-muted',
    className
  )}
>
  <span bind:this={icon} class="inline-flex" aria-hidden="true">
    <StarIcon
      size={22}
      weight={starred ? 'fill' : 'regular'}
      class={starred
        ? 'fill-yellow [&_path]:stroke-yellow-800 [&_path]:stroke-[12]'
        : undefined}
    />
  </span>
</Toggle>
