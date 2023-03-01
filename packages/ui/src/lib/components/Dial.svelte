<script lang="ts">
  import dial from '$lib/shared/images/dial.svg'

  export let value: number
  export let keyCode: string
  export let invert = false

  let minValue = 0
  let maxValue = 1

  if (invert) {
    minValue = 1
    maxValue = 0
  }

  export let toggleValue = minValue

  let container: HTMLElement

  const distanceThreshold = 15

  const minAngle = -140
  const maxAngle = 140

  let active = false
  let hasMoved = false

  let initialValue = maxValue

  let threshold = 0.2
  if (invert) {
    threshold = maxValue - threshold
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
      const diffX = startX - screenX
      const diffY = startY - screenY

      const angle = (Math.atan2(diffX, diffY) * -180) / Math.PI
      const distance = Math.sqrt(diffX ** 2 + diffY ** 2)

      if (distance > distanceThreshold || hasMoved) {
        hasMoved = true
        value = angleToValue(angle)
      }
    }
  }

  function handleMousedown(event: MouseEvent) {
    active = true

    if (initialValue < threshold) {
      initialValue = maxValue
    }

    value = toggleValue

    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', () => {
      if (hasMoved) {
        initialValue = value
      } else {
        value = initialValue
      }

      window.removeEventListener('mousemove', handleMove)
      active = false
      hasMoved = false
    })

    event.preventDefault()
  }

  function angleToValue(angle: number): number {
    angle = Math.min(Math.max(angle, minAngle), maxAngle) - minAngle
    value = angle / (maxAngle - minAngle)

    if (invert) {
      value = minValue - value
    }

    return value
  }

  function valueToAngle(value: number): number {
    if (invert) {
      value = minValue - value
    }

    return value * (maxAngle - minAngle) + minAngle
  }

  function handleTouchstart(event: TouchEvent) {
    active = true

    if (initialValue < threshold) {
      initialValue = maxValue
    }

    value = minValue

    window.addEventListener('touchmove', handleMove)
    window.addEventListener('touchend', () => {
      if (hasMoved) {
        initialValue = value
      } else {
        value = initialValue
      }

      window.removeEventListener('touchmove', handleMove)
      active = false
      hasMoved = false
    })

    event.preventDefault()
  }

  // TODO: check if keyCode is defined
  function handleKeydown(event: KeyboardEvent) {
    if (event.code === keyCode && event.target === document.body) {
      active = true

      if (initialValue < threshold) {
        initialValue = maxValue
      }

      value = toggleValue
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === keyCode && event.target === document.body) {
      value = initialValue
      active = false
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div class="flex flex-row items-center gap-2">
  <div bind:this={container} class="flex">
    <button
      class="bg-white w-8 h-8 text-gray-900 font-medium border-gray-200 rounded-full hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
      on:mousedown={handleMousedown}
      on:touchstart={handleTouchstart}
    >
      <img
        src={dial}
        alt="Dial"
        style:transform={`rotate(${valueToAngle(value)}deg)`}
        class="transition-transform ease-linear"
        class:duration-75={!hasMoved}
        class:duration-0={hasMoved}
      />
    </button>
  </div>
  <div class="text-xs"><slot /></div>
</div>
