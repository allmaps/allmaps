<script lang="ts">
  import { onDestroy, type ComponentProps } from 'svelte'
  import * as Tooltip from '../../../tooltip.js'
  import StarIcon from 'phosphor-svelte/lib/StarIcon'
  import Toggle from '../toggle/toggle.svelte'
  import { cn } from '../utils.js'

  type OnPressedChange = NonNullable<
    ComponentProps<typeof Toggle>['onPressedChange']
  >

  type Props = Omit<
    ComponentProps<typeof Toggle>,
    'pressed' | 'onPressedChange' | 'children' | 'rounded'
  > & {
    starred?: boolean
    starredMessage?: string
    unstarredMessage?: string
    tooltipSide?: ComponentProps<typeof Tooltip.Content>['side']
    showFeedback?: boolean
    onStarredChange?: OnPressedChange
  }

  let {
    starred = $bindable(false),
    starredMessage = 'Starred',
    unstarredMessage = 'Unstarred',
    tooltipSide = 'bottom',
    showFeedback = true,
    ref = $bindable(null),
    onStarredChange,
    'aria-label': label = 'Star map',
    class: className,
    title,
    ...rest
  }: Props = $props()

  let icon: HTMLSpanElement
  let feedbackOpen = $state(false)
  let feedback = $state('')
  let feedbackTimer: ReturnType<typeof setTimeout>
  onDestroy(() => clearTimeout(feedbackTimer))

  const handlePressedChange: OnPressedChange = (pressed, details) => {
    onStarredChange?.(pressed, details)
    if (details.canceled) return

    if (
      pressed &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      icon.animate(
        [
          { scale: '1', easing: 'ease-out' },
          { scale: '1.3', offset: 0.4, easing: 'ease-in-out' },
          { scale: '0.94', offset: 0.72, easing: 'ease-out' },
          { scale: '1' }
        ],
        { duration: 300 }
      )
    }
    if (!showFeedback) return
    feedback = pressed ? starredMessage : unstarredMessage
    feedbackOpen = true
    clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => {
      feedbackOpen = false
    }, 2000)
  }
</script>

<Toggle
  {...rest}
  title={feedbackOpen ? undefined : title}
  rounded="full"
  bind:ref
  bind:pressed={starred}
  onPressedChange={handlePressedChange}
  aria-label={label}
  class={cn(
    'min-h-7.75 min-w-7.75 border-0 bg-transparent p-0 pointer-coarse:min-h-9.75 pointer-coarse:min-w-9.75',
    'aria-pressed:bg-transparent aria-pressed:enabled:hover:bg-muted',
    className
  )}
>
  <span bind:this={icon} class="inline-flex" aria-hidden="true">
    <StarIcon
      size={22}
      weight="fill"
      class={cn(
        '[&_path]:stroke-current [&_path]:stroke-[24] [&_path]:[stroke-linejoin:round]',
        starred ? 'fill-yellow' : 'fill-none'
      )}
    />
  </span>
</Toggle>

{#if showFeedback}
  <Tooltip.Root bind:open={feedbackOpen}>
    <Tooltip.Content anchor={ref ?? undefined} side={tooltipSide}
      >{feedback}</Tooltip.Content
    >
  </Tooltip.Root>
{/if}
