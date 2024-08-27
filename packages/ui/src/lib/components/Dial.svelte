<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'

  import { Tooltip } from 'flowbite'
  import type { TooltipOptions, TooltipInterface } from 'flowbite'

  let tooltipTarget: HTMLElement
  let tooltipTrigger: HTMLElement
  let tooltip: TooltipInterface

  export let value: number
  export let keyCode: string | undefined = undefined
  export let label: string

  export let distanceValueRatio = 1 / 100
  export let step = 0.05

  export let invert = false
  export let clamp = true
  export let toggle = true
  export let showDial = true

  export let active = false
  export let enableTooltip = true

  // internalValue always has minValue 0 and maxValue 1
  let internalValue = invert ? 1 - value : value
  let maxValue = 1

  $: {
    value = invert ? 1 - internalValue : internalValue
  }

  export let toggleValue = maxValue

  const dispatch = createEventDispatcher()

  let container: HTMLElement

  const distanceThreshold = 15

  const minAngle = -140
  const maxAngle = 140

  let hasMoved = false

  let initialValue = maxValue

  let threshold = 0.1
  let lastInteractionTime = 0

  $: {
    if (tooltip) {
      if (active && enableTooltip) {
        tooltip.show()
      } else {
        tooltip.hide()
      }
    }
  }

  function handleMove(event: Event) {
    const rect = container.getBoundingClientRect()

    const startX = rect.left + rect.width / 2
    const startY = rect.top + rect.height / 2

    let screenX: number | undefined
    let screenY: number | undefined

    if (window.TouchEvent && event instanceof TouchEvent) {
      screenX = event.touches[0].clientX
      screenY = event.touches[0].clientY
    } else if (event instanceof MouseEvent) {
      screenX = event.clientX
      screenY = event.clientY
    }

    if (startX && startY && screenX && screenY) {
      const diffX = -(startX - screenX)
      const diffY = startY - screenY

      // const angle = (Math.atan2(diffX, diffY) * -180) / Math.PI
      const distance = Math.sqrt(diffX ** 2 + diffY ** 2)

      if (distance > distanceThreshold || hasMoved) {
        hasMoved = true

        let diff
        // if (diffX < 0) {
        //   diff = diffX + distanceThreshold
        // } else {
        //   diff = diffX - distanceThreshold
        // }

        diff = diffX

        let newValue = initialValue + diff * distanceValueRatio

        if (clamp) {
          internalValue = clampValue(newValue)
        } else {
          internalValue = (newValue + 1) % 1
        }

        // value = angleToValue(angle)
      }
    }
  }

  // function angleToValue(angle: number): number {
  //   angle = Math.min(Math.max(angle, minAngle), maxAngle) - minAngle
  //   value = angle / (maxAngle - minAngle)

  //   if (invert) {
  //     value = minValue - value
  //   }

  //   return value
  // }

  function valueToAngle(value: number): number {
    return value * (maxAngle - minAngle) + minAngle
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

  function startActive(
    event: MouseEvent | TouchEvent,
    moveEventType: string,
    endEventType: string
  ) {
    active = true
    lastInteractionTime = Date.now()

    if (toggle) {
      if (initialValue < threshold) {
        initialValue = maxValue
      }

      if (event.shiftKey) {
        internalValue = clampValue(initialValue + toggleValue)
      } else {
        internalValue = clampValue(initialValue - toggleValue)
      }
    }

    window.addEventListener(moveEventType, handleMove)
    window.addEventListener(endEventType, () => {
      // this is not clean, it will be triggered a lot of times
      if (hasMoved) {
        initialValue = internalValue
      } else {
        internalValue = initialValue
      }

      window.removeEventListener(moveEventType, handleMove)
      active = false
      hasMoved = false
      if (Date.now() - lastInteractionTime < 300) {
        dispatch('click', { value: internalValue })
      }
    })

    event.preventDefault()
    event.stopPropagation()
  }

  function handleMousedown(event: MouseEvent) {
    startActive(event, 'mousemove', 'mouseup')
  }

  function handleTouchstart(event: TouchEvent) {
    startActive(event, 'touchmove', 'touchend')
  }

  function handleMouseenter() {
    if (tooltip && enableTooltip) {
      tooltip.show()
    }
  }

  function handleMouseleave() {
    if (tooltip && !active) {
      tooltip.hide()
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (keyCode && event.code === keyCode && event.target === document.body) {
      active = true

      if (initialValue < threshold) {
        initialValue = maxValue
      }

      if (event.shiftKey) {
        internalValue = clampValue(initialValue + toggleValue)
      } else {
        internalValue = clampValue(initialValue - toggleValue)
      }
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (keyCode && event.code === keyCode && event.target === document.body) {
      internalValue = initialValue
      active = false
    }
  }

  onMount(() => {
    if (enableTooltip) {
      const options: TooltipOptions = {
        triggerType: 'none'
      }

      tooltip = new Tooltip(tooltipTarget, tooltipTrigger, options)
    }
  })
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div bind:this={container} class="flex w-full h-full">
  <div
    id="tooltip-animation"
    role="tooltip"
    bind:this={tooltipTarget}
    class="absolute z-10 invisible inline-block px-2 py-1 text-xs text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip"
  >
    {label}:
    <span class="relative inline-block w-8 text-right"
      >{Math.round(value * 100)}%</span
    >
    <div class="tooltip-arrow" data-popper-arrow />
  </div>

  <input
    type="range"
    class="sr-only peer"
    bind:value={internalValue}
    min="0"
    max="1"
    {step}
  />

  <div
    data-tooltip-target="tooltip-animation"
    role="slider"
    aria-valuenow={value}
    tabindex="0"
    bind:this={tooltipTrigger}
    class="select-none relative bg-white w-full h-full peer-focus:outline-none peer-focus:ring peer-focus:ring-pink-500 cursor-pointer text-gray-900 font-medium border-gray-200 rounded-full hover:bg-gray-100 peer-focus:z-10 drop-shadow"
    on:mousedown={handleMousedown}
    on:touchstart|passive={handleTouchstart}
    on:mouseenter={handleMouseenter}
    on:mouseleave={handleMouseleave}
  >
    {#if showDial}
      <svg
        aria-hidden="true"
        style:transform={`rotate(${valueToAngle(internalValue)}deg)`}
        class="absolute inset-0 transition-transform ease-linear w-full h-full"
        class:duration-75={!hasMoved}
        class:duration-0={hasMoved}
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="black"
          stroke-width="7"
        />
        <line x1="50" y1="40" x2="50" y2="5" stroke="black" stroke-width="7" />
      </svg>
    {/if}
    <slot />
  </div>
</div>
