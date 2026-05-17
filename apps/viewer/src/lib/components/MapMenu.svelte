<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import {
    BringMapsToFront,
    BringMapsForward,
    SendMapsBackward,
    SendMapsToBack
  } from '@allmaps/ui'
  import {
    Eye,
    EyeSlash,
    ArrowSquareOut,
    Copy,
    CaretRight,
    MapPin,
    Globe
  } from 'phosphor-svelte'
  import { generateId } from '@allmaps/id'

  import { getSourceState } from '$lib/state/source.svelte.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMapLayer } from '@allmaps/maplibre'

  type Props = {
    open: boolean
    x: number
    y: number
    latLon: [number, number]
    mapId: string
    georeferencedMap: GeoreferencedMap
    warpedMapLayer: WarpedMapLayer
  }

  let {
    open = $bindable(),
    x,
    y,
    latLon,
    mapId,
    georeferencedMap,
    warpedMapLayer
  }: Props = $props()

  const sourceState = getSourceState()

  let anchorElement: HTMLDivElement | undefined

  let isHidden = $state(false)

  // Get image URI for URL generation
  const imageUri = $derived(georeferencedMap.resource.id)

  async function handleHideToggle() {
    isHidden = !isHidden
    warpedMapLayer.setMapOptions(mapId, {
      opacity: isHidden ? 0 : 1
    })
  }

  function handleBringToFront() {
    warpedMapLayer.bringMapsToFront([mapId])
  }

  function handleBringForward() {
    warpedMapLayer.bringMapsForward([mapId])
  }

  function handleSendBackward() {
    warpedMapLayer.sendMapsBackward([mapId])
  }

  function handleSendToBack() {
    warpedMapLayer.sendMapsToBack([mapId])
  }

  async function handleOpenInEditor() {
    if (!imageUri) {
      return
    }

    const editorUrl = `https://editor.allmaps.org/#/mask?url=${encodeURIComponent(imageUri)}`
    window.open(editorUrl, '_blank')
  }

  async function handleCopyAnnotationUrl() {
    try {
      const imageId = await generateId(imageUri)
      const annotationUrl = `https://annotations.allmaps.org/images/${imageId}`
      await navigator.clipboard.writeText(annotationUrl)
    } catch (error) {
      console.error('Failed to copy annotation URL:', error)
    }
  }

  async function handleCopyImageUrl() {
    try {
      await navigator.clipboard.writeText(imageUri)
    } catch (error) {
      console.error('Failed to copy image URL:', error)
    }
  }

  async function handleCopyMapUrl() {
    try {
      const currentUrl = new URL(window.location.href)
      currentUrl.searchParams.set('map', mapId)
      await navigator.clipboard.writeText(currentUrl.toString())
    } catch (error) {
      console.error('Failed to copy map URL:', error)
    }
  }

  function openOpenStreetMap() {
    const [lat, lon] = latLon
    window.open(`https://www.openstreetmap.org/#map=17/${lat}/${lon}`, '_blank')
  }

  function openGoogleMaps() {
    const [lat, lon] = latLon
    window.open(`https://www.google.com/maps/@${lat},${lon},17z`, '_blank')
  }

  function openGoogleStreetView() {
    const [lat, lon] = latLon
    window.open(
      `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`,
      '_blank'
    )
  }

  function openBingMaps() {
    const [lat, lon] = latLon
    window.open(`https://www.bing.com/maps?cp=${lat}~${lon}&lvl=17`, '_blank')
  }

  function openMapillary() {
    const [lat, lon] = latLon
    window.open(
      `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`,
      '_blank'
    )
  }
</script>

<!-- Invisible anchor element that moves with x/y coordinates -->
<div
  bind:this={anchorElement}
  class="fixed pointer-events-none w-px h-px"
  style:left="{x}px"
  style:top="{y}px"
></div>

<DropdownMenu.Root bind:open>
  <DropdownMenu.Trigger
    class="fixed pointer-events-none"
    style="left: {x}px; top: {y}px; width: 1px; height: 1px;"
  />
  <DropdownMenu.Portal>
    <DropdownMenu.Content
      class="z-50 min-w-[220px] rounded-lg border border-gray-200 bg-white px-1 py-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
      side="bottom"
      align="start"
      sideOffset={0}
    >
      <!-- Hide/Show -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleHideToggle}
      >
        {#if isHidden}
          <Eye class="size-4" />
          <span>Show</span>
        {:else}
          <EyeSlash class="size-4" />
          <span>Hide</span>
        {/if}
      </DropdownMenu.Item>

      {#if sourceState.mapCount > 1}
        <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

        <!-- Bring to Front -->
        <DropdownMenu.Item
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          onSelect={handleBringToFront}
        >
          <span class="size-4"><BringMapsToFront /></span>
          <span>Bring to Front</span>
        </DropdownMenu.Item>

        <!-- Bring Forward -->
        <DropdownMenu.Item
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          onSelect={handleBringForward}
        >
          <span class="size-4"><BringMapsForward /></span>
          <span>Bring Forward</span>
        </DropdownMenu.Item>

        <!-- Send Backward -->
        <DropdownMenu.Item
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          onSelect={handleSendBackward}
        >
          <span class="size-4"><SendMapsBackward /></span>
          <span>Send Backward</span>
        </DropdownMenu.Item>

        <!-- Send to Back -->
        <DropdownMenu.Item
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          onSelect={handleSendToBack}
        >
          <span class="size-4"><SendMapsToBack /></span>
          <span>Send to Back</span>
        </DropdownMenu.Item>
      {/if}

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Open in Allmaps Editor -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleOpenInEditor}
        disabled={!imageUri}
      >
        <ArrowSquareOut class="size-4" />
        <span>Open in Allmaps Editor</span>
      </DropdownMenu.Item>

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Copy Annotation URL -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleCopyAnnotationUrl}
        disabled={!imageUri}
      >
        <Copy class="size-4" />
        <span>Copy Annotation URL</span>
      </DropdownMenu.Item>

      <!-- Copy Image URL -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleCopyImageUrl}
        disabled={!imageUri}
      >
        <Copy class="size-4" />
        <span>Copy Image URL</span>
      </DropdownMenu.Item>

      <!-- Copy Map URL -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleCopyMapUrl}
        disabled={!mapId}
      >
        <Copy class="size-4" />
        <span>Copy Map URL</span>
      </DropdownMenu.Item>

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Open in... submenu -->
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        >
          <Globe class="size-4" />
          <span class="flex-1">Open location in&hellip;</span>
          <CaretRight class="size-4 ml-auto" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          class="z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white px-1 py-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DropdownMenu.Item
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
            onSelect={openOpenStreetMap}
          >
            <ArrowSquareOut class="size-4" />
            <span>OpenStreetMap</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
            onSelect={openGoogleMaps}
          >
            <ArrowSquareOut class="size-4" />
            <span>Google Maps</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
            onSelect={openGoogleStreetView}
          >
            <MapPin class="size-4" />
            <span>Google Street View</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
            onSelect={openBingMaps}
          >
            <ArrowSquareOut class="size-4" />
            <span>Bing Maps</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
            onSelect={openMapillary}
          >
            <ArrowSquareOut class="size-4" />
            <span>Mapillary</span>
          </DropdownMenu.Item>
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
