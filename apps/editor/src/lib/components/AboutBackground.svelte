<script lang="ts">
  import { onMount } from 'svelte'

  import turfRewind from '@turf/rewind'

  import { geometryToPath } from '$lib/shared/svg.js'
  import { getViewerUrl } from '$lib/shared/urls.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getVarsState } from '$lib/state/vars.svelte.js'

  import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
  import { validateGeoreferencedMap } from '@allmaps/annotation'
  import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { GeojsonPolygon } from '@allmaps/types'

  import type { Env } from '$lib/types/env.js'

  const uiState = getUiState()
  const varsState = getVarsState<Env>()

  const viewerBaseUrl = varsState.get('PUBLIC_ALLMAPS_VIEWER_URL')
  const annotationsApiBaseUrl = varsState.get(
    'PUBLIC_ALLMAPS_ANNOTATIONS_API_URL'
  )

  const count = 40
  const polygonWidth = 80
  const polygonHeight = 80

  const strokeColors = [
    'stroke-blue',
    'stroke-purple',
    'stroke-orange',
    'stroke-red',
    'stroke-pink',
    'stroke-green',
    'stroke-yellow'
  ]

  // TODO: export from @allmaps/ui
  const fillColors = [
    'fill-blue/10',
    'fill-purple/10',
    'fill-orange/10',
    'fill-red/10',
    'fill-pink/10',
    'fill-green/10',
    'fill-yellow/10'
  ]

  type PolygonWithAnimation = {
    id: string
    polygon: GeojsonPolygon
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
    scale: number
  }

  let viewportWidth = $state(0)
  let viewportHeight = $state(0)

  let maxSpeed = 1.5

  let warpedResourceMasksLoaded = $state(false)

  let animatedPolygons: PolygonWithAnimation[] = $state([])
  let animationFrameId: number | undefined

  $effect(() => {
    if (
      viewportWidth > 0 &&
      viewportHeight > 0 &&
      warpedResourceMasksLoaded &&
      animatedPolygons.length === 0
    ) {
      animatedPolygons = uiState.warpedResourceMasks.map(({ id, polygon }) => {
        const { x, y } = getRandomPositionJustOutsideViewport(
          viewportWidth,
          viewportHeight,
          polygonWidth,
          polygonHeight
        )

        const vx = maxSpeed * (Math.random() - 0.5)
        const vy = maxSpeed * (Math.random() - 0.5)

        return {
          id,
          polygon,
          x,
          y,
          vx,
          vy,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 0.5,
          scale: (Math.random() - 0.5) * 0.2 + 1
        }
      })

      startAnimation()
    }
  })

  function getRandomPositionJustOutsideViewport(
    viewportWidth: number,
    viewportHeight: number,
    polygonWidth: number,
    polygonHeight: number
  ): { x: number; y: number } {
    // Pick a random side, or start in the center
    const side = Math.floor(Math.random() * 5)
    const px = polygonWidth * 2 + polygonWidth * 2 * Math.random()
    const py = polygonHeight * 2 + polygonHeight * 2 * Math.random()
    switch (side) {
      case 0: // top
        return {
          x: Math.random() * viewportWidth,
          y: -polygonHeight - py
        }
      case 1: // right
        return {
          x: viewportWidth + px,
          y: Math.random() * viewportHeight
        }
      case 2: // bottom
        return {
          x: Math.random() * viewportWidth,
          y: viewportHeight + py
        }
      case 3: // left
        return {
          x: -polygonWidth - px,
          y: Math.random() * viewportHeight
        }
      default: // center
        return {
          x: viewportWidth / 2,
          y: viewportHeight / 2
        }
    }
  }

  function startAnimation() {
    function animate() {
      animatedPolygons = animatedPolygons.map((polygon) => {
        let newX = polygon.x + polygon.vx
        let newY = polygon.y + polygon.vy
        let newVx = polygon.vx
        let newVy = polygon.vy

        // Bounce off edges
        if (newX < -polygonWidth) {
          newVx = Math.abs(polygon.vx)
          newX = polygon.x + newVx
        } else if (newX > viewportWidth + polygonWidth) {
          newVx = -Math.abs(polygon.vx)
          newX = polygon.x + newVx
        }

        if (newY < -polygonHeight) {
          newVy = Math.abs(polygon.vy)
          newY = polygon.y + newVy
        } else if (newY > viewportHeight + polygonHeight) {
          newVy = -Math.abs(polygon.vy)
          newY = polygon.y + newVy
        }

        return {
          ...polygon,
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: polygon.rotation + polygon.rotationSpeed
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()
  }

  function getWarpedResourceMask(apiMap: unknown) {
    const map = parseGeoreferencedMap(apiMap)
    return getWarpedResourceMaskFromGeoreferencedMap(map)
  }

  export function parseGeoreferencedMap(apiMap: unknown) {
    try {
      const mapOrMaps = validateGeoreferencedMap(apiMap)
      return Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    } catch {
      throw new Error('Error parsing map')
    }
  }

  export function getWarpedResourceMaskFromGeoreferencedMap(
    map: GeoreferencedMap
  ) {
    // Using polynomial transformation, not map transformation type,
    // since faster when many gcps and accurate enough
    const projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(
      map,
      {
        transformationType: 'polynomial',
        projection: lonLatProjection
      }
    )

    const polygon = projectedTransformer.transformToGeo([map.resourceMask])
    const geojsonPolygon = geometryToGeojsonGeometry(polygon)

    // d3-geo requires the opposite polygon winding order of
    // the GoeJSON spec: https://github.com/d3/d3-geo
    turfRewind(geojsonPolygon, { mutate: true, reverse: true })

    return {
      id: map.id,
      polygon: geojsonPolygon
    }
  }

  async function fetchMaps() {
    const mapsUrl = `https://api.allmaps.org/maps?limit=${count}`

    const response = await fetch(mapsUrl)
    const apiMaps = await response.json()

    if (!Array.isArray(apiMaps)) {
      throw new Error('Invalid response')
    }

    uiState.warpedResourceMasks = apiMaps.flatMap((apiMap) => {
      try {
        const { id, polygon } = getWarpedResourceMask(apiMap)
        if (id) {
          return { id, polygon }
        } else {
          return []
        }
      } catch {
        return []
      }
    })

    warpedResourceMasksLoaded = true
  }

  onMount(() => {
    if (uiState.warpedResourceMasks.length === 0) {
      try {
        fetchMaps()
      } catch (err) {
        console.error(err)
      }
    } else {
      warpedResourceMasksLoaded = true
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  })
</script>

<svg
  bind:clientWidth={viewportWidth}
  bind:clientHeight={viewportHeight}
  viewBox="0 0 {viewportWidth} {viewportHeight}"
  class="pointer-events-none h-full w-full"
>
  {#if warpedResourceMasksLoaded}
    {#each animatedPolygons as { id, polygon, x, y, rotation, scale }, index (index)}
      <g transform="translate({x}, {y}) rotate({rotation}) scale({scale})">
        <a
          target="_blank"
          class="pointer-events-auto"
          href={getViewerUrl(viewerBaseUrl, annotationsApiBaseUrl, id, true)}
          title="Open in Allmaps Viewer"
        >
          <path
            class={[
              strokeColors[index % strokeColors.length],
              fillColors[index % fillColors.length],
              'stroke-[4px]'
            ]}
            d={geometryToPath(polygon, polygonWidth, polygonHeight)}
          /></a
        >
      </g>
    {/each}
  {/if}
</svg>
