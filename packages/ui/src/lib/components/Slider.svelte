<script lang="ts">
  // import { browser } from '$app/environment';
  // can not use browser from sveltekit or else docs astro are breaking

  import { onMount } from "svelte";

  export let value: number
  export let keyCode: string | undefined = undefined
  export let label: string

  export let step = 0.05
  export let invert = false

  export let active = false
  export let hover = false
  export let toggleValue = 1

  // internalValue always has minValue 0 and maxValue 1
  let internalValue = invert ? 1 - value : value
  let initialValue = internalValue
  let lastValue = internalValue
  let isOsx = false

  onMount(() => {
    isOsx = window?.navigator.userAgent.indexOf("Mac OS X") !== -1
  })

  $: {
    value = invert ? 1 - internalValue : internalValue
    console.log('value', value)
  }

  function clampValue(value: number): number {
    if (value > 1) {
      return 1
    } else if (value < 0) {
      return 0
    } else {
      return value
    }
  }

  const enter = () => {
    hover = true
  }
  const exit = () => {
    hover = false
  }
  const pointerdown = (event: MouseEvent | TouchEvent | KeyboardEvent) => {
    active = true
    hover = true
    lastValue = internalValue
    if (event.shiftKey) {
      internalValue = clampValue(initialValue + toggleValue)
    } else {
      internalValue = clampValue(initialValue - toggleValue)
    }
  }
  const pointerup = () => {
    internalValue = lastValue
    active = false
  }
  const keydown = (event: KeyboardEvent) => {
    if (
      !active &&
      keyCode &&
      event.code === keyCode &&
      event.target === document.body
    ) {
      pointerdown(event)
    }
  }
  const keyup = (event: KeyboardEvent) => {
    if (keyCode && event.code === keyCode && event.target === document.body) {
      pointerup()
    }
  }

  const wheel = (event: WheelEvent) => {
    event.preventDefault()
    event.stopPropagation()
    let delta = event.deltaY / 100
    if (Math.abs(step * 3) < 1) {
      delta = event.deltaY > 0 ? step : -1 * step
    }
    delta = isOsx ? delta * -1 : delta
    internalValue = clampValue(internalValue - delta)
  }

  const globalPointerdown = (event: PointerEvent) => {
    if (event.target instanceof HTMLCanvasElement) {
      active = false
      hover = false
    }
  }
</script>

<svelte:window
  on:keydown={keydown}
  on:keyup={keyup}
  on:pointerdown={globalPointerdown}
/>

<div
  class="inline-block flex z-100 select-none container"
  role="slider"
  aria-valuenow={value}
  tabindex="0"
  on:mouseenter={enter}
  on:mouseleave={exit}
  on:wheel={wheel}
>
  <div
    class="overflow-hidden transition-all rounded-full border-gray-900 border relative border-1 p-1 w-9 bg-white cursor-pointer {hover
      ? ' h-[150px]'
      : ' h-9'}"
  >
    <div
      class="absolute bottom-0 left-0 w-full h-8 flex justify-center items-center"
      on:pointerdown={pointerdown}
      on:pointerup={pointerup}
    >
      <slot />
    </div>

    <div
      class="absolute top-0 left-0 w-full h-[calc(100%-2.2rem)] z-10 {!hover
        ? 'hidden'
        : ''}"
    >
      <input
        type="range"
        class="slider"
        bind:value={internalValue}
        min="0"
        max="1"
        alt={label}
        {step}
        on:pointerenter={() => (active = true)}
        on:pointerleave={() => (active = false)}
      />
    </div>

    <div
      class="absolute bottom-0 left-0 w-full z-0 background"
      style="height: calc({internalValue * 100}%{!hover
        ? ''
        : ' + ' + (1 - internalValue) * 2.2 + 'rem'});"
    />
  </div>
</div>

<style>
  .background {
    background-color: rgb(215 215 215);
  }
  .container {
    -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
    -webkit-tap-highlight-color: transparent;
  }

  .slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 100%;
    background: transparent;
    outline: none;
    opacity: 0.7;
    transition: opacity 0.2s;
    transform: rotate(180deg);
    writing-mode: vertical-lr;
  }

  /* @supports (-moz-appearance: none) {
    .slider {
      transform: rotate(180deg);
    }
  } */

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 30px;
    height: 10px;
    background: transparent;
    cursor: ns-resize;
    border-radius: 0;
  }

  .slider::-moz-range-thumb {
    width: 100%;
    height: 10px;
    background: transparent;
    cursor: ns-resize;
    border-radius: 0;
  }

  .slider::-moz-range-track {
    background: transparent;
  }

  .slider::-moz-range-progress {
    background: transparent;
  }

  .slider::-moz-focus-outer {
    border: 0;
  }

  .slider::-ms-track {
    background: transparent;
    border-color: transparent;
    color: transparent;
  }
</style>
