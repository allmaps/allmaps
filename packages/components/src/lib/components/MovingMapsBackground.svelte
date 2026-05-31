<script module lang="ts">
  import { geoPath, geoProjection } from 'd3-geo'
  import turfRewind from '@turf/rewind'

  import { ProjectedGcpTransformer } from '@allmaps/project'
  import { validateGeoreferencedMap } from '@allmaps/annotation'
  import { geometryToGeojsonGeometry } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { GeojsonPolygon } from '@allmaps/types'

  export type WarpedResourceMask = {
    id: string
    polygon: GeojsonPolygon
  }

  const cachedWarpedResourceMasks: Record<
    string,
    WarpedResourceMask[] | undefined
  > = {}
  const pendingWarpedResourceMasks: Record<
    string,
    Promise<WarpedResourceMask[]> | undefined
  > = {}

  const mercator = geoProjection((x: number, y: number) => [
    x,
    Math.log(Math.tan(Math.PI / 4 + y / 2))
  ])

  const path = geoPath().projection(mercator)

  function getCacheKey(mapsApiBaseUrl: string, count: number) {
    return `${mapsApiBaseUrl}:${count}`
  }

  function geometryToPath(
    polygon: GeojsonPolygon,
    width: number,
    height: number
  ) {
    mercator.scale(1).translate([0, 0])

    const bounds = path.bounds(polygon)
    const scale =
      1 /
      Math.max(
        (bounds[1][0] - bounds[0][0]) / width,
        (bounds[1][1] - bounds[0][1]) / height
      )

    const translate: [number, number] = [
      (width - scale * (bounds[1][0] + bounds[0][0])) / 2,
      (height - scale * (bounds[1][1] + bounds[0][1])) / 2
    ]

    mercator.scale(scale).translate(translate)

    const d = path(polygon)

    const containsNaN = d && d.indexOf('NaN') > -1

    if (!containsNaN) {
      return d
    }
  }

  function parseGeoreferencedMap(apiMap: unknown) {
    const mapOrMaps = validateGeoreferencedMap(apiMap)
    return Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
  }

  function getWarpedResourceMaskFromGeoreferencedMap(map: GeoreferencedMap) {
    // Polynomial is fast for many GCPs and accurate enough for this background.
    const projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(
      map,
      {
        transformationType: 'polynomial'
      }
    )

    const polygon = projectedTransformer.transformToGeo([map.resourceMask])
    const geojsonPolygon = geometryToGeojsonGeometry(polygon)

    // d3-geo expects the opposite winding order from the GeoJSON spec.
    turfRewind(geojsonPolygon, { mutate: true, reverse: true })

    return {
      id: map.id,
      polygon: geojsonPolygon
    }
  }

  function getWarpedResourceMask(apiMap: unknown) {
    const map = parseGeoreferencedMap(apiMap)
    return getWarpedResourceMaskFromGeoreferencedMap(map)
  }

  async function fetchWarpedResourceMasks(
    mapsApiBaseUrl: string,
    count: number
  ) {
    const response = await fetch(`${mapsApiBaseUrl}/maps?limit=${count}`)
    const apiMaps: unknown = await response.json()

    if (!Array.isArray(apiMaps)) {
      throw new Error('Invalid response')
    }

    return apiMaps.flatMap((apiMap) => {
      try {
        const { id, polygon } = getWarpedResourceMask(apiMap)

        if (id) {
          return { id, polygon }
        }
      } catch {
        return []
      }

      return []
    })
  }

  async function loadWarpedResourceMasks(
    mapsApiBaseUrl: string,
    count: number
  ) {
    const cacheKey = getCacheKey(mapsApiBaseUrl, count)
    const cached = cachedWarpedResourceMasks[cacheKey]

    if (cached) {
      return cached
    }

    const pending = pendingWarpedResourceMasks[cacheKey]

    if (pending) {
      return pending
    }

    const promise = fetchWarpedResourceMasks(mapsApiBaseUrl, count)
      .then((warpedResourceMasks) => {
        cachedWarpedResourceMasks[cacheKey] = warpedResourceMasks
        return warpedResourceMasks
      })
      .finally(() => {
        delete pendingWarpedResourceMasks[cacheKey]
      })

    pendingWarpedResourceMasks[cacheKey] = promise

    return promise
  }
</script>

