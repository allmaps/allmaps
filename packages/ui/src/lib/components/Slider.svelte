<script lang="ts">
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


  $: {
    value = invert ? 1 - internalValue : internalValue
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

  const enter = (event: MouseEvent | TouchEvent) => {
    hover = true
    console.log('enter')
  }
  const exit = () => {
    hover = false
    console.log('exit')
  }
  const pointerdown = (event: MouseEvent | TouchEvent | KeyboardEvent) => {
    console.log('pointerdown')
    active = true
    lastValue = internalValue
    if (event.shiftKey) {
      internalValue = clampValue(initialValue + toggleValue)
    } else {
      internalValue = clampValue(initialValue - toggleValue)
    }
  }
  const pointerup = () => {
    console.log('pointerup')
    internalValue = lastValue
    active = false
  }
  const keydown = (event: KeyboardEvent) => {
    if (!active && keyCode && event.code === keyCode && event.target === document.body) {
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
    const delta = event.deltaY
    internalValue = clampValue(internalValue + delta / 100)
  }
</script>

<svelte:window on:keydown={keydown} on:keyup={keyup} />

<div class="inline-block flex z-100 select-none container" on:mouseenter={enter} on:mouseleave={exit} on:wheel={wheel}>
    <div
      class="overflow-hidden transition-all rounded-full relative border-2 bg-white p-1 w-9 cursor-pointer {hover
        ? 'border-black h-[150px]'
        : 'border-gray-500 h-9'}"
    >
      <div
        class="absolute bottom-0 left-0 w-full h-8 flex justify-center items-center"
        on:pointerdown={pointerdown}
        on:pointerup={pointerup}
      >
        <slot />
      </div>

      <div
        class="absolute top-0 left-0 w-full h-[calc(100%-3rem)] z-10 {!hover
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
          on:pointerenter={() => active = true}
          on:pointerleave={() => active = false}
        />
      </div>

      <div
        class="absolute bottom-0 left-0 w-full bg-black z-0"
        style="height: calc({internalValue * 100}%{!hover
          ? ''
          : ' + ' + (1 - internalValue) * 3 + 'rem'});"
      />
    </div>
</div>

<style>
  .container {
    -webkit-tap-highlight-color: rgba(0,0,0,0);
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
    writing-mode: vertical-lr;
  }

  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 30px;
    height: 10px;
    background: transparent;
    cursor: ns-resize	;
    border-radius: 0;
  }

  .slider::-moz-range-thumb {
    width: 100%;
    height: 10px;
    background: transparent;
    cursor: ns-resize	;
    border-radius: 0;
  }
</style>