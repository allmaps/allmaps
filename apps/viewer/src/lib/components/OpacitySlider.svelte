<script lang="ts">
  import { pink } from '@allmaps/tailwind'

  type Props = {
    x?: number
    y?: number
    squareSize?: number
    color1?: string
    color2?: string
    solidColor?: string
  }

  let {
    x = $bindable(1),
    y = $bindable(1),
    squareSize = 28,
    color1 = '#ffffff',
    color2 = '#cccccc',
    solidColor = pink
  }: Props = $props()

  let gridElement: HTMLDivElement
  let isDragging = false

  function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  // Check if a point is inside the triangle
  // Triangle vertices: bottom-center (0.5, 0), top-left (0, 1), top-right (1, 1)
  function constrainToTriangle(
    rawX: number,
    rawY: number
  ): { x: number; y: number } {
    let constrainedX = rawX
    let constrainedY = rawY

    // If we're below the triangle (y < x range), constrain to triangle edges
    // Left edge: line from (0.5, 0) to (0, 1)
    // Equation: x = 0.5 - 0.5 * y
    const minX = Math.max(0, 0.5 - 0.5 * constrainedY)

    // Right edge: line from (0.5, 0) to (1, 1)
    // Equation: x = 0.5 + 0.5 * y
    const maxX = Math.min(1, 0.5 + 0.5 * constrainedY)

    constrainedX = clamp(constrainedX, minX, maxX)

    return { x: constrainedX, y: constrainedY }
  }

  function updatePosition(clientX: number, clientY: number) {
    if (!gridElement) return

    const rect = gridElement.getBoundingClientRect()
    const rawX = clamp((clientX - rect.left) / rect.width, 0, 1)
    const rawY = clamp(1 - (clientY - rect.top) / rect.height, 0, 1)

    const constrained = constrainToTriangle(rawX, rawY)
    x = constrained.x
    y = constrained.y
  }

  function handlePointerDown(event: PointerEvent) {
    isDragging = true
    gridElement.setPointerCapture(event.pointerId)
    updatePosition(event.clientX, event.clientY)
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isDragging) return
    updatePosition(event.clientX, event.clientY)
  }

  function handlePointerUp(event: PointerEvent) {
    isDragging = false
    gridElement.releasePointerCapture(event.pointerId)
  }

  function handleKeydown(event: KeyboardEvent) {
    const step = event.shiftKey ? 0.1 : 0.05
    let newX = x
    let newY = y

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        newX = x - step
        break
      case 'ArrowRight':
        event.preventDefault()
        newX = x + step
        break
      case 'ArrowUp':
        event.preventDefault()
        newY = y + step
        break
      case 'ArrowDown':
        event.preventDefault()
        newY = y - step
        break
      default:
        return
    }

    newX = clamp(newX, 0, 1)
    newY = clamp(newY, 0, 1)

    const constrained = constrainToTriangle(newX, newY)
    x = constrained.x
    y = constrained.y
  }
</script>

