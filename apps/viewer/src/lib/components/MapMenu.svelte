<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import {
    BringMapsToFront as BringMapsToFrontIcon,
    BringMapsForward as BringMapsForwardIcon,
    SendMapsBackward as SendMapsBackwardIcon,
    SendMapsToBack as SendMapsToBackIcon
  } from '@allmaps/ui'
  import {
    Eye as EyeIcon,
    EyeSlash as EyeSlashIcon,
    Image as ImageIcon,
    ArrowsOut as ArrowsOutIcon,
    ArrowSquareOut as ArrowSquareOutIcon,
    Copy as CopyIcon,
    CaretRight as CaretRightIcon,
    Globe as GlobeIcon
  } from 'phosphor-svelte'

  import { getSourceState } from '$lib/state/source.svelte.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMapLayer } from '@allmaps/maplibre'
  import type { Snippet } from 'svelte'

  type Props = {
    open: boolean
    x: number
    y: number
    latLon: [number, number]
    view: 'map' | 'image'
    mapId: string
    georeferencedMap: GeoreferencedMap
    warpedMapLayer: WarpedMapLayer
    onViewImage: (mapId: string) => void
    onZoomToExtent: (mapId: string) => void
  }

  let {
    open = $bindable(),
    x,
    y,
    latLon,
    view,
    mapId,
    georeferencedMap,
    warpedMapLayer,
    onViewImage,
    onZoomToExtent
  }: Props = $props()

  const sourceState = getSourceState()

  let anchorElement: HTMLDivElement | undefined

  let isHidden = $state(false)

  // Get image URI for URL generation
  const imageUri = $derived(georeferencedMap.resource.id)
  const editorUrl = $derived(
    imageUri
      ? `https://editor.allmaps.org/#/mask?url=${encodeURIComponent(imageUri)}`
      : undefined
  )
  const openStreetMapUrl = $derived.by(() => {
    const [lat, lon] = latLon
    return `https://www.openstreetmap.org/#map=17/${lat}/${lon}`
  })
  const googleMapsUrl = $derived.by(() => {
    const [lat, lon] = latLon
    return `https://www.google.com/maps/@${lat},${lon},17z`
  })
  const googleStreetViewUrl = $derived.by(() => {
    const [lat, lon] = latLon
    return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lon}`
  })
  const bingMapsUrl = $derived.by(() => {
    const [lat, lon] = latLon
    return `https://www.bing.com/maps?cp=${lat}~${lon}&lvl=17`
  })
  const mapillaryUrl = $derived.by(() => {
    const [lat, lon] = latLon
    return `https://www.mapillary.com/app/?lat=${lat}&lng=${lon}&z=17`
  })

  async function handleHideToggle() {
    isHidden = !isHidden
    warpedMapLayer.setMapOptions(mapId, {
      opacity: isHidden ? 0 : 1
    })
  }

  function handleView() {
    onViewImage(mapId)
  }

  function handleZoomToExtent() {
    onZoomToExtent(mapId)
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

  async function handleCopyAnnotationUrl() {
    try {
      // const annotationUrl = `https://annotations.allmaps.org/maps/${mapId}`
      await navigator.clipboard.writeText(mapId)
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

  const menuItemClass =
    'flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100'
</script>

{#snippet externalLinkIcon()}
  <ArrowSquareOutIcon class="size-4" />
{/snippet}

{#snippet externalLinkMenuItem(
  label: string,
  href: string | undefined,
  icon: Snippet = externalLinkIcon
)}
  <DropdownMenu.Item textValue={label} disabled={!href}>
    {#snippet child({ props })}
      {#if href}
        <a
          {...props}
          class={menuItemClass}
          {href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {@render icon()}
          <span>{label}</span>
        </a>
      {:else}
        <span {...props} class={menuItemClass}>
          {@render icon()}
          <span>{label}</span>
        </span>
      {/if}
    {/snippet}
  </DropdownMenu.Item>
{/snippet}

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
      <!-- View image / map -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleView}
      >
        <ImageIcon class="size-4" />
        <span>{view === 'image' ? 'View on map' : 'View image'}</span>
      </DropdownMenu.Item>

      <!-- Zoom to extent -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleZoomToExtent}
      >
        <ArrowsOutIcon class="size-4" />
        <span>Zoom to extent</span>
      </DropdownMenu.Item>

      {#if view === 'map'}
        <!-- Hide/Show -->
        <DropdownMenu.Item
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          onSelect={handleHideToggle}
        >
          {#if isHidden}
            <EyeIcon class="size-4" />
            <span>Show</span>
          {:else}
            <EyeSlashIcon class="size-4" />
            <span>Hide</span>
          {/if}
        </DropdownMenu.Item>
      {/if}

      {#if view === 'map' && sourceState.mapCount > 1}
        <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

        <!-- Arrange submenu -->
        <DropdownMenu.Sub>
          <DropdownMenu.SubTrigger
            class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
          >
            <span class="size-4"><BringMapsToFrontIcon /></span>
            <span class="flex-1">Arrange</span>
            <CaretRightIcon class="size-4 ml-auto" />
          </DropdownMenu.SubTrigger>
          <DropdownMenu.SubContent
            class="z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white px-1 py-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          >
            <!-- Bring to Front -->
            <DropdownMenu.Item
              class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
              onSelect={handleBringToFront}
            >
              <span class="size-4"><BringMapsToFrontIcon /></span>
              <span>Bring to Front</span>
            </DropdownMenu.Item>

            <!-- Bring Forward -->
            <DropdownMenu.Item
              class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
              onSelect={handleBringForward}
            >
              <span class="size-4"><BringMapsForwardIcon /></span>
              <span>Bring Forward</span>
            </DropdownMenu.Item>

            <!-- Send Backward -->
            <DropdownMenu.Item
              class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
              onSelect={handleSendBackward}
            >
              <span class="size-4"><SendMapsBackwardIcon /></span>
              <span>Send Backward</span>
            </DropdownMenu.Item>

            <!-- Send to Back -->
            <DropdownMenu.Item
              class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
              onSelect={handleSendToBack}
            >
              <span class="size-4"><SendMapsToBackIcon /></span>
              <span>Send to Back</span>
            </DropdownMenu.Item>
          </DropdownMenu.SubContent>
        </DropdownMenu.Sub>
      {/if}

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Open in Allmaps Editor -->
      {@render externalLinkMenuItem('Open in Allmaps Editor', editorUrl)}

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Copy Annotation URL -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleCopyAnnotationUrl}
        disabled={!mapId}
      >
        <CopyIcon class="size-4" />
        <span>Copy Annotation URL</span>
      </DropdownMenu.Item>

      <!-- Copy Image URL -->
      <DropdownMenu.Item
        class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        onSelect={handleCopyImageUrl}
        disabled={!imageUri}
      >
        <CopyIcon class="size-4" />
        <span>Copy Image URL</span>
      </DropdownMenu.Item>

      <DropdownMenu.Separator class="my-1 h-px bg-gray-200" />

      <!-- Open in... submenu -->
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger
          class="flex h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 text-sm outline-none transition-colors hover:bg-gray-100 data-highlighted:bg-gray-100"
        >
          <GlobeIcon class="size-4" />
          <span class="flex-1">Open location in&hellip;</span>
          <CaretRightIcon class="size-4 ml-auto" />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.SubContent
          class="z-50 min-w-[200px] rounded-lg border border-gray-200 bg-white px-1 py-1.5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {@render externalLinkMenuItem('OpenStreetMap', openStreetMapUrl)}
          {@render externalLinkMenuItem('Google Maps', googleMapsUrl)}
          {@render externalLinkMenuItem(
            'Google Street View',
            googleStreetViewUrl
          )}
          {@render externalLinkMenuItem('Bing Maps', bingMapsUrl)}
          {@render externalLinkMenuItem('Mapillary', mapillaryUrl)}
        </DropdownMenu.SubContent>
      </DropdownMenu.Sub>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
