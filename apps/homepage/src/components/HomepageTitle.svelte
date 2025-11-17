<script lang="ts">
  import { onMount } from 'svelte'
  import { scale, fade } from 'svelte/transition'
  import { expoOut } from 'svelte/easing'

  import { Logo } from '@allmaps/ui'
  import { parseAnnotation } from '@allmaps/annotation'
  import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
  import {
    computeBbox,
    bboxToRectangle,
    bboxToSize,
    sizesToScale
  } from '@allmaps/stdlib'

  import { getGeojsonPolygon, geometryToPath } from '../shared/geometry.js'

  import WarpedMap from './WarpedMap.svelte'

  import type { Bbox, Size } from '@allmaps/types'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  // TODO:
  // - use Allmaps basemap
  // - make escape work

  const HOVER_TIMEOUT = 1000

  let topElement: HTMLElement

  const maskCount = 5
  let finishedAnimationCount = $state(0)

  let scrolledDown = false
  let introFinished = $derived(finishedAnimationCount === maskCount)

  let interactive = $derived(introFinished && !scrolledDown)

  let mouseX = $state(0)
  let mouseY = $state(0)

  let width = $state(0)
  let height = $state(0)

  let scaleTo = 420
  let distance = 260 + scaleTo / 2

  const gradientMultiplier = 1 / 4

  let gradientX = $derived(
    width === 0
      ? '50%'
      : `${((mouseX / width) * 100 - 50) * gradientMultiplier + 50}%`
  )
  let gradientY = $derived(
    height === 0
      ? '50%'
      : `${((mouseY / height) * 100 - 50) * gradientMultiplier + 50}%`
  )

  let timeout: number = 0

  const annotationUrls = [
    // Ambon
    'https://annotations.allmaps.org/maps/8af5fb867819e6f3@f7b2168e245dc932',
    // Melbourne
    'https://annotations.allmaps.org/maps/752ac3651a9432ed@015c57ddf287e2b9',
    // Paramaribo
    'https://annotations.allmaps.org/maps/0431887a9d208417@f0b68ac47fe5a7b2',
    // Casablanca
    'https://annotations.allmaps.org/maps/6fa4aed2ebd5e14e@50a2151442d78e20',
    // Chicago
    'https://annotations.allmaps.org/maps/57298e3519d47c63@042a601dcde09d02',
    // Vancouver
    'https://annotations.allmaps.org/maps/db6569cd47f3a6c5@d20bdf65c01ac847',
    // Madison
    'https://annotations.allmaps.org/maps/303742196a799825@7341fb9b2c9799a0',
    // Toronto
    'https://annotations.allmaps.org/maps/60459eb8648e36ca@ffe65f7b101b7f6d',
    // Valetta
    'https://annotations.allmaps.org/maps/38ae25630336748e@a4fd6fad900c8b7d',
    // Edinburgh
    'https://annotations.allmaps.org/maps/efa06f142ae9e0b5@a33dde3c5d208f26',
    // Den Haag
    'https://annotations.allmaps.org/maps/6bfaa2dde9a941f2@cc6c19cb2433bfc4',
    // Świnoujście
    'https://annotations.allmaps.org/maps/f5c250b78d26a6f8@def696e05b836a48',
    // Hanoi
    'https://annotations.allmaps.org/maps/dbc3f1835cf237d4@60a70c763fdaa7c4',
    // Holyoke
    'https://annotations.allmaps.org/maps/4426ecd99c57de21@4f8f8e9423771a3b',
    // Coney Island
    'https://annotations.allmaps.org/maps/0c83208cc17694ae@e26881de958b291e',
    // Washington, D.C.
    'https://annotations.allmaps.org/maps/e5c32c229a53f00d@0ff31db3e73c9b8e',
    // Dakar
    'https://annotations.allmaps.org/maps/871fadc753e4e213@2d4fb18080130f19',
    // Tokyo
    'https://annotations.allmaps.org/maps/54569b87a374065f@eeaa6c1bc309bb20',
    // Djakarta
    'https://annotations.allmaps.org/maps/83ec5095adf295af@7dd02a6f3ae37da4',
    // Venice
    'https://annotations.allmaps.org/maps/9b4fe711438e9c2e@82448e356a4cbdd3',
    // Medina
    'https://annotations.allmaps.org/maps/31c1d537d0bd9ff2@055378572bd2e2cd',
    // Delft Library
    'https://annotations.allmaps.org/maps/50942a4e010841aa@1dc28c191077338b',
    // San Antonio
    'https://annotations.allmaps.org/maps/a05aca049adadc77@ef2ac6056432f676'
  ]

  const gradientFrom = '#25318f'
  const gradientTo = '#101656'

  let loading = $state(false)
  let showMap = $state<GeoreferencedMap>()
  let bounds = $state<Bbox>()
  let showBasemap = $state(false)
  let warpedMapReady = $state(false)

  let maps = $state<(GeoreferencedMap | undefined)[]>(
    Array(maskCount).fill(undefined)
  )
  let masks = $state<(string | undefined)[]>(Array(maskCount).fill(undefined))

  const maskColors = ['#63D8E6', '#FE5E60', '#ffc742', '#C552B5', '#64C18F']

  function startWarpedMap(event: MouseEvent, index: number) {
    if (!interactive) {
      return
    }

    loading = true

    timeout = setTimeout(() => {
      if (!maps[index]) {
        return
      }

      const pixelPath = event.target as SVGPathElement
      const pixelPathRect = pixelPath.getBoundingClientRect()

      const georeferencedMap = maps[index]

      const projectedTransformer =
        ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap)

      const projectedGeoPolygon = projectedTransformer.transformToGeo([
        georeferencedMap.resourceMask
      ])

      // 1. Use viewport and SVG path sizes to compute viewport's
      //    coordinates in spherical mercator
      // 2. Transform these viewport spherical mercator coordinates to
      //    resource coordinates using projectedTransformer
      // 3. Transform these resource coordinates to lat/lon using transformer

      const pixelScreenSize: Size = [width, height]
      const pixelPathRectSize: Size = [
        pixelPathRect.width,
        pixelPathRect.height
      ]
      const projectedGeoPolygonBbox = computeBbox(projectedGeoPolygon)
      const projectedGeoPolygonBboxSize: Size = bboxToSize(
        projectedGeoPolygonBbox
      )
      const projectedGeoToPixelScale = sizesToScale(
        projectedGeoPolygonBboxSize,
        pixelPathRectSize,
        'contain'
      )

      const projectedGeoScreenTopLeft = [
        projectedGeoPolygonBbox[0] - pixelPathRect.x * projectedGeoToPixelScale,
        projectedGeoPolygonBbox[1] +
          (pixelPathRect.height + pixelPathRect.y) * projectedGeoToPixelScale
      ]
      const projectedGeoScreenBbox: Bbox = [
        projectedGeoScreenTopLeft[0],
        projectedGeoScreenTopLeft[1],
        projectedGeoScreenTopLeft[0] +
          pixelScreenSize[0] * projectedGeoToPixelScale,
        projectedGeoScreenTopLeft[1] -
          pixelScreenSize[1] * projectedGeoToPixelScale
      ]

      const resourceScreenRectangle = projectedTransformer.transformToResource([
        bboxToRectangle(projectedGeoScreenBbox)
      ])
      const geoScreenRectangle = projectedTransformer.transformToGeo(
        resourceScreenRectangle,
        { projection: lonLatProjection }
      )
      const geoScreenRectangleBbox = computeBbox(geoScreenRectangle)

      bounds = geoScreenRectangleBbox

      showMap = maps[index]
    }, HOVER_TIMEOUT) as unknown as number
  }

  function shuffleArray(array: unknown[]) {
    for (let i = array.length - 1; i >= 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  }

  function handleIntersection(entries: IntersectionObserverEntry[]) {
    const intersectionRatio = Math.min(
      ...entries.map((entry) => entry.intersectionRatio)
    )

    scrolledDown = intersectionRatio !== 1
  }

  function handleMaskClick(event: MouseEvent, index: number) {
    if (!showMap) {
      startWarpedMap(event, index)
    } else {
      showBasemap = true
    }
  }

  function handleMaskMouseenter(event: MouseEvent, index: number) {
    startWarpedMap(event, index)
  }

  function handleMaskMouseleave() {
    clearTimeout(timeout)

    if (!showBasemap) {
      showMap = undefined
      warpedMapReady = false
    }
  }

  function handleMousemove(event: MouseEvent) {
    mouseX = event.clientX
    mouseY = event.clientY
  }

  function handleCloseWarpedMap() {
    showMap = undefined
    showBasemap = false
    warpedMapReady = false
  }

  function handleWarpedMapReady() {
    loading = false
    warpedMapReady = true
  }

  function pointToTranslate(point: number[], origin?: number[]) {
    return `translate(${point[0] + (origin ? origin[0] : 0)} ${point[1] + (origin ? origin[1] : 0)})`
  }

  function radialToCartasian(angle: number, distance: number) {
    const radians = (angle * Math.PI) / 180
    return [Math.cos(radians) * distance, Math.sin(radians) * distance]
  }

  onMount(() => {
    new IntersectionObserver(handleIntersection, {
      threshold: 1
    }).observe(topElement)

    shuffleArray(annotationUrls)

    for (const [index, annotationUrl] of annotationUrls
      .slice(0, maskCount)
      .entries()) {
      fetch(annotationUrl)
        .then((response) => response.json())
        .then((annotation) => {
          const annotationMaps = parseAnnotation(annotation)
          const map = annotationMaps[0]

          const polygon = getGeojsonPolygon(map)
          const path = geometryToPath(polygon, scaleTo)
          if (path) {
            maps[index] = map
            masks[index] = path
          } else {
            throw new Error("Can't create path")
          }
        })
        .catch(() => console.error('Error fetching and parsing', annotationUrl))
    }
  })
</script>

<div bind:this={topElement}></div>
<div
  id="title"
  bind:clientHeight={height}
  bind:clientWidth={width}
  onmousemove={handleMousemove}
  style="
    --gradient-x: {gradientX}; --gradient-y: {gradientY};
    --gradient-from: {gradientFrom}; --gradient-to: {gradientTo};"
  role="img"
  class="relative overflow-hidden flex justify-center items-center h-screen min-h-[600px] text-center"
>
  {#if width && height && masks.length}
    <svg
      class:loading
      class="background pointer-events-none w-full h-full absolute"
      id="masks"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      preserveAspectRatio="xMinYMin slice"
      x="0px"
      y="0px"
      viewBox="0 0 {width} {height}"
      ><g transform-origin="{width / 2} {height / 2}" class="scroll-group">
        {#each masks as mask, index}
          {#if mask}
            <g
              transform="translate(0 60)"
              transform-origin="50% 50%"
              transition:scale|global={{
                duration: Math.random() * 1000 + 1500,
                delay: Math.random() * 500,
                start: 3,
                easing: expoOut
              }}
              onintroend={() => finishedAnimationCount++}
            >
              <g
                transform={pointToTranslate(
                  radialToCartasian(
                    (360 / masks.length) * index + 120,
                    distance
                  ),
                  [width / 2, height / 2]
                )}
              >
                <path
                  role="presentation"
                  class="pointer-events-auto cursor-pointer [fill-opacity:0.5] transition-all duration-300"
                  onclick={(event) => handleMaskClick(event, index)}
                  onmouseenter={(event) => handleMaskMouseenter(event, index)}
                  onmouseleave={handleMaskMouseleave}
                  transform="translate(-{scaleTo / 2} -{scaleTo / 2})"
                  d={mask}
                  style:fill={maskColors[index]}
                  style:stroke={maskColors[index]}
                  paint-order="stroke"
                />
              </g>
            </g>
          {/if}
        {/each}
      </g>
    </svg>
  {/if}

  {#if showMap && bounds}
    <div
      class:pointer-events-none={!showBasemap}
      class="w-full h-full absolute transition-opacity duration-1000"
      class:opacity-0={!warpedMapReady}
      out:fade
    >
      <WarpedMap
        georeferencedMap={showMap}
        {bounds}
        {showBasemap}
        on:ready={handleWarpedMapReady}
      />
      {#if showBasemap}
        <div
          class="absolute bottom-0 p-2 w-full flex items-center justify-center"
        >
          <button
            transition:fade
            class="bg-pink rounded-full px-6 py-4 text-white font-bold cursor-pointer"
            onclick={handleCloseWarpedMap}>Back to homepage</button
          >
        </div>
      {/if}
    </div>
  {/if}

  <div class="flex flex-col items-center w-96 p-4 prose text-white">
    <div class="w-24">
      <Logo inverted />
    </div>
    <h1 class="text-white mt-0 mb-5 geograph">Allmaps</h1>
    <h2 class="text-white mt-0">
      Curating, georeferencing and exploring for IIIF maps
    </h2>
    <p>
      Millions of maps are available through IIIF, across libraries, archives
      and museums worldwide. Allmaps makes it easier and more inspiring to
      curate, georeference and explore collections of digitized maps.
    </p>
  </div>
</div>

<style scoped>
  #title {
    background-color: #101656;
    color: white;
    background-image: radial-gradient(
      circle at var(--gradient-x) var(--gradient-y),
      var(--gradient-from) 0%,
      var(--gradient-to) 100%
    );
  }

  #title svg .scroll-group {
    animation: scroll linear;
    animation-timeline: scroll(block root);
    animation-range: 0 100vh;
  }

  #masks path {
    stroke-width: 10;
  }

  #masks.loading path:hover {
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    from {
      fill-opacity: 0.5;
    }
    30% {
      fill-opacity: 0.3;
    }
    60% {
      fill-opacity: 0.7;
    }
    to {
      fill-opacity: 0.5;
    }
  }

  @keyframes scroll {
    0% {
      scale: 1;
    }

    100% {
      scale: 1.4;
    }
  }
</style>
