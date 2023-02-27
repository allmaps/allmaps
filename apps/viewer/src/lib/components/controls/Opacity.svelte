<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options.js'

  import dial from '$lib/shared/images/dial.svg'

  let container: HTMLElement

  const threshold = 30

  const minAngle = -140
  const maxAngle = 140

  let active = false
  let hasMoved = false

  let initialOpacity = 1
  renderOptions.subscribe(($renderOptions) => {
    if (!active) {
      initialOpacity = $renderOptions.opacity
    }
  })

  function handleOpacityMove(event: Event) {
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

      if (distance > threshold || hasMoved) {
        hasMoved = true

        // const max = startX - threshold * 2
        // const opacity = 1 - Math.min(diff / max, 1)

        $renderOptions.opacity = angleToOpacity(angle)
      }
    }
  }

  function handleMousedown(event: MouseEvent) {
    active = true
    $renderOptions.opacity = 0

    window.addEventListener('mousemove', handleOpacityMove)
    window.addEventListener('mouseup', () => {
      if (hasMoved) {
        initialOpacity = $renderOptions.opacity
      } else {
        $renderOptions.opacity = initialOpacity
      }

      window.removeEventListener('mousemove', handleOpacityMove)
      active = false
      hasMoved = false
    })

    event.preventDefault()
  }

  function angleToOpacity(angle: number): number {
    angle = Math.min(Math.max(angle, minAngle), maxAngle) - minAngle
    return angle / (maxAngle - minAngle)
  }

  function opacityToAngle(opacity: number): number {
    return opacity * (maxAngle - minAngle) + minAngle
  }

  function handleTouchstart(event: TouchEvent) {
    active = true
    $renderOptions.opacity = 0

    window.addEventListener('touchmove', handleOpacityMove)
    window.addEventListener('touchend', () => {
      if (hasMoved) {
        initialOpacity = $renderOptions.opacity
      } else {
        $renderOptions.opacity = initialOpacity
      }

      window.removeEventListener('touchmove', handleOpacityMove)
      active = false
      hasMoved = false
    })

    event.preventDefault()
  }
</script>

<div
  class="inline-flex items-center p-1 space-x-1 md:space-x-3 text-sm bg-white border border-gray-200 rounded-lg"
>
  <div class="flex flex-row items-center gap-2">
    <div bind:this={container} class="flex">
      <button
        title={`Opacity: ${Math.round($renderOptions.opacity * 100)}%`}
        class="bg-white w-7 h-7 text-gray-900 font-medium border-gray-200 rounded-full hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
        on:mousedown={handleMousedown}
        on:touchstart={handleTouchstart}
      >
        <img
          style:transform={`rotate(${opacityToAngle(
            $renderOptions.opacity
          )}deg)`}
          class="transition-transform ease-linear"
          class:duration-75={!hasMoved}
          class:duration-0={hasMoved}
          src={dial}
          alt={`Opacity: ${Math.round($renderOptions.opacity * 100)}%`}
        />
      </button>
    </div>
    <div class="text-xs">Opacity</div>
  </div>
</div>
