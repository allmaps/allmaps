<script lang="ts">
  import { scale } from 'svelte/transition'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import { pointOnPolygon, lineBearing } from '$lib/shared/outside.js'

  import OutsideImage from '$lib/images/outside.svg'

  import type { Ring } from '@allmaps/types'

  const uiState = getUiState()

  let width = $state(0)
  let height = $state(0)

  const outsideImageSize = 50

  const padding = outsideImageSize / 2 + 10
  const elementGap = 8

  let polygon = $derived<Ring>([
    // Start at right side of logo in the top left corner:
    [padding + uiState.elementSizes.top.left[0], padding],

    // Go around the Info button:
    [width / 2 - uiState.elementSizes.top.center[0] / 2 - padding, padding],
    [
      width / 2 - uiState.elementSizes.top.center[0] / 2 - padding,
      uiState.elementSizes.top.center[1] + padding + elementGap
    ],
    [
      width / 2 + uiState.elementSizes.top.center[0] / 2 + padding,
      uiState.elementSizes.top.center[1] + padding + elementGap
    ],
    [width / 2 + uiState.elementSizes.top.center[0] / 2 + padding, padding],

    // To the top right side of the screen:
    [width - padding, padding],

    // Around the north arrow:
    [
      width - padding,
      height - uiState.elementSizes.bottom.right[1] - padding - elementGap
    ],
    [
      width - uiState.elementSizes.bottom.right[0] - padding - elementGap,
      height - uiState.elementSizes.bottom.right[1] - padding - elementGap
    ],
    [
      width - uiState.elementSizes.bottom.right[0] - padding - elementGap,
      height - padding
    ],

    // Around the middle button:
    [
      width / 2 + uiState.elementSizes.bottom.center[0] / 2 + padding,
      height - padding
    ],
    [
      width / 2 + uiState.elementSizes.bottom.center[0] / 2 + padding,
      height - uiState.elementSizes.bottom.center[1] - padding - elementGap
    ],
    [
      width / 2 - uiState.elementSizes.bottom.center[0] / 2 - padding,
      height - uiState.elementSizes.bottom.center[1] - padding - elementGap
    ],
    [
      width / 2 - uiState.elementSizes.bottom.center[0] / 2 - padding,
      height - padding
    ],

    // Around the More maps button:
    [
      uiState.elementSizes.bottom.left[0] + padding + elementGap,
      height - padding
    ],
    [
      uiState.elementSizes.bottom.left[0] + padding + elementGap,
      height - uiState.elementSizes.bottom.left[1] - padding - elementGap
    ],
    [
      padding,
      height - uiState.elementSizes.bottom.left[1] - padding - elementGap
    ],

    // And finally back to the left side of the screen, underneath the logo:
    [padding, uiState.elementSizes.top.left[1] + padding + elementGap],
    [
      padding + uiState.elementSizes.top.left[0],
      uiState.elementSizes.top.left[1] + padding + elementGap
    ]
  ])

  // If the ?from= query param is set, we use that as the starting point
  // Otherwise we use the center of the screen
  let fromScreenCoordinates = $derived.by(() => {
    if (uiState.fromScreenCoordinates) {
      return uiState.fromScreenCoordinates
    } else {
      return [width / 2, height / 2]
    }
  })

  let fromOutsideViewport = $derived.by(() => {
    if (fromScreenCoordinates) {
      return (
        fromScreenCoordinates[0] < 0 ||
        fromScreenCoordinates[1] < 0 ||
        fromScreenCoordinates[0] > width ||
        fromScreenCoordinates[1] > height
      )
    }
    return true
  })

  let positionOutsideViewport = $derived.by(() => {
    if (uiState.positionScreenCoordinates) {
      return (
        uiState.positionScreenCoordinates[0] < 0 ||
        uiState.positionScreenCoordinates[1] < 0 ||
        uiState.positionScreenCoordinates[0] > width ||
        uiState.positionScreenCoordinates[1] > height
      )
    }

    return true
  })

  let point = $derived.by(() => {
    if (fromScreenCoordinates && uiState.positionScreenCoordinates) {
      return pointOnPolygon(
        [fromScreenCoordinates[0], fromScreenCoordinates[1]],
        [
          uiState.positionScreenCoordinates[0],
          uiState.positionScreenCoordinates[1]
        ],
        polygon
      )
    }
  })

  let bearing = $derived.by(() => {
    if (fromScreenCoordinates && uiState.positionScreenCoordinates) {
      return lineBearing(
        [fromScreenCoordinates[0], fromScreenCoordinates[1]],
        [
          uiState.positionScreenCoordinates[0],
          uiState.positionScreenCoordinates[1]
        ]
      )
    }

    return 0
  })
</script>

<div class="w-full h-full -z-10">
  <svg
    bind:clientWidth={width}
    bind:clientHeight={height}
    class="absolute top-0 left-0 w-full h-full pointer-events-none drop-shadow-md"
    viewBox={`0 0 ${width} ${height}`}
  >
    {#if !fromOutsideViewport && positionOutsideViewport && point}
      <image
        transition:scale={{ duration: 300, delay: 100, start: 0 }}
        class="transform-border transition-all duration-[50ms] ease-linear"
        x={point[0]}
        y={point[1]}
        href={OutsideImage}
        transform-origin="center"
        style="transform: translate(-{outsideImageSize /
          2}px, -{outsideImageSize / 2}px) rotate({Math.round(bearing)}deg);"
        height={outsideImageSize}
        width={outsideImageSize}
      />
    {/if}
  </svg>
</div>
