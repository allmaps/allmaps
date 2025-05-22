<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import { Thumbnail } from '@allmaps/ui'
  import { GcpTransformer } from '@allmaps/transform'
  import { pink } from '@allmaps/tailwind'

  import { getImageInfoState } from '$lib/state/image-info.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'

  import { toResourceCoordinates } from '$lib/shared/transform.js'
  import { getRelativeSizedRectangle, svgCoordinates } from '$lib/shared/svg.js'
  import { createRouteUrl } from '$lib/shared/router.js'
  import { getAllmapsId } from '$lib/shared/ids.js'
  import { parseLanguageString } from '$lib/shared/iiif.js'
  import { truncate } from '$lib/shared/strings.js'

  import Pin from '$lib/images/pin.svg?raw'
  import PinShadow from '$lib/images/pin-shadow.svg?raw'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { GeojsonLineString, Size } from '@allmaps/types'

  type Props = {
    mapId: string
    map: GeoreferencedMap
    geojsonRoute?: GeojsonLineString
  }

  let { mapId, map, geojsonRoute }: Props = $props()

  let label = $derived(map.resource.partOf?.[0].label)
  let label2 = $derived(map.resource.partOf?.[0].partOf?.[0].label)

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
    if (geojsonRoute && resourceSize && svgSize) {
      const polyline = transformer.transformGeojsonToSvg(geojsonRoute)
      if (polyline.type === 'polyline') {
        return polyline.coordinates.map((point) =>
          svgCoordinates(resourceSize, svgSize, point)
        )
      }
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

  onMount(() => {
    $effect(() => {
      imageInfoState.fetchImageInfo(map.resource.id)
    })
  })
</script>

<svelte:body bind:clientWidth={bodyClientWidth} />

{#if fetchedImageInfo && fetchedImageInfo.state === 'success'}
  <li class="bg-white/40 p-2 rounded-md">
    <a
      bind:clientWidth={width}
      class="aspect-square inline-block w-full h-full relative"
      href={createRouteUrl(page, allmapsId)}
    >
      <Thumbnail
        imageInfo={fetchedImageInfo.imageInfo}
        mode="contain"
        width={width * devicePixelRatio}
        height={width * devicePixelRatio}
      />
      {#if svgSize && svgPositionCoordinates}
        <div
          class="group absolute top-0 w-full h-full flex items-center justify-center"
        >
          <svg
            width="{svgSize[0]}%"
            height="{svgSize[1]}%"
            viewBox="0 0 {svgSize[0]} {svgSize[1]}"
          >
            <g
              class="opacity-90 delay-300 transition-opacity group-hover:opacity-0"
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
                  stroke={pink}
                  stroke-width="0.6"
                />
              {/if}

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
      <div class="text-center text-blue-900 text-xs">
        {label ? truncate(parseLanguageString(label, 'en')) : ``}
        {label ? truncate(parseLanguageString(label2, 'en')) : ``}
      </div>
    </a>
  </li>
{/if}
