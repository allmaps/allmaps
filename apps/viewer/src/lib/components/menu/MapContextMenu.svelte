<script lang="ts">
  import { DropdownMenu } from 'bits-ui'
  import {
    BringMapsToFront as BringMapsToFrontIcon,
    BringMapsForward as BringMapsForwardIcon,
    SendMapsBackward as SendMapsBackwardIcon,
    SendMapsToBack as SendMapsToBackIcon,
    Logo
  } from '@allmaps/ui'
  import {
    Eye as EyeIcon,
    EyeSlash as EyeSlashIcon,
    Image as ImageIcon,
    ArrowsOut as ArrowsOutIcon,
    Copy as CopyIcon,
    Globe as GlobeIcon
  } from 'phosphor-svelte'

  import MenuContent from '$lib/components/menu/MenuContent.svelte'
  import MapAnnotationMenuItems from '$lib/components/menu/MapAnnotationMenuItems.svelte'
  import MenuItem from '$lib/components/menu/MenuItem.svelte'
  import MenuLinkItem from '$lib/components/menu/MenuLinkItem.svelte'
  import MenuSeparator from '$lib/components/menu/MenuSeparator.svelte'
  import MenuSubContent from '$lib/components/menu/MenuSubContent.svelte'
  import MenuSubTrigger from '$lib/components/menu/MenuSubTrigger.svelte'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { flattenPartOf } from '$lib/shared/metadata.js'
  import { getViewMapLabel } from '$lib/shared/map-actions.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMapLayer } from '@allmaps/maplibre'

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

  const mapsState = getMapsState()
  const uiState = getUiState()

  let anchorElement: HTMLDivElement | undefined

  let isHidden = $derived(uiState.isMapHidden(mapId))

  // Get image URI for URL generation
  const imageUri = $derived(georeferencedMap.resource.id)
  let isEmbedded = $derived(mapsState.isEmbeddedMap(mapId))
  const manifestUri = $derived.by(() => {
    return findFirstPartOfItemOfType(
      georeferencedMap.resource.partOf,
      'Manifest'
    )?.id
  })
  const theseusViewerUrl = $derived.by(() => {
    let iiifContent
    if (manifestUri) {
      iiifContent = manifestUri
    } else if (imageUri) {
      iiifContent = imageUri + '/info.json'
    } else {
      return undefined
    }

    if (iiifContent) {
      return `https://theseusviewer.org/?iiif-content=${encodeURIComponent(iiifContent)}`
    }
  })

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
    uiState.toggleMapHidden(mapId)
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

  function findFirstPartOfItemOfType(
    partOf: GeoreferencedMap['resource']['partOf'],
    type: string
  ) {
    for (const partOfItem of flattenPartOf(partOf)) {
      if (partOfItem.type === type) {
        return partOfItem
      }
    }
  }

  async function handleCopyImageId() {
    try {
      await navigator.clipboard.writeText(imageUri)
    } catch (error) {
      console.error('Failed to copy image ID:', error)
    }
  }

  async function handleCopyManifestId() {
    if (!manifestUri) {
      return
    }

    try {
      await navigator.clipboard.writeText(manifestUri)
    } catch (error) {
      console.error('Failed to copy manifest ID:', error)
    }
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
    <MenuContent side="bottom" align="start">
      <MenuItem onSelect={handleView}>
        <ImageIcon class="size-4" />
        <span>{getViewMapLabel(view)}</span>
      </MenuItem>

      <MenuItem onSelect={handleZoomToExtent}>
        <ArrowsOutIcon class="size-4" />
        <span>Zoom to extent</span>
      </MenuItem>

      {#if view === 'map'}
        <MenuItem
          onSelect={handleHideToggle}
          disabled={!mapsState.canHideMap(mapId)}
        >
          {#if isHidden}
            <EyeIcon class="size-4" />
            <span>Show</span>
          {:else}
            <EyeSlashIcon class="size-4" />
            <span>Hide</span>
          {/if}
        </MenuItem>
      {/if}

      {#if view === 'map' && mapsState.mapCount > 1}
        <MenuSeparator />

        <DropdownMenu.Sub>
          <MenuSubTrigger>
            <span class="size-4"><BringMapsToFrontIcon /></span>
            <span class="flex-1">Arrange</span>
          </MenuSubTrigger>
          <MenuSubContent>
            <MenuItem onSelect={handleBringToFront}>
              <span class="size-4"><BringMapsToFrontIcon /></span>
              <span>Bring to Front</span>
            </MenuItem>

            <MenuItem onSelect={handleBringForward}>
              <span class="size-4"><BringMapsForwardIcon /></span>
              <span>Bring Forward</span>
            </MenuItem>

            <MenuItem onSelect={handleSendBackward}>
              <span class="size-4"><SendMapsBackwardIcon /></span>
              <span>Send Backward</span>
            </MenuItem>

            <MenuItem onSelect={handleSendToBack}>
              <span class="size-4"><SendMapsToBackIcon /></span>
              <span>Send to Back</span>
            </MenuItem>
          </MenuSubContent>
        </DropdownMenu.Sub>
      {/if}

      <MenuSeparator />

      <DropdownMenu.Sub>
        <MenuSubTrigger>
          <span class="size-4"><Logo /></span>
          <span class="flex-1">Georeference</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MapAnnotationMenuItems map={georeferencedMap} {isEmbedded} />
        </MenuSubContent>
      </DropdownMenu.Sub>

      <MenuSeparator />

      <DropdownMenu.Sub>
        <MenuSubTrigger>
          <ImageIcon class="size-4" />
          <span class="flex-1">IIIF</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuItem onSelect={handleCopyImageId} disabled={!imageUri}>
            <CopyIcon class="size-4" />
            <span>Copy Image ID</span>
          </MenuItem>

          {#if manifestUri}
            <MenuItem onSelect={handleCopyManifestId}>
              <CopyIcon class="size-4" />
              <span>Copy Manifest ID</span>
            </MenuItem>
          {/if}

          {#if theseusViewerUrl}
            <MenuSeparator />
            <MenuLinkItem href={theseusViewerUrl}>
              Open in Theseus Viewer
            </MenuLinkItem>
          {/if}
        </MenuSubContent>
      </DropdownMenu.Sub>

      <MenuSeparator />

      <DropdownMenu.Sub>
        <MenuSubTrigger>
          <GlobeIcon class="size-4" />
          <span class="flex-1">Open location in</span>
        </MenuSubTrigger>
        <MenuSubContent>
          <MenuLinkItem href={openStreetMapUrl}>OpenStreetMap</MenuLinkItem>
          <MenuLinkItem href={googleMapsUrl}>Google Maps</MenuLinkItem>
          <MenuLinkItem href={googleStreetViewUrl}>
            Google Street View
          </MenuLinkItem>
          <MenuLinkItem href={bingMapsUrl}>Bing Maps</MenuLinkItem>
          <MenuLinkItem href={mapillaryUrl}>Mapillary</MenuLinkItem>
        </MenuSubContent>
      </DropdownMenu.Sub>
    </MenuContent>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
