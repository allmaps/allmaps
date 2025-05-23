<script lang="ts">
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { pointOnPolygon, lineBearing } from '$lib/shared/outside.js'

  import OutsideImage from '$lib/images/outside.svg'

  import type { Ring } from '@allmaps/types'

  const uiState = getUiState()

  let width = $state(0)
  let height = $state(0)

  const padding = 30
  const controlsHeight = 75

  let headerSize = [167 + 8 + 8, 32 + 8 + 8]
  let polygon = $derived<Ring>([
    [padding, headerSize[1] + padding],
    [headerSize[0] + padding, headerSize[1] + padding],
    [headerSize[0] + padding, padding],
    [width - padding, padding],
    [width - padding, height - padding - controlsHeight],
    [padding, height - padding - controlsHeight]
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
      <!-- transition:scale={{ duration: 300, delay: 100, start: 0 }} -->
      <image
        class="transform-border"
        x={point[0]}
        y={point[1]}
        href={OutsideImage}
        transform-origin="center"
        style="transform: translate(-25px) rotate({Math.round(bearing)}deg);"
        height="50"
        width="50"
      />
    {/if}
  </svg>
</div>
