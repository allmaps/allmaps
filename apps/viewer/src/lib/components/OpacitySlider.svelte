<script lang="ts">
  type Props = {
    opacity?: number
    sliderElement?: HTMLInputElement
  }

  let { opacity = $bindable(1), sliderElement = $bindable() }: Props = $props()

  let opacityPercent = $derived(`${opacity * 100}%`)
</script>

<div
  class="relative flex h-36 w-8 flex-col items-center overflow-hidden rounded-full bg-white shadow-md
  border-white border-3 inset-shadow-sm"
  style:--opacity-percent={opacityPercent}
>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-0 rounded-full bg-pink-500"
    style:height={opacityPercent}
  ></div>
  <input
    bind:this={sliderElement}
    class="opacity-slider relative h-full w-full"
    type="range"
    min="0"
    max="1"
    step="0.01"
    bind:value={opacity}
    aria-label="Opacity"
  />
</div>

<style>
  .opacity-slider {
    appearance: none;
    background: transparent;
    cursor: pointer;
    writing-mode: vertical-lr;
    direction: rtl;
  }

  .opacity-slider::-webkit-slider-runnable-track {
    appearance: none;
    background: transparent;
  }

  .opacity-slider::-webkit-slider-thumb {
    appearance: none;
    width: 0;
    height: 0;
  }

  .opacity-slider::-moz-range-track {
    background: transparent;
    border: 0;
  }

  .opacity-slider::-moz-range-progress {
    background: transparent;
  }

  .opacity-slider::-moz-range-thumb {
    width: 0;
    height: 0;
    border: 0;
  }
</style>