<script lang="ts">
  import { onMount } from 'svelte'

  import {
    blue,
    purple,
    orange,
    red,
    pink,
    green,
    yellow
  } from '@allmaps/tailwind'

  type PolygonWithAnimation = {
    id: string
    path: Path2D
    href?: string
    x: number
    y: number
    vx: number
    vy: number
    rotation: number
    rotationSpeed: number
    scale: number
  }

  type Props = {
    mapsApiBaseUrl: string
    count?: number
    href?: (id: string) => string
    linkTitle?: string
  }

  let {
    mapsApiBaseUrl,
    count = 40,
    href,
    linkTitle = 'Open in Allmaps Viewer'
  }: Props = $props()

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

  const fillColors = [
    'fill-blue/10',
    'fill-purple/10',
    'fill-orange/10',
    'fill-red/10',
    'fill-pink/10',
    'fill-green/10',
    'fill-yellow/10'
  ]

  let viewportWidth = $state(0)
  let viewportHeight = $state(0)

  let maxSpeed = 1.5

  let warpedResourceMasksLoaded = $state(false)

  let animatedPolygons: PolygonWithAnimation[] = $state.raw([])
  let animationFrameId: number | undefined

  $effect(() => {
    if (
      canvas &&
      viewportWidth > 0 &&
      viewportHeight > 0 &&
      warpedResourceMasksLoaded &&
      animatedPolygons.length === 0
    ) {
      animatedPolygons = warpedResourceMasks.flatMap(({ id, polygon }) => {
        const path = geometryToPath(polygon, polygonWidth, polygonHeight)

        if (!path) {
          return []
        }

        return createAnimatedPolygon(id, path)
      })

      startAnimation()
    }
  })

  let warpedResourceMasks: WarpedResourceMask[] = $state([])

  function getRandomPositionJustOutsideViewport(
    viewportWidth: number,
    viewportHeight: number,
    polygonWidth: number,
    polygonHeight: number
  ): { x: number; y: number } {
    const side = Math.floor(Math.random() * 5)
    const px = polygonWidth * 2 + polygonWidth * 2 * Math.random()
    const py = polygonHeight * 2 + polygonHeight * 2 * Math.random()

    switch (side) {
      case 0:
        return {
          x: Math.random() * viewportWidth,
          y: -polygonHeight - py
        }
      case 1:
        return {
          x: viewportWidth + px,
          y: Math.random() * viewportHeight
        }
      case 2:
        return {
          x: Math.random() * viewportWidth,
          y: viewportHeight + py
        }
      case 3:
        return {
          x: -polygonWidth - px,
          y: Math.random() * viewportHeight
        }
      default:
        return {
          x: viewportWidth / 2,
          y: viewportHeight / 2
        }
    }
  }

  function createAnimatedPolygon(
    id: string,
    pathString: string
  ): PolygonWithAnimation {
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
      path: new Path2D(pathString),
      href: getHref?.(id),
      x,
      y,
      vx,
      vy,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 0.5,
      scale: (Math.random() - 0.5) * 0.2 + 1
    }
  }

  function drawPolygon(
    context: CanvasRenderingContext2D,
    polygon: PolygonWithAnimation,
    index: number
  ) {
    context.save()
    context.translate(polygon.x, polygon.y)
    context.rotate((polygon.rotation * Math.PI) / 180)
    context.scale(polygon.scale, polygon.scale)
    context.fillStyle = fillColors[index % fillColors.length]
    context.strokeStyle = strokeColors[index % strokeColors.length]
    context.lineWidth = 4
    context.fill(polygon.path)
    context.stroke(polygon.path)
    context.restore()
  }

  function startAnimation() {
    if (!canvas) {
      return
    }

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
    }

    const context = canvas.getContext('2d')

    if (!context) {
      return
    }

    const drawingContext = context

    function animate() {
      if (!canvas) {
        return
      }

      const devicePixelRatio = window.devicePixelRatio || 1
      const canvasWidth = Math.round(viewportWidth * devicePixelRatio)
      const canvasHeight = Math.round(viewportHeight * devicePixelRatio)

      if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
        canvas.width = canvasWidth
        canvas.height = canvasHeight
      }

      drawingContext.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0
      )
      drawingContext.clearRect(0, 0, viewportWidth, viewportHeight)

      for (const [index, polygon] of animatedPolygons.entries()) {
        let newX = polygon.x + polygon.vx
        let newY = polygon.y + polygon.vy
        let newVx = polygon.vx
        let newVy = polygon.vy

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

  onMount(() => {
    let cancelled = false

    loadWarpedResourceMasks(mapsApiBaseUrl, count)
      .then((loadedWarpedResourceMasks) => {
        if (!cancelled) {
          warpedResourceMasks = loadedWarpedResourceMasks
          warpedResourceMasksLoaded = true
        }
      })
      .catch((err) => {
        console.error(err)
      })

    return () => {
      cancelled = true

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
        {#if href}
          <!-- eslint-disable svelte/no-navigation-without-resolve -->
          <a
            target="_blank"
            class="pointer-events-auto"
            href={href(id)}
            title={linkTitle}
          >
            <path
              class={[
                strokeColors[index % strokeColors.length],
                fillColors[index % fillColors.length],
                'stroke-[4px]'
              ]}
              d={geometryToPath(polygon, polygonWidth, polygonHeight)}
            />
          </a>
          <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {:else}
          <path
            class={[
              strokeColors[index % strokeColors.length],
              fillColors[index % fillColors.length],
              'stroke-[4px]'
            ]}
            d={geometryToPath(polygon, polygonWidth, polygonHeight)}
          />
        {/if}
      </g>
    {/each}
  {/if}
</svg>
