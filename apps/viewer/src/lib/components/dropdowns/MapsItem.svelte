<script lang="ts">
  import { onMount } from 'svelte'
  import { writable } from 'svelte/store'

  import {
    setCustomResourceMask,
    resetCustomResourceMask
  } from '$lib/shared/stores/maps.js'
  import {
    selectMap,
    deselectMap,
    firstSelectedMapId
  } from '$lib/shared/stores/selected.js'
  import { showMap, hideMap } from '$lib/shared/stores/visible.js'
  import {
    // mapWarpedMapSource,
    mapWarpedMapLayer
  } from '$lib/shared/stores/openlayers.js'
  // import { setActiveMapId } from '$lib/shared/stores/active.js'
  import { imageInformations } from '$lib/shared/stores/openlayers.js'
  import { setRenderOptionsForMap } from '$lib/shared/stores/render-options.js'
  import { getHue, fromHue } from '$lib/shared/color.js'

  import { fetchImageInfo, getFullResourceMask } from '@allmaps/stdlib'
  import {
    Thumbnail,
    Dial,
    // BringMapsToFront,
    // BringMapsForward,
    // SendMapsBackward,
    // SendMapsToBack,
    Opacity,
    Crop
  } from '@allmaps/ui'

  import type { ViewerMap } from '$lib/shared/types.js'

  export let viewerMap: ViewerMap

  let container: HTMLElement

  let imageInfo: unknown | undefined

  const selected = writable(viewerMap.state.selected)
  const visible = writable(viewerMap.state.visible)
  const useMask = writable(viewerMap.state.customResourceMask ? false : true)

  // TODO: create function in stores/opacity.ts that creates opacity
  // for map opacity
  const opacity = writable(viewerMap.opacity)

  const colorize = writable(viewerMap.renderOptions.colorize.enabled)

  const colorizeColor = viewerMap.renderOptions.colorize.color
  let hueInitialized = false
  const hue = colorizeColor
    ? writable(getHue(colorizeColor) / 360)
    : writable(0)

  const mapId = viewerMap.mapId
  const imageUri = viewerMap.map.resource.id
  // const warpedMap = mapWarpedMapSource.getWarpedMap(mapId)

  const checkboxId = `dropdown-maps-${mapId}`

  const imageWidth = viewerMap.map.resource.width
  const imageHeight = viewerMap.map.resource.height

  $: {
    $hue
    if (hueInitialized) {
      $colorize = true
    }

    hueInitialized = true
  }

  $: {
    setRenderOptionsForMap(mapId, {
      colorize: {
        enabled: $colorize,
        color: fromHue($hue * 360)
      }
    })
  }

  // TODO: the fullResourceMask is available directly in WarpedMap class!
  // This also means this function can be removed from stdlib.
  const fullResourceMask = getFullResourceMask(imageWidth, imageHeight)

  selected.subscribe(($selected) => {
    if ($selected) {
      selectMap(mapId)
    } else {
      deselectMap(mapId)
    }
  })

  visible.subscribe(($visible) => {
    if ($visible) {
      showMap(mapId)
    } else {
      hideMap(mapId)
    }
  })

  useMask.subscribe(($useMask) => {
    if ($useMask) {
      resetCustomResourceMask(mapId)
    } else {
      setCustomResourceMask(mapId, fullResourceMask)
    }
  })

  opacity.subscribe(($opacity) => {
    mapWarpedMapLayer?.setMapOpacity(mapId, $opacity)
  })

  function resourceMaskToPoints(
    resourceMask: [number, number][],
    viewBox: [number, number]
  ): string {
    const maxViewBoxDimension = Math.max(viewBox[0], viewBox[1])
    const maxImageDimension = Math.max(imageWidth, imageHeight)

    const scale = maxViewBoxDimension / maxImageDimension
    const translate = [
      imageWidth < imageHeight ? ((imageHeight - imageWidth) / 2) * scale : 0,
      imageWidth < imageHeight ? 0 : ((imageWidth - imageHeight) / 2) * scale
    ]

    const transformPoint = (point: [number, number]) => [
      point[0] * scale + translate[0],
      point[1] * scale + translate[1]
    ]

    return resourceMask
      .map((point) => transformPoint(point).join(','))
      .join(' ')
  }

  // function handleShowOnMap() {
  //   setActiveMapId(viewerMap.mapId, true)
  //   $view = 'map'
  // }

  // function handleShowImage() {
  //   setActiveMapId(viewerMap.mapId, true)
  //   $view = 'image'
  // }

  // function handleBringMapsToFront() {
  //   mapWarpedMapSource.bringMapsToFront([mapId])
  // }

  // function handleBringMapsForward() {
  //   mapWarpedMapSource.bringMapsForward([mapId])
  // }

  // function handleSendMapsBackward() {
  //   mapWarpedMapSource.sendMapsBackward([mapId])
  // }

  // function handleSendMapsToBack() {
  //   mapWarpedMapSource.sendMapsToBack([mapId])
  // }

  onMount(async () => {
    if ($firstSelectedMapId === mapId) {
      container.scrollIntoView()
    }

    // TODO: move to function
    if (imageInformations.has(imageUri)) {
      imageInfo = imageInformations.get(imageUri)
    } else {
      imageInfo = await fetchImageInfo(imageUri, { cache: 'force-cache' })
      imageInformations.set(imageUri, imageInfo)
    }
  })
