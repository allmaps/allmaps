<script lang="ts">
  import { writable } from 'svelte/store'

  import { selectMap, deselectMap } from '$lib/shared/stores/selected.js'
  import { showMap, hideMap } from '$lib/shared/stores/visible.js'
  import { view } from '$lib/shared/stores/view.js'
  import { warpedMapSource } from '$lib/shared/stores/openlayers.js'

  import Thumbnail from '$lib/components/Thumbnail.svelte'

  import { Copy } from '@allmaps/ui'

  import type { ViewerMap } from '$lib/shared/types.js'

  export let viewerMap: ViewerMap

  const selected = writable(viewerMap.state.selected)
  const visible = writable(viewerMap.state.visible)

  let showCompleteImage = false

  const mapId = viewerMap.mapId
  const imageUri = viewerMap.map.image.uri
  const checkboxId = `dropdown-maps-${mapId}`

  const imageWidth = viewerMap.map.image.width
  const imageHeight = viewerMap.map.image.height

  const fullPixelMask: [number, number][] = [
    [0, 0],
    [imageWidth, 0],
    [imageWidth, imageHeight],
    [0, imageHeight]
  ]

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

  function pixelMaskToPoints(
    pixelMask: [number, number][],
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

    return pixelMask.map((point) => transformPoint(point).join(',')).join(' ')
  }

  function handleMapClick() {
    console.log('open map', viewerMap)
  }

  function handleImageClick() {
    $view = 'image'
  }

  function handleBringToFrontClick() {
    $warpedMapSource.bringToFront([mapId])
  }
  function handleBringForwardClick() {
    $warpedMapSource.bringForward([mapId])
  }
  function handleSendBackwardClick() {
    $warpedMapSource.sendBackward([mapId])
  }
  function handleSendToBackClick() {
    $warpedMapSource.sendToBack([mapId])
  }
</script>

<div class="flex flex-row gap-4 w-full">
  <div>
    <input
      type="checkbox"
      id={checkboxId}
      bind:checked={$selected}
      class="hidden peer"
    />
    <label
      for={checkboxId}
      class="relative inline-block w-48 h-48 p-2 text-gray-500 bg-white border-2 border-gray-200 rounded-lg cursor-pointer dark:hover:text-gray-300 dark:border-gray-700 peer-checked:border-blue-600 hover:text-gray-600 dark:peer-checked:text-gray-300 peer-checked:text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:bg-gray-800 dark:hover:bg-gray-700 select-none"
    >
      <div
        class="relative inline-flex items-center justify-between w-full h-full transition-opacity"
        class:opacity-50={!$visible}
      >
        <div class="absolute block object-fill">
          {#if viewerMap}
            <Thumbnail
              imageUri={viewerMap.map.image.uri}
              width={192}
              height={192}
            />
          {/if}
          <svg class="absolute w-full h-full inset-0" viewBox="0 0 100 100">
            <polygon
              points={pixelMaskToPoints(
                showCompleteImage ? fullPixelMask : viewerMap.map.pixelMask,
                [100, 100]
              )}
              class="fill-none stroke-2"
              style={`stroke: #FF56BA;`}
            />
          </svg>
        </div>
      </div>
    </label>
  </div>

  <div class="flex flex-col justify-between w-full">
    <div class="flex flex-row justify-between w-full">
      <div>
        <div>
          <span>Map {viewerMap.index + 1}</span>
          <code class="font-mono">{mapId}</code>
        </div>

        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" bind:checked={$visible} class="sr-only peer" />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          />
          <span
            class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
            >Visible</span
          >
        </label>

        <label class="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            bind:checked={showCompleteImage}
            class="sr-only peer"
          />
          <div
            class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
          />
          <span
            class="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300"
            >Don't use mask</span
          >
        </label>
      </div>
      <div>
        <div>
          <button
            type="button"
            on:click={handleMapClick}
            class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            >Show on map</button
          >
          <button
            type="button"
            on:click={handleImageClick}
            class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-5 py-2.5 mr-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700"
            >Show image</button
          >
        </div>
      </div>
    </div>

    <div class="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        on:click={handleBringToFrontClick}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
      >
        <!-- <svg
          aria-hidden="true"
          class="w-4 h-4 mr-2 fill-current"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"
            clip-rule="evenodd"
          /></svg
        > -->
        Bring to Front
      </button>
      <button
        type="button"
        on:click={handleBringForwardClick}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
      >
        <!-- <svg
          aria-hidden="true"
          class="w-4 h-4 mr-2 fill-current"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"
          /></svg
        > -->
        Bring Forward
      </button>
      <button
        type="button"
        on:click={handleSendBackwardClick}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border-t border-b border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
      >
        <!-- <svg
          aria-hidden="true"
          class="w-4 h-4 mr-2 fill-current"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"
          /></svg
        > -->
        Send Backward
      </button>
      <button
        type="button"
        on:click={handleSendToBackClick}
        class="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-200 rounded-r-md hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-2 focus:ring-blue-700 focus:text-blue-700 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-blue-500 dark:focus:text-white"
      >
        <!-- <svg
          aria-hidden="true"
          class="w-4 h-4 mr-2 fill-current"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
          ><path
            fill-rule="evenodd"
            d="M2 9.5A3.5 3.5 0 005.5 13H9v2.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 15.586V13h2.5a4.5 4.5 0 10-.616-8.958 4.002 4.002 0 10-7.753 1.977A3.5 3.5 0 002 9.5zm9 3.5H9V8a1 1 0 012 0v5z"
            clip-rule="evenodd"
          /></svg
        > -->
        Send to Back
      </button>
    </div>

    <!--
    TODO:
      - toggle
      - opacity
      - always show complete image
      - remove background
      - open annotation in new tab
   -->

    <Copy string={JSON.stringify(viewerMap.annotation, null, 2)} />

    <div>
      <a
        class="underline"
        target="_blank"
        rel="noreferrer"
        href="https://editor.allmaps.org/#/collection?url={imageUri}/info.json"
        >Open in Allmaps Editor</a
      >
    </div>
    <div>XYZ tile URL:</div>

    <Copy string={`https://allmaps.xyz/maps/${mapId}/{z}/{x}/{y}.png`} />
  </div>
</div>
