<script lang="ts">
  import { untrack } from 'svelte'
  import type { Snippet } from 'svelte'
  import type { TransitionConfig } from 'svelte/transition'
  import { prefersReducedMotion } from 'svelte/motion'
  import { cubicInOut } from 'svelte/easing'
  import {
    hueColor,
    foldControl,
    TOOL_RING_ANIMATION_MS
  } from './control-layout'
  import type { Rail } from './control-layout'
  import type { Point } from '@allmaps/types'

  let {
    position,
    label,
    children,
    active = false,
    pressed,
    expanded,
    disabled = false,
    value,
    sliderValue,
    rail,
    hueScale = false,
    fold,
    onpointerdown,
    onclick,
    ondblclick,
    onkeydown
  }: {
    position: [number, number]
    label: string
    children: Snippet
    active?: boolean
    pressed?: boolean
    expanded?: boolean
    disabled?: boolean
    value?: string
    sliderValue?: number
    rail?: Rail
    hueScale?: boolean
    fold?: { center: Point; target: Point }
    onpointerdown?: (event: PointerEvent) => void
    onclick?: (event: MouseEvent) => void
    ondblclick?: (event: MouseEvent) => void
    onkeydown?: (event: KeyboardEvent) => void
  } = $props()

  // Capture the last live geometry: Svelte pauses the component's reactive
  // effects during outro, while the selection in its parent can already change.
  let layout = untrack(() => ({ position, fold }))
  $effect(() => {
    layout = { position, fold }
  })
  const orbit: (node: Element) => TransitionConfig = () => {
    const { position, fold } = layout
    return {
      duration: prefersReducedMotion.current ? 0 : TOOL_RING_ANIMATION_MS,
      easing: cubicInOut,
      css: (t) => {
        const p = fold
          ? foldControl(position, fold.center, fold.target, 1 - t)
          : position
        return `transition: none; opacity: ${1 - (1 - t) ** 3}; transform: translate3d(${p[0]}px, ${p[1]}px, 0)`
      }
    }
  }
  function animation(event: Event, active: boolean, closing = false) {
    const node = event.currentTarget as HTMLElement
    node.classList.toggle('folding', active)
    if (closing) node.setAttribute('aria-hidden', 'true')
    else node.removeAttribute('aria-hidden')
  }
</script>

<div
  class="map-control"
  class:active
  transition:orbit|global
  onintrostart={(event) => animation(event, true)}
  onintroend={(event) => animation(event, false)}
  onoutrostart={(event) => animation(event, true, true)}
  class:hue-control={hueScale}
  style:transform={'translate3d(' +
    position[0] +
    'px, ' +
    position[1] +
    'px, 0)'}
  class:disabled
  style:--hue-color={hueColor(sliderValue ?? 0)}
>
  {#if rail}
    <div
      class="control-track"
      class:hue-track={hueScale}
      aria-hidden="true"
      style:left={rail.start[0] - position[0] + 'px'}
      style:top={rail.start[1] - position[1] - 2 + 'px'}
      style:width={Math.hypot(
        rail.end[0] - rail.start[0],
        rail.end[1] - rail.start[1]
      ) + 'px'}
      style:transform={'rotate(' +
        Math.atan2(rail.end[1] - rail.start[1], rail.end[0] - rail.start[0]) +
        'rad)'}
    ></div>
  {/if}
  <button
    class="map-control-button"
    class:pressed
    data-tooltip={label}
    aria-label={label}
    aria-pressed={sliderValue === undefined ? pressed : undefined}
    aria-expanded={expanded}
    role={sliderValue !== undefined ? 'slider' : undefined}
    aria-valuemin={sliderValue !== undefined ? 0 : undefined}
    aria-valuemax={sliderValue !== undefined ? 1 : undefined}
    aria-valuenow={sliderValue}
    aria-valuetext={sliderValue !== undefined ? value : undefined}
    {disabled}
    {onpointerdown}
    {onclick}
    {ondblclick}
    {onkeydown}>{@render children()}</button
  >
  {#if value}<output class="control-value">{value}</output>{/if}
</div>