</script>

<!-- <div
  bind:this={container}
  class="relative flex w-full flex-row gap-4 py-5 pl-4 before:absolute before:top-0 before:left-24 before:h-full before:border before:-translate-x-1/2 before:border-slate-200 {isLastInList &&
    'before:h-2/4'}"
> -->
<div class="flex w-full" bind:this={container}>
  <input
    type="checkbox"
    id={checkboxId}
    bind:checked={$selected}
    class="hidden peer"
  />
  <label
    for={checkboxId}
    class="relative inline-block w-full p-2 text-gray-600 border-2 border-gray-200 rounded cursor-pointer peer-checked:border-[#FF56BA] select-none z-10"
  >
    <div
      class="relative inline-flex items-center justify-between w-full h-full transition-opacity"
      class:opacity-50={!$visible}
    >
      <div class="object-fill w-full h-full">
        {#if viewerMap && imageInfo !== undefined}
          <Thumbnail {imageInfo} width={250} height={250} mode="contain" />
        {/if}
        <svg class="absolute w-full h-full inset-0" viewBox="0 0 100 100">
          <polygon
            points={resourceMaskToPoints(
              $useMask ? viewerMap.map.resourceMask : fullResourceMask,
              [100, 100]
            )}
            class="fill-none stroke-2"
            style={`stroke: blue;`}
          />
        </svg>
      </div>
    </div>

    <div
      class="flex flex-col gap-3 justify-between w-full absolute bottom-0 left-0 p-2 backdrop-blur-sm bg-white/50 border-t-2 border-t-gray-200"
    >
      <div>
        <div class="flex flex-row items-center w-full">
          <div class="flex flex-row grow gap-1 items-center">
            <!-- <div class="text-sm font-medium text-gray-900">
              Map {viewerMap.index + 1}
            </div> -->
          </div>

          <div class="inline-flex flex-row gap-1 sm:gap-2 justify-self-end">
            <!-- <div>
              <label
                class="inline-flex p-0.5 sm:p-1 items-center justify-center rounded-full border-2 select-none cursor-pointer w-6 h-6 sm:w-8 sm:h-8 bg-gray-100"
                class:border-pink-500={$selected && $view === 'image'}
                class:border-gray-500={!$selected || $view === 'list'}
                class:bg-pink-100={$selected && $view === 'image'}
                class:text-pink-500={$selected && $view === 'image'}
              >
                <input
                  type="checkbox"
                  id="image"
                  checked={$selected && $view === 'image'}
                  on:click={() => {
                    $selected = true
                    $view = $view === 'image' ? 'list' : 'image'
                  }}
                  class="sr-only peer"
                />
                <IconPhoto class="w-4 h-4 sm:w-5 sm:h-5" />
              </label>
            </div> -->

            <div>
              <label
                class="inline-flex p-0.5 sm:p-1 items-center justify-center rounded-full border-2 select-none cursor-pointer w-6 h-6 sm:w-8 sm:h-8 bg-gray-100"
                class:border-pink-500={!$visible}
                class:border-gray-500={$visible}
                class:bg-pink-100={!$visible}
                class:text-pink-500={!$visible}
              >
                <input
                  type="checkbox"
                  id="opacity"
                  bind:checked={$visible}
                  class="sr-only peer"
                />
                <Opacity closed={!$visible} class="w-4 h-4 sm:w-5 sm:h-5" />
              </label>
            </div>

            <div>
              <label
                class="inline-flex p-0.5 sm:p-1 items-center justify-center rounded-full border-2 select-none cursor-pointer w-6 h-6 sm:w-8 sm:h-8 bg-gray-100"
                class:border-pink-500={!$useMask}
                class:border-gray-500={$useMask}
                class:bg-pink-100={!$useMask}
                class:text-pink-500={!$useMask}
              >
                <input
                  type="checkbox"
                  id="crop"
                  bind:checked={$useMask}
                  class="sr-only peer"
                />
                <Crop class="w-4 h-4 sm:w-5 sm:h-5" />
              </label>
            </div>

            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div
              class="rounded-full p-0.5 sm:p-1 inline-flex items-center border-2 w-6 h-6 sm:w-8 sm:h-8 bg-gray-100"
              class:border-gray-600={$colorize}
              on:click={() => {
                $colorize = !$colorize
              }}
            >
              <Dial
                bind:value={$hue}
                label="Colorize"
                toggle={false}
                clamp={false}
                showDial={false}
                distanceValueRatio={1 / 250}
                enableTooltip={false}
              >
                <div
                  class="w-full h-full rounded-full"
                  style={`background: hsl(${$hue * 360}, 100%, 50%);`}
                />
              </Dial>
            </div>
          </div>
        </div>
      </div>
    </div></label
  >
</div>

<!-- <div class="flex flex-row justify-between items-center">
    
    </div> -->

<!--
    <div
      class="text-sm grid gap-2 grid-cols-[auto_1fr] grid-rows-[auto_auto] w-full"
    >
      <div class="py-1">Tile URL</div>
      <Copy
        string={`https://allmaps.xyz/maps/${mapId.split('/').at(-1)}/{z}/{x}/{y}.png`}
        compact={true}
      />

      <div class="py-1">Annotation JSON</div>
      <div class="flex flex-col items-end gap-2">
        <Copy
          string={JSON.stringify(viewerMap.annotation, null, 2)}
          compact={true}
        />
      </div>
       <div class="py-1">Export</div>
      <div class="flex flex-row gap-2">
        <a class="underline" target="_blank" rel="noreferrer" href={mapId}
          >show JSON</a
        >

        {#if warpedMap?.geoMask}
          <a
            class="underline"
            target="_blank"
            rel="noreferrer"
            href="http://geojson.io/#data=data:application/json,{encodeURIComponent(
              JSON.stringify(warpedMap.geoMask)
            )}">geojson.io</a
          >
        {/if}

        <a
          class="underline"
          target="_blank"
          rel="noreferrer"
          href="https://editor.allmaps.org/#/collection?url={imageUri}/info.json"
          >Allmaps Editor</a
        >
      </div> 
    </div>
  </div>-->

<!-- <div>
    <div>
      <button
        type="button"
        title="Show on map"
        on:click={handleShowOnMap}
        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        >Map</button
      >
      <button
        type="button"
        title="Show image"
        on:click={handleShowImage}
        class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2"
        >Image</button
      >
    </div>
  </div> -->
