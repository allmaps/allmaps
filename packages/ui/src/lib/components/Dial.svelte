<script lang="ts">
  import { onMount } from 'svelte'

  import { Tooltip } from 'flowbite'
  import type { TooltipOptions, TooltipInterface } from 'flowbite'

  let tooltipTarget: HTMLElement
  let tooltipTrigger: HTMLElement
  let tooltip: TooltipInterface

  export let value: number
  export let keyCode: string
  export let label: string
  export let invert = false

  export let active = false
  export let disableTooltip = false

  // internalValue always has minValue 0 and maxValue 1
  let internalValue = invert ? 1 - value : value
  let maxValue = 1

  $: {
    value = invert ? 1 - internalValue : internalValue
  }

  export let toggleValue = maxValue

  let container: HTMLElement

  const distanceThreshold = 15

  const minAngle = -140
  const maxAngle = 140

  let hasMoved = false

  let initialValue = maxValue

  let threshold = 0.1

  $: {
    if (tooltip) {
      if (active && !disableTooltip) {
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

        internalValue = clamp(initialValue + diff / 100)

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

  function clamp(value: number): number {
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

    if (initialValue < threshold) {
      initialValue = maxValue
    }

    if (event.shiftKey) {
      internalValue = clamp(initialValue + toggleValue)
    } else {
      internalValue = clamp(initialValue - toggleValue)
    }

    window.addEventListener(moveEventType, handleMove)
    window.addEventListener(endEventType, () => {
      if (hasMoved) {
        initialValue = internalValue
      } else {
        internalValue = initialValue
      }

      window.removeEventListener(moveEventType, handleMove)
      active = false
      hasMoved = false
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
    if (tooltip && !disableTooltip) {
      tooltip.show()
    }
  }

  function handleMouseleave() {
    if (tooltip && !active) {
      tooltip.hide()
    }
  }

  // TODO: check if keyCode is defined
  function handleKeydown(event: KeyboardEvent) {
    if (event.code === keyCode && event.target === document.body) {
      active = true

      if (initialValue < threshold) {
        initialValue = maxValue
      }

      if (event.shiftKey) {
        internalValue = clamp(initialValue + toggleValue)
      } else {
        internalValue = clamp(initialValue - toggleValue)
      }
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === keyCode && event.target === document.body) {
      internalValue = initialValue
      active = false
    }
  }

  onMount(() => {
    const options: TooltipOptions = {
      triggerType: 'none'
    }

    tooltip = new Tooltip(tooltipTarget, tooltipTrigger, options)
  })
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div bind:this={container} class="flex">
  <div
    id="tooltip-animation"
    role="tooltip"
    bind:this={tooltipTarget}
    class="absolute z-10 invisible inline-block px-2 py-1 text-xs text-white transition-opacity duration-300 bg-gray-900 rounded-lg shadow-sm opacity-0 tooltip dark:bg-gray-700"
  >
    {label}:
    <span class="relative inline-block w-8 text-right"
      >{Math.round(value * 100)}%</span
    >
    <div class="tooltip-arrow" data-popper-arrow />
  </div>

  <button
    type="button"
    data-tooltip-target="tooltip-animation"
    bind:this={tooltipTrigger}
    class="select-none relative bg-white w-7 h-7 text-gray-900 font-medium border-gray-200 rounded-full hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 drop-shadow"
    on:mousedown={handleMousedown}
    on:touchstart={handleTouchstart}
    on:mouseenter={handleMouseenter}
    on:mouseleave={handleMouseleave}
  >
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
  </button>
</div>
