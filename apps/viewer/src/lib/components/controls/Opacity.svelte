<script lang="ts">
  import { renderOptions } from '$lib/shared/stores/render-options'

  const width = document.documentElement.clientWidth
  const startX = width / 2
  const threshold = 50

  let active = false
  let hasMoved = false

  let initialOpacity = 1
  renderOptions.subscribe(($renderOptions) => {
    if (!active) {
      initialOpacity = $renderOptions.opacity
    }
  })

  function handleOpacityMove(event: Event) {
    let screenX: number | undefined

    if (event instanceof TouchEvent) {
      screenX = event.touches[0].screenX
    } else if (event instanceof MouseEvent) {
      screenX = event.screenX
    }

    if (screenX) {
      const diff = Math.abs(startX - screenX) - threshold

      if (diff > 0) {
        hasMoved = true

        const max = startX - threshold * 2
        const opacity = 1 - Math.min(diff / max, 1)

        $renderOptions.opacity = opacity
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

<div>
  <button
    class="bg-white w-8 h-8  text-gray-900 font-medium border-gray-200 rounded-full hover:bg-gray-100 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
    on:mousedown={handleMousedown}
    on:touchstart={handleTouchstart}
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 32 32"
    >
      <path
        fill="#888888"
        d="M6 6h4v4H6zm4 4h4v4h-4zm4-4h4v4h-4zm8 0h4v4h-4zM6 14h4v4H6zm8 0h4v4h-4zm8 0h4v4h-4zM6 22h4v4H6zm8 0h4v4h-4zm8 0h4v4h-4zm-4-12h4v4h-4zm-8 8h4v4h-4zm8 0h4v4h-4z"
      />
    </svg>
  </button>
</div>
