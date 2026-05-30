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

  type PolygonWithAnimation = {
    id: string
    path: string
    href?: string
    fromX: number
    fromY: number
    toX: number
    toY: number
    fromRotation: number
    toRotation: number
    scale: number
    duration: number
    delay: number
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

  let warpedResourceMasksLoaded = $state(false)

  let animatedPolygons: PolygonWithAnimation[] = $state.raw([])

  $effect(() => {
    if (
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

  function getRandomPositionInsideViewport(
    viewportWidth: number,
    viewportHeight: number,
    polygonWidth: number,
    polygonHeight: number
  ): { x: number; y: number } {
    return {
      x: Math.random() * Math.max(0, viewportWidth - polygonWidth),
      y: Math.random() * Math.max(0, viewportHeight - polygonHeight)
    }
  }

  function createAnimatedPolygon(
    id: string,
    path: string
  ): PolygonWithAnimation {
    const { x, y } = getRandomPositionJustOutsideViewport(
      viewportWidth,
      viewportHeight,
      polygonWidth,
      polygonHeight
    )
    const { x: toX, y: toY } = getRandomPositionInsideViewport(
      viewportWidth,
      viewportHeight,
      polygonWidth,
      polygonHeight
    )

    const fromRotation = Math.random() * 360

    return {
      id,
      path,
      href: href?.(id),
      fromX: x,
      fromY: y,
      toX,
      toY,
      fromRotation,
      toRotation: fromRotation + 180 + Math.random() * 360,
      scale: (Math.random() - 0.5) * 0.2 + 1,
      duration: 24 + Math.random() * 24,
      delay: 0
    }
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
    }
  })
</script>

<svg
  bind:clientWidth={viewportWidth}
  bind:clientHeight={viewportHeight}
  viewBox="0 0 {viewportWidth} {viewportHeight}"
  class="pointer-events-none h-full w-full overflow-hidden"
>
  {#if warpedResourceMasksLoaded}
    {#each animatedPolygons as polygon, index (polygon.id)}
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="{polygon.fromX} {polygon.fromY}; {polygon.toX} {polygon.toY}; {polygon.fromX} {polygon.fromY}"
          dur="{polygon.duration}s"
          begin="{polygon.delay}s"
          repeatCount="indefinite"
        />
        <g>
          <animateTransform
            attributeName="transform"
            type="rotate"
            values="{polygon.fromRotation} {polygonWidth / 2} {polygonHeight /
              2}; {polygon.toRotation} {polygonWidth / 2} {polygonHeight /
              2}; {polygon.fromRotation} {polygonWidth / 2} {polygonHeight / 2}"
            dur="{polygon.duration}s"
            begin="{polygon.delay}s"
            repeatCount="indefinite"
          />
          <g
            transform="translate({polygonWidth / 2} {polygonHeight /
              2}) scale({polygon.scale}) translate({-polygonWidth /
              2} {-polygonHeight / 2})"
          >
            {#if polygon.href}
              <!-- eslint-disable svelte/no-navigation-without-resolve -->
              <a
                target="_blank"
                class="pointer-events-auto"
                href={polygon.href}
                title={linkTitle}
              >
                <path
                  class={[
                    strokeColors[index % strokeColors.length],
                    fillColors[index % fillColors.length],
                    'stroke-[4px]'
                  ]}
                  d={polygon.path}
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
                d={polygon.path}
              />
            {/if}
          </g>
        </g>
      </g>
    {/each}
  {/if}
</svg>