<div class="relative">
  <!-- Visual 2D Grid -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={gridElement}
    class="relative size-32 cursor-crosshair touch-none"
    role="application"
    tabindex="0"
    aria-label="2D slider grid"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onkeydown={handleKeydown}
  >
    <!-- Triangle background -->
    <div class="absolute inset-0 pointer-events-none">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        viewBox="0 0 231.65 203.42"
        class="drop-shadow-lg"
      >
        <defs>
          <!-- Filled circles pattern (hexagonal grid) -->
          <pattern
            id="checkerboard"
            x="0"
            y="0"
            width={squareSize * 2}
            height={squareSize * 1.732}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={squareSize}
              cy={squareSize * 0.866}
              r={squareSize * 0.5}
              fill={color2}
            />
            <circle cx={0} cy={0} r={squareSize * 0.5} fill={color2} />
            <circle
              cx={squareSize * 2}
              cy={0}
              r={squareSize * 0.5}
              fill={color2}
            />
            <circle
              cx={0}
              cy={squareSize * 1.732}
              r={squareSize * 0.5}
              fill={color2}
            />
            <circle
              cx={squareSize * 2}
              cy={squareSize * 1.732}
              r={squareSize * 0.5}
              fill={color2}
            />
          </pattern>

          <!-- Circle outlines pattern (hexagonal grid) -->
          <pattern
            id="gridlines"
            x="0"
            y="0"
            width={squareSize * 2}
            height={squareSize * 1.732}
            patternUnits="userSpaceOnUse"
          >
            <circle
              cx={squareSize}
              cy={squareSize * 0.866}
              r={squareSize * 0.5}
              fill="none"
              stroke={solidColor}
              stroke-width="3"
            />
            <circle
              cx={0}
              cy={0}
              r={squareSize * 0.5}
              fill="none"
              stroke={solidColor}
              stroke-width="3"
            />
            <circle
              cx={squareSize * 2}
              cy={0}
              r={squareSize * 0.5}
              fill="none"
              stroke={solidColor}
              stroke-width="3"
            />
            <circle
              cx={0}
              cy={squareSize * 1.732}
              r={squareSize * 0.5}
              fill="none"
              stroke={solidColor}
              stroke-width="3"
            />
            <circle
              cx={squareSize * 2}
              cy={squareSize * 1.732}
              r={squareSize * 0.5}
              fill="none"
              stroke={solidColor}
              stroke-width="3"
            />
          </pattern>

          <!-- Gradient masks for blending -->
          <!-- Mask for checkerboard: full at bottom, fades toward top edge -->
          <linearGradient
            id="bottomGradient"
            x1="50%"
            y1="100%"
            x2="50%"
            y2="0%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="65%" style="stop-color:white;stop-opacity:0" />
          </linearGradient>

          <!-- Mask for solid color: full at top-left, fades toward opposite edge (bottom to top-right) -->
          <linearGradient
            id="leftGradient"
            x1="0%"
            y1="0%"
            x2="87.5%"
            y2="68%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="65%" style="stop-color:white;stop-opacity:0" />
          </linearGradient>

          <!-- Mask for grid lines: full at top-right, fades toward opposite edge (bottom to top-left) -->
          <linearGradient
            id="rightGradient"
            x1="100%"
            y1="0%"
            x2="12.5%"
            y2="68%"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" style="stop-color:white;stop-opacity:1" />
            <stop offset="65%" style="stop-color:white;stop-opacity:0" />
          </linearGradient>

          <mask id="bottomMask">
            <rect width="231.65" height="203.42" fill="url(#bottomGradient)" />
          </mask>

          <mask id="leftMask">
            <rect width="231.65" height="203.42" fill="url(#leftGradient)" />
          </mask>

          <mask id="rightMask">
            <rect width="231.65" height="203.42" fill="url(#rightGradient)" />
          </mask>
        </defs>

        <!-- Base triangle shape -->
        <g>
          <!-- Base white background -->
          <path
            d="M221.06,0H10.58C2.45,0-2.64,8.81,1.43,15.85l105.24,182.28c4.07,7.04,14.24,7.05,18.3,0L230.21,15.85C234.28,8.81,229.2,0,221.06,0Z"
            fill="white"
          />

          <!-- Layer 1: Checkerboard at bottom -->
          <path
            d="M221.06,0H10.58C2.45,0-2.64,8.81,1.43,15.85l105.24,182.28c4.07,7.04,14.24,7.05,18.3,0L230.21,15.85C234.28,8.81,229.2,0,221.06,0Z"
            fill="url(#checkerboard)"
            mask="url(#bottomMask)"
          />

          <!-- Layer 2: Solid color at top-left -->
          <path
            d="M221.06,0H10.58C2.45,0-2.64,8.81,1.43,15.85l105.24,182.28c4.07,7.04,14.24,7.05,18.3,0L230.21,15.85C234.28,8.81,229.2,0,221.06,0Z"
            fill={solidColor}
            mask="url(#leftMask)"
          />

          <!-- Layer 3: Grid lines at top-right -->
          <path
            d="M221.06,0H10.58C2.45,0-2.64,8.81,1.43,15.85l105.24,182.28c4.07,7.04,14.24,7.05,18.3,0L230.21,15.85C234.28,8.81,229.2,0,221.06,0Z"
            fill="url(#gridlines)"
            mask="url(#rightMask)"
          />

          <!-- Triangle border -->
          <path
            d="M221.06,0H10.58C2.45,0-2.64,8.81,1.43,15.85l105.24,182.28c4.07,7.04,14.24,7.05,18.3,0L230.21,15.85C234.28,8.81,229.2,0,221.06,0Z"
            fill="none"
            stroke="#999999"
            stroke-width="1"
          />
        </g>
      </svg>
    </div>

    <!-- Draggable Circle -->
    <div
      class="absolute w-4 h-4 bg-pink-500 border-2 border-white rounded-full shadow-lg pointer-events-none"
      style:left={`${x * 100}%`}
      style:top={`${(1 - y) * 100}%`}
      style:transform="translate(-50%, -50%)"
    ></div>
  </div>

  <!-- Screen Reader Only Range Inputs -->
  <div class="sr-only">
    <label for="x-slider">X Position</label>
    <input
      id="x-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={x}
    />
  </div>

  <div class="sr-only">
    <label for="y-slider">Y Position</label>
    <input
      id="y-slider"
      type="range"
      min="0"
      max="1"
      step="0.01"
      bind:value={y}
    />
  </div>
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
