<script lang="ts">
  import { onMount } from 'svelte'
  import { scale, fade } from 'svelte/transition'
  import { expoOut } from 'svelte/easing'

  import { Logo } from '@allmaps/ui'
  import { validateGeoreferencedMap } from '@allmaps/annotation'
  import { ProjectedGcpTransformer } from '@allmaps/project'
  import {
    computeBbox,
    bboxToRectangle,
    bboxToSize,
    sizesToScale
  } from '@allmaps/stdlib'

  import bundledMasks from '$lib/hero/homepage-masks.json'

  import type { Bbox, Size } from '@allmaps/types'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  // TODO:
  // - use Allmaps basemap

  const HOVER_TIMEOUT = 1000

  let topElement: HTMLElement

  const maskCount = 5
  let finishedAnimationCount = $state(0)

  let scrolledDown = $state(false)
  let reducedMotion = $state(false)
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

  function startWarpedMap(pixelPath: SVGPathElement, index: number) {
    if (!interactive || !maps[index]) {
      return
    }

    loading = true

    const pixelPathRect = pixelPath.getBoundingClientRect()

    const georeferencedMap = maps[index]

    const projectedTransformer =
      ProjectedGcpTransformer.fromGeoreferencedMap(georeferencedMap)

    const projectedGeoPolygon = projectedTransformer.transformToProjectedGeo([
      georeferencedMap.resourceMask
    ])

    // 1. Use viewport and SVG path sizes to compute viewport's
    //    coordinates in spherical mercator
    // 2. Transform these viewport spherical mercator coordinates to
    //    resource coordinates using projectedTransformer
    // 3. Transform these resource coordinates to lat/lon using transformer

    const pixelScreenSize: Size = [width, height]
    const pixelPathRectSize: Size = [pixelPathRect.width, pixelPathRect.height]
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
      resourceScreenRectangle
    )
    const geoScreenRectangleBbox = computeBbox(geoScreenRectangle)

    bounds = geoScreenRectangleBbox

    showMap = maps[index]
  }

  function shuffleArray<T>(array: T[]) {
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
    if (scrolledDown && !showBasemap) handleMaskMouseleave()
  }

  function handleMaskClick(event: MouseEvent, index: number) {
    if (!interactive) return
    clearTimeout(timeout)
    if (!showMap) {
      startWarpedMap(event.currentTarget as SVGPathElement, index)
    }
    if (showMap) showBasemap = true
  }

  function handleMaskMouseenter(event: MouseEvent, index: number) {
    if (!interactive || showBasemap) return
    clearTimeout(timeout)
    const pixelPath = event.currentTarget as SVGPathElement
    loading = true
    timeout = window.setTimeout(
      () => startWarpedMap(pixelPath, index),
      HOVER_TIMEOUT
    )
  }

  function handleMaskMouseleave() {
    clearTimeout(timeout)

    if (!showBasemap) {
      loading = false
      showMap = undefined
      warpedMapReady = false
    }
  }

  function handleMousemove(event: MouseEvent) {
    mouseX = event.clientX
    mouseY = event.clientY
  }

  function handleCloseWarpedMap() {
    clearTimeout(timeout)
    loading = false
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

  $effect(() => {
    if (!showBasemap) return

    const root = document.documentElement
    const body = document.body
    const rootOverflow = root.style.overflow
    const bodyOverflow = body.style.overflow
    root.style.overflow = 'hidden'
    body.style.overflow = 'hidden'

    return () => {
      root.style.overflow = rootOverflow
      body.style.overflow = bodyOverflow
    }
  })

  onMount(() => {
    const observer = new IntersectionObserver(handleIntersection, {
      threshold: 1
    })
    observer.observe(topElement)
    reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    // The pinned maps and their projected outlines are bundled together, so
    // displaying masks never waits for annotation requests or transformations.
    const homepageMasks = [...bundledMasks]
    shuffleArray(homepageMasks)
    for (const [index, { map, path }] of homepageMasks
      .slice(0, maskCount)
      .entries()) {
      const validatedMap = validateGeoreferencedMap(map)
      maps[index] = Array.isArray(validatedMap) ? validatedMap[0] : validatedMap
      masks[index] = path
    }

    return () => {
      observer.disconnect()
      clearTimeout(timeout)
    }
  })
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && showBasemap) handleCloseWarpedMap()
  }}
/>

<div bind:this={topElement}></div>
<div
  id="title"
  bind:clientHeight={height}
  bind:clientWidth={width}
  onmousemove={handleMousemove}
  style="
    --gradient-x: {gradientX}; --gradient-y: {gradientY};
    --gradient-from: {gradientFrom}; --gradient-to: {gradientTo};"
  role="region"
  aria-label="Allmaps introduction"
  class="relative overflow-hidden flex justify-center items-center h-screen min-h-150 text-center text-white bg-[#101656] bg-[radial-gradient(circle_at_var(--gradient-x)_var(--gradient-y),var(--gradient-from)_0%,var(--gradient-to)_100%)]"
>
  {#if width && height && masks.length}
    <div class="scroll-group pointer-events-none absolute inset-0">
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
      >
        {#each masks as mask, index (index)}
          {#if mask}
            <g
              transform="translate(0 60)"
              transform-origin="50% 50%"
              in:scale|global={{
                duration: reducedMotion ? 0 : 600,
                delay: reducedMotion ? 0 : index * 40,
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
                  class="pointer-events-auto cursor-pointer [fill-opacity:0.5] stroke-10 transition-all duration-300"
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
      </svg>
    </div>
  {/if}

  {#if showMap && bounds}
    <div
      class:pointer-events-none={!showBasemap}
      class={[
        showBasemap ? 'fixed inset-0 z-30' : 'absolute inset-0',
        'transition-opacity duration-300'
      ]}
      class:opacity-0={!warpedMapReady && !showBasemap}
      out:fade
    >
      {#await import('./WarpedMap.svelte') then { default: WarpedMap }}
        <WarpedMap
          georeferencedMap={showMap}
          {bounds}
          {showBasemap}
          on:ready={handleWarpedMapReady}
        />
      {/await}
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

  <div
    class="pointer-events-none relative flex w-96 max-w-full flex-col items-center px-4 py-8 text-white"
    class:invisible={showBasemap}
    aria-hidden={showBasemap}
  >
    <div class="w-24">
      <Logo inverted />
    </div>
    <h1 class="mt-6 mb-8 text-4xl font-bold leading-tight">Allmaps</h1>
    <h2 class="m-0 text-2xl font-bold leading-snug">
      Curating, georeferencing and exploring for IIIF maps
    </h2>
    <p class="mt-6 mb-0 text-base leading-relaxed">
      Millions of maps are available through IIIF, across libraries, archives
      and museums worldwide. Allmaps makes it easier and more inspiring to
      curate, georeference and explore collections of digitized maps.
    </p>
  </div>
</div>

<style>
  #title .scroll-group {
    transform-origin: center;
    animation: scroll linear;
    animation-timeline: scroll(block root);
    animation-range: 0 100vh;
  }

  @media (prefers-reduced-motion: reduce) {
    #title .scroll-group {
      animation: none;
    }
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
      transform: scale(1);
    }

    100% {
      transform: scale(1.4);
    }
  }
</style>
