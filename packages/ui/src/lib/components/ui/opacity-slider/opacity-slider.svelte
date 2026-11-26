<script lang="ts">
  import * as Tooltip from '../../../tooltip.js'
  import { bindHold } from '@ui-sdk/core'
  import {
    Popover,
    PopoverContent,
    PopoverTrigger
  } from '@ui-sdk/svelte/popover'
  import {
    Slider,
    SliderControl,
    SliderIndicator,
    SliderThumb,
    SliderTrack
  } from '@ui-sdk/svelte/slider'
  import { dragOpacity } from './drag-opacity.js'
  import { elementRef } from '../element-ref.js'
  import DropIcon from 'phosphor-svelte/lib/DropIcon'

  let {
    opacity = $bindable(1),
    disabled = false,
    label = 'Map opacity'
  }: {
    opacity?: number
    disabled?: boolean
    label?: string
  } = $props()

  let open = $state(false)
  let peeking = $state(false)
  let track: HTMLDivElement
  let trigger = $state<HTMLButtonElement | null>(null)
  const anchor = $derived(
    trigger
      ? { getBoundingClientRect: trigger.getBoundingClientRect.bind(trigger) }
      : undefined
  )

  $effect(() => {
    if (disabled) open = false
  })

  function holdToPeek(button: HTMLButtonElement) {
    let previousOpacity: number
    let pointerId: number | undefined
    let startY = 0
    let dragging = false

    function updateDrag(y: number) {
      const bounds = track?.getBoundingClientRect()
      if (!bounds?.height) return
      const next = dragOpacity(startY, y, bounds, dragging)
      if (next === undefined) return
      dragging = true
      opacity = next
    }

    function move(event: PointerEvent) {
      if (event.pointerId === pointerId) updateDrag(event.clientY)
    }

    function finish(canceled: boolean, release?: Event) {
      if (pointerId === undefined) return
      if (!canceled && release instanceof PointerEvent)
        updateDrag(release.clientY)
      if (canceled || !dragging) opacity = previousOpacity
      open = false
      if (button.hasPointerCapture(pointerId))
        button.releasePointerCapture(pointerId)
      pointerId = undefined
      dragging = false
      peeking = false
    }

    const unbind = bindHold(button, {
      delay: 220,
      keys: [],
      onHold({ event }) {
        if (!(event instanceof PointerEvent)) return
        pointerId = event.pointerId
        startY = event.clientY
        previousOpacity = opacity
        opacity = opacity > 0 ? 0 : 1
        peeking = true
        open = true
        button.setPointerCapture(pointerId)
      },
      onEnd: ({ canceled, event }) => finish(canceled, event)
    })
    button.addEventListener('pointermove', move)
    return () => {
      unbind()
      button.removeEventListener('pointermove', move)
      finish(true)
    }
  }
</script>

<Popover bind:open>
  <Tooltip.Root disabled={disabled || open}>
    <Tooltip.Trigger>
      {#snippet render({ props })}
        <PopoverTrigger
          {...props}
          {disabled}
          aria-label={label}
          class="relative grid aspect-square h-auto w-full touch-none cursor-pointer place-items-center rounded-full border-0 bg-white p-0 text-inherit transition-colors delay-0 not-disabled:hover:bg-pink/10 not-disabled:hover:text-pink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default disabled:text-gray pointer-coarse:p-1"
          {@attach elementRef<HTMLButtonElement>(
            () => trigger,
            (element) => (trigger = element)
          )}
          {@attach disabled ? undefined : holdToPeek}
        >
          <DropIcon class="size-full" aria-hidden="true" />
          {#if opacity <= 0.05}
            <span
              class="pointer-events-none absolute h-1 w-3/5 rotate-45 rounded-full border border-white bg-pink"
              aria-hidden="true"
            ></span>
          {/if}
        </PopoverTrigger>
      {/snippet}
    </Tooltip.Trigger>
    <Tooltip.Content>{label}</Tooltip.Content>
  </Tooltip.Root>
  <PopoverContent
    aria-label={label}
    {anchor}
    side="top"
    sideOffset={8}
    initialFocus={peeking ? 'none' : 'input[type=range]'}
    class="w-8 min-w-0 rounded-full border-0 bg-white p-1 shadow-md"
  >
    <Slider
      orientation="vertical"
      bind:value={
        () => opacity * 100,
        (value) => {
          if (typeof value === 'number') opacity = value / 100
        }
      }
      min={0}
      max={100}
      step={1}
      largeStep={10}
      format={{ style: 'unit', unit: 'percent' }}
      {disabled}
      class="w-full min-w-0"
    >
      <SliderControl class="h-32 w-full touch-none cursor-pointer">
        <SliderTrack
          class="relative h-full w-full overflow-hidden rounded-full bg-gray-100 has-focus-visible:outline-2 has-focus-visible:outline-ring"
        >
          {#snippet render({ props, children, state })}
            <div {...props} bind:this={track}>
              {@render children?.(state)}
            </div>
          {/snippet}
          <SliderIndicator class="rounded-full bg-pink" />
          <SliderThumb
            aria-label={`${label} (percent)`}
            class="opacity-0 [&_input]:[direction:rtl] [&_input]:[writing-mode:vertical-lr]"
          />
        </SliderTrack>
      </SliderControl>
    </Slider>
  </PopoverContent>
</Popover>
