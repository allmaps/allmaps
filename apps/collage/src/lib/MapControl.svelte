<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import type { Snippet } from 'svelte'
  import type { TransitionConfig } from 'svelte/transition'
  import { prefersReducedMotion } from 'svelte/motion'
  import { cubicInOut } from 'svelte/easing'
  import { TouchDoubleTap } from './double-tap'
  import {
    hueColor,
    foldControl,
    TOOL_RING_ANIMATION_MS
  } from './control-layout'
  import type { Rail, ControlFold } from './control-layout'

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
    sliderMax = 1,
    rail,
    hueScale = false,
    fold,
    animate = true,
    motionDuration,
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
    sliderMax?: number
    rail?: Rail
    hueScale?: boolean
    fold?: ControlFold
    animate?: boolean
    motionDuration?: number
    onpointerdown?: (event: PointerEvent) => void
    onclick?: (event: MouseEvent) => void
    ondblclick?: (event: MouseEvent) => void
    onkeydown?: (event: KeyboardEvent) => void
  } = $props()

  // Capture the last live geometry: Svelte pauses the component's reactive
  // effects during outro, while the selection in its parent can already change.
  let layout = untrack(() => ({ position, fold, animate }))
  $effect(() => {
    layout = { position, fold, animate }
  })
  const orbit: (node: Element) => TransitionConfig = () => {
    const { position, fold, animate } = layout
    return {
      duration:
        !animate || prefersReducedMotion.current ? 0 : TOOL_RING_ANIMATION_MS,
      easing: cubicInOut,
      css: (t) => {
        const p = fold
          ? foldControl(
              position,
              fold.center,
              fold.target,
              1 - t,
              fold.clockwise
            )
          : position
        return `transition: none; opacity: ${1 - (1 - t) ** 3}; transform: translate3d(${p[0]}px, ${p[1]}px, 0)`
      }
    }
  }
  function animation(event: Event, active: boolean, closing = false) {
    const node = event.currentTarget as HTMLElement
    node.classList.toggle('folding', active)
    node.inert = closing
    if (closing) node.setAttribute('aria-hidden', 'true')
    else node.removeAttribute('aria-hidden')
    // A quickly reversed outro can leave a forwards-filled orbit behind.
    // Once the intro ends, release any overlapping orbits while retaining
    // the CSS transitions that animate later changes in the ring's position.
    if (!active)
      for (const animation of node.getAnimations())
        if (!('transitionProperty' in animation)) animation.cancel()
  }

  // A selection can put a new control underneath the finger that selected it.
  // Its following click belongs to the canvas, not to the newly shown tool.
  let button: HTMLButtonElement
  let pointerStartedHere = false
  const taps = new TouchDoubleTap<true>()
  let ignoreDoubleClickUntil = 0
  function click(event: MouseEvent) {
    const allowed = pointerStartedHere || event.detail === 0
    pointerStartedHere = false
    if (allowed) onclick?.(event)
  }

  function doubleClick(event: MouseEvent) {
    if (performance.now() >= ignoreDoubleClickUntil) ondblclick?.(event)
  }

  onMount(() => {
    const rememberOrigin = (event: PointerEvent) => {
      pointerStartedHere =
        event.target instanceof Node && button.contains(event.target)
      taps.start(
        event,
        pointerStartedHere && !disabled && ondblclick ? true : undefined
      )
    }
    const move = (event: PointerEvent) => taps.move(event)
    const up = (event: PointerEvent) => {
      const target =
        event.target instanceof Node && button.contains(event.target)
          ? true
          : undefined
      if (taps.end(event, target)) {
        // WebKit does not synthesize dblclick for these touch controls.
        // Suppress it in browsers that do, and let the parent finish its
        // pointer-up/drag handling before applying the reset.
        ignoreDoubleClickUntil = performance.now() + 500
        setTimeout(() => {
          if (button.isConnected && !disabled) ondblclick?.(event)
        }, 0)
      }
    }
    const cancel = () => {
      pointerStartedHere = false
      taps.reset()
    }
    // Safari emits pointerleave between touch pointerup and click. Keep the
    // origin until click, cancellation or the next press (anywhere), not leave.
    window.addEventListener('pointerdown', rememberOrigin, true)
    window.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel, true)
    window.addEventListener('blur', cancel)
    return () => {
      window.removeEventListener('pointerdown', rememberOrigin, true)
      window.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel, true)
      window.removeEventListener('blur', cancel)
    }
  })
</script>

<div
  class="map-control"
  class:active
  transition:orbit|global
  onintrostart={(event) => animation(event, true)}
  onintroend={(event) => animation(event, false)}
  onoutrostart={(event) => animation(event, true, true)}
  class:hue-control={hueScale && pressed}
  style:transform={'translate3d(' +
    position[0] +
    'px, ' +
    position[1] +
    'px, 0)'}
  class:disabled
  style:--control-move-duration={motionDuration === undefined
    ? undefined
    : `${motionDuration}ms`}
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
    bind:this={button}
    class="map-control-button"
    class:pressed
    data-tooltip={label}
    aria-label={label}
    aria-pressed={sliderValue === undefined ? pressed : undefined}
    aria-expanded={expanded}
    role={sliderValue !== undefined ? 'slider' : undefined}
    aria-valuemin={sliderValue !== undefined ? 0 : undefined}
    aria-valuemax={sliderValue !== undefined ? sliderMax : undefined}
    aria-valuenow={sliderValue}
    aria-valuetext={sliderValue !== undefined ? value : undefined}
    {disabled}
    {onpointerdown}
    onclick={click}
    ondblclick={doubleClick}
    {onkeydown}>{@render children()}</button
  >
  {#if value}<output class="control-value">{value}</output>{/if}
</div>
