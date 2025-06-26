<script lang="ts">
  import { onMount } from 'svelte'
  import { page, navigating } from '$app/state'

  import { Thumbnail } from '@allmaps/ui'
  import { GcpTransformer } from '@allmaps/transform'
  import { pink, red } from '@allmaps/tailwind'

  import { getImageInfoState } from '$lib/state/image-info.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'

  import { toResourceCoordinates } from '$lib/shared/transform.js'
  import { getRelativeSizedRectangle, svgCoordinates } from '$lib/shared/svg.js'
  import { createRouteUrl } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'
  import { getMapLabels, formatLabels } from '$lib/shared/metadata.js'

  import Pin from '$lib/images/pin.svg?raw'
  import PinShadow from '$lib/images/pin-shadow.svg?raw'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Size } from '@allmaps/types'

  import type { GeojsonRoute } from '$lib/shared/types.js'

  type Props = {
    mapId: string
    map: GeoreferencedMap
    geojsonRoute?: GeojsonRoute
  }

  let { mapId, map, geojsonRoute }: Props = $props()

  let width = $state<number>(320)

  let bodyClientWidth = $state<number>(0)

  let pinRadius = $derived(bodyClientWidth < 500 ? 4 : 2)

  let pinDirection = Math.random() > 0.5 ? 1 : -1
  let pinRotation = (Math.random() * 10 + 10) * pinDirection

  let resourceSize = $derived<Size | undefined>(
    map.resource.width && map.resource.height
      ? [map.resource.width, map.resource.height]
      : undefined
  )

  let svgSize = $derived.by(() => {
    if (resourceSize) {
      return getRelativeSizedRectangle(resourceSize, 100)
    }
  })

  const imageInfoState = getImageInfoState()
  const sensorsState = getSensorsState()

  let fetchedImageInfo = $derived(imageInfoState.get(map.resource.id))
  let allmapsId = $derived(getAllmapsId(mapId))

  const transformer = new GcpTransformer(map.gcps, map.transformation?.type)
  let resourcePositionCoordinates = $derived(
    sensorsState.position
      ? toResourceCoordinates(transformer, sensorsState.position)
      : undefined
  )

  let resourceRouteCoordinates = $derived.by(() => {
    if (geojsonRoute && geojsonRoute.route && resourceSize && svgSize) {
      const resourceLineString = transformer.transformToResource(
        geojsonRoute.route.coordinates
      )

      return resourceLineString.map((point) =>
        svgCoordinates(resourceSize, svgSize, point)
      )
    }
  })

  let polylinePoints = $derived(
    resourceRouteCoordinates &&
      resourceRouteCoordinates.map((point) => point.join(',')).join(' ')
  )

  let svgPositionCoordinates = $derived.by(() => {
    if (resourceSize && svgSize && resourcePositionCoordinates) {
      return svgCoordinates(resourceSize, svgSize, resourcePositionCoordinates)
    }
  })

  let pinOriginPosition = $derived.by(() => {
    if (svgSize && svgPositionCoordinates) {
      if (svgSize[0] > svgSize[1]) {
        return [
          svgPositionCoordinates[0],
          (svgPositionCoordinates[1] / svgSize[1]) * svgSize[0]
        ]
      } else {
        return [
          (svgPositionCoordinates[0] / svgSize[0]) * svgSize[1],
          svgPositionCoordinates[1]
        ]
      }
    }
  })

  let labels = $derived(map ? getMapLabels(map) : [])
  let title = $derived(formatLabels(labels))

  let navigatingToThisMap = $derived(
    `maps/${navigating.to?.params?.mapId}` === allmapsId
  )

  onMount(() => {
    $effect(() => {
      imageInfoState.fetchImageInfo(map.resource.id)
    })
  })
</script>

<svelte:body bind:clientWidth={bodyClientWidth} />

{#if fetchedImageInfo && fetchedImageInfo.state === 'success'}
  <li class="flex flex-col gap-3 bg-white/50 p-2 rounded-lg">
    <a
      bind:clientWidth={width}
      class="aspect-square inline-block w-full relative"
      href={createRouteUrl(page, allmapsId)}
    >
      <div class={{ 'animate-pulse': navigatingToThisMap }}>
        <Thumbnail
          imageInfo={fetchedImageInfo.imageInfo}
          mode="contain"
          width={width * devicePixelRatio}
          height={width * devicePixelRatio}
        />
      </div>
      {#if svgSize && svgPositionCoordinates}
        <div
          class="group absolute top-0 w-full h-full flex items-center justify-center"
        >
          <svg
            width="{svgSize[0]}%"
            height="{svgSize[1]}%"
            viewBox="0 0 {svgSize[0]} {svgSize[1]}"
          >
            {#if resourceRouteCoordinates}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="white"
                stroke-width="1.0"
              />
              <polyline
                points={polylinePoints}
                fill="none"
                stroke={red}
                stroke-width="0.6"
              />
            {/if}
            <g
              class="opacity-90 delay-300 transition-opacity group-hover:opacity-0"
            >
              <circle
                cx={svgPositionCoordinates[0]}
                cy={svgPositionCoordinates[1]}
                r={pinRadius}
                fill="white"
              />
              <circle
                cx={svgPositionCoordinates[0]}
                cy={svgPositionCoordinates[1]}
                r={pinRadius * 0.5}
                fill={pink}
              />
            </g>
          </svg>
          {#if pinOriginPosition}
            <div
              style:width="{svgSize[0]}%"
              style:height="{svgSize[1]}%"
              class="absolute"
            >
              <div
                class="absolute w-8 -left-4 transition-all duration-200 delay-200 ease-out
                  opacity-0 group-hover:opacity-100 -translate-y-16 group-hover:translate-y-0
                  rotate-(--pin-rotation)
                  drop-shadow-lg"
                style:rotate="{pinRotation}deg"
                style:transform-origin="1rem 3.4rem"
                style:left="calc({pinOriginPosition[0]}% - 1rem)"
                style:top="calc({pinOriginPosition[1]}% - 3.4rem)"
              >
                {@html Pin}
              </div>
              <div
                class="absolute w-12 -left-4 transition-all duration-200 delay-200 ease-out
                opacity-0 group-hover:opacity-100 translate-x-16 group-hover:translate-x-0"
                style:left="calc({pinOriginPosition[0]}%)"
                style:top="calc({pinOriginPosition[1]}% - 0.4rem)"
              >
                {@html PinShadow}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </a>
    <div class="text-center text-blue-600 leading-snug text-xs">
      {title}
    </div>
  </li>
{/if}
