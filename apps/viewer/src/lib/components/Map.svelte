<script lang="ts">
  import { onMount, untrack, tick } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { basemapStyle, addTerrain, removeTerrain } from '@allmaps/basemap'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { WarpedMapList } from '@allmaps/render'

  import { rgbToHex } from '@allmaps/stdlib'
  import { computeWarpedMapBearing } from '@allmaps/bearing'

  import { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'

  import MapMenu from './MapMenu.svelte'

  import { getImagesState } from '$lib/state/images.svelte'
  import { getBackgroundColorsState } from '$lib/state/background-colors.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { BackGroundColorEvents } from '$lib/shared/background-color-events.js'
  import { hasInputTarget } from '$lib/shared/keyboard.js'
  import { setView, selectMap } from '$lib/shared/views.js'

  import type { MapMouseEvent } from 'maplibre-gl'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Image as IIIFImage } from '@allmaps/iiif-parser'
  import type { WarpedMap } from '@allmaps/render'
  import type { WebGL2WarpedMap } from '@allmaps/render/webgl2'

  import type { Source } from '$lib/types/shared.js'
  import type { BackgroundColorChangeEvent } from '$lib/shared/background-color-events.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  // Partly from:
  // https://github.com/mclaeysb/allmaps/blob/344e9cd22946304b51a44a72984afadf2f50bf5e/packages/components/src/lib/components/maps/WarpedMapLayerMap.svelte

  const PADDING = 60
  const DURATION = 400

  type Props = {
    source: Source
    view?: 'map' | 'image'
    selectedMapId?: string
    opacity?: number
    removeBackground?: boolean
    terrain?: boolean
    bearing?: number
    imageUpBearing?: number
  }

  let {
    source,
    view = 'map',
    selectedMapId = $bindable(),
    opacity = 1,
    removeBackground = false,
    terrain = false,
    bearing = $bindable(0),
    imageUpBearing = $bindable()
  }: Props = $props()

  let container = $state<HTMLElement>()
  let map = $state.raw<MapLibreMap>()
  let warpedMapList: WarpedMapList<WebGL2WarpedMap> = new WarpedMapList()
  let warpedMapLayer = $state.raw<WarpedMapLayer>()
  let warpedMaps = $state<WarpedMap[]>([])

  let toggledOpacity = $state(false)
  let toggledRemoveBackground = $state(false)

  let previousSelectedMapId: string | undefined
  let selectionCameFromMapClick = false
  let originalMapOrder: string[] = []

  let georeferencedMaps = $derived.by(() => {
    if (source.parsed.type === 'annotation') {
      return source.parsed.maps
    } else {
      return source.parsed.apiMaps || []
    }
  })

  let derivedOpacity = $derived.by(() => {
    if (view === 'image') {
      return 1
    } else {
      return toggledOpacity ? 0 : opacity
    }
  })

  let derivedRemoveColorThreshold = $derived.by(() => {
    if (view === 'image') {
      return 0
    } else {
      return toggledRemoveBackground || removeBackground ? 1 : 0
    }
  })

  let mapLoaded = $state(false)
  let terrainAdded = $state(false)

  const imagesState = getImagesState()
  const backgroundColorsState = getBackgroundColorsState()
  const uiState = getUiState()

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer?.setLayerOptions({
        opacity: derivedOpacity
      })
    }
  })

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer.setMapsOptions(warpedMapLayer.getMapIds(), {
        removeColorThreshold: derivedRemoveColorThreshold / 3
      })
    }
  })

  // Add or remove terrain layer
  $effect(() => {
    if (!map) {
      return
    }

    if (mapLoaded) {
      if (terrain) {
        // @ts-expect-error incorrect MapLibre types
        addTerrain(map, maplibregl)
        terrainAdded = true
      } else if (terrainAdded) {
        removeTerrain(map)
        terrainAdded = false
      }
    }
  })

  export function zoomToExtent() {
    if (view === 'map') {
      if (selectedMapId) {
        const warpedMap = warpedMapLayer?.getWarpedMap(selectedMapId)
        const bounds = warpedMap?.geoMaskBbox
        if (bounds) {
          map?.fitBounds(bounds, {
            padding: PADDING,
            duration: DURATION
          })
        }
      } else {
        const bounds = warpedMapLayer?.getBounds()
        if (bounds) {
          map?.fitBounds(bounds, {
            padding: PADDING,
            duration: DURATION
          })
        }
      }
    } else if (view === 'image' && selectedMapIdForImageView) {
      if (map && warpedMapLayer) {
        const { center, zoom, bearing } =
          warpedMapLayer.getMapsCenterZoomBearing([selectedMapIdForImageView], {
            padding: PADDING
          })

        map.flyTo({
          center,
          zoom,
          bearing,
          duration: DURATION
        })
      }
      // const warpedMap = warpedMapLayer?.getWarpedMap(selectedMapId)
      // const imageBounds = warpedMap?.imageBounds
      // if (imageBounds) {
      //   map?.fitBounds(imageBounds, {
      //     padding: PADDING,
      //     duration: DURATION
      //   })
      // }
    }
  }

  const pendingParsedImages = new Map<string, IIIFImage>()
  let flushParsedImagesHandle: number | undefined

  // Context menu state
  let contextMenuOpen = $state(false)
  let contextMenuX = $state(0)
  let contextMenuY = $state(0)
  let contextMenuMapId = $state<string>()
  let contextMenuGeoreferencedMap = $state<GeoreferencedMap>()
  let contextMenuLatLon = $state<[number, number]>([0, 0])

  let selectedMapIdForImageView = $derived(
    selectedMapId || georeferencedMaps[0]?.id
  )

  let selectedWarpedMap = $derived.by(() => {
    if (!warpedMapLayer || !selectedMapIdForImageView) {
      return undefined
    }
    return warpedMaps.find(
      (warpedMap) => warpedMap.mapId == selectedMapIdForImageView
    )
  })

  $effect(() => {
    if (!selectedWarpedMap) {
      imageUpBearing = undefined
      return
    }

    imageUpBearing = computeWarpedMapBearing(selectedWarpedMap, {
      orientation: 'vertical'
    })
  })

  function flushParsedImages() {
    imagesState.addParsedImages(pendingParsedImages)
    pendingParsedImages.clear()
    flushParsedImagesHandle = undefined
  }

  function queueParsedImage(imageId: string, parsedImage: IIIFImage) {
    pendingParsedImages.set(imageId, parsedImage)

    if (flushParsedImagesHandle !== undefined) {
      return
    }

    flushParsedImagesHandle = requestAnimationFrame(flushParsedImages)
  }

  function handleImageLoaded(event: WarpedMapEvent) {
    const mapIds = event.data?.mapIds

    if (!mapIds) {
      return
    }

    mapIds.forEach((mapId) => {
      const warpedMap = warpedMapList.getWarpedMap(mapId)
      if (warpedMap?.hasImage()) {
        queueParsedImage(
          warpedMap.georeferencedMap.resource.id,
          warpedMap.image
        )
      }
    })
  }

  function updateSelectedMapZOrder(mapId?: string) {
    if (!warpedMapLayer || originalMapOrder.length === 0) {
      return
    }

    warpedMapLayer.bringMapsToFront(originalMapOrder)

    if (mapId) {
      warpedMapLayer.bringMapsToFront([mapId])
    }
  }

  function findMapIdFromMapMouseEvent(event: MapMouseEvent) {
    return warpedMapLayer?.getWarpedMapList().getMapIds({
      geoPoint: [event.lngLat.lng, event.lngLat.lat],
      onlyVisible: true
    })[0]
  }

  function handleMapClick(event: MapMouseEvent) {
    if (!warpedMapLayer || view === 'image') {
      return
    }

    // if (warpedMapLayer.renderer?.animating) {
    //   return
    // }

    let newSelectedMapId = findMapIdFromMapMouseEvent(event)

    if (newSelectedMapId && previousSelectedMapId !== newSelectedMapId) {
      selectionCameFromMapClick = true
      selectedMapId = newSelectedMapId
    } else {
      selectionCameFromMapClick = false
      selectedMapId = undefined
    }
  }

  async function handleMapContextMenu(event: MapMouseEvent) {
    event.preventDefault()
    event.originalEvent.stopPropagation()

    const mapId = findMapIdFromMapMouseEvent(event)
    if (mapId) {
      // Close the menu first if it's already open
      contextMenuOpen = false

      // Use tick to ensure the close happens before reopening
      await tick()

      contextMenuMapId = mapId
      contextMenuGeoreferencedMap = georeferencedMaps.find(
        (georeferencedMap) => georeferencedMap.id === mapId
      )
      contextMenuLatLon = [event.lngLat.lat, event.lngLat.lng]
      contextMenuX = event.originalEvent.clientX
      contextMenuY = event.originalEvent.clientY
      contextMenuOpen = true
    }
  }

  function handleViewImage(mapId: string) {
    selectedMapId = mapId
    uiState.view = view === 'image' ? 'map' : 'image'
  }

  function handleZoomToExtent(mapId: string) {
    if (!map || !warpedMapLayer) {
      return
    }

    if (view === 'image') {
      const { center, zoom, bearing } = warpedMapLayer.getMapsCenterZoomBearing(
        [mapId],
        {
          padding: PADDING
        }
      )

      map.flyTo({
        center,
        zoom,
        bearing,
        duration: DURATION
      })
    } else {
      const bounds = warpedMapLayer.getWarpedMap(mapId)?.geoMaskBbox

      if (bounds) {
        map.fitBounds(bounds, {
          padding: PADDING,
          duration: DURATION
        })
      }
    }
  }

  export function zoomIn() {
    map?.zoomIn()
  }

  export function zoomOut() {
    map?.zoomOut()
  }

  export function resetBearing() {
    if (map) {
      const bearing = map.getBearing()

      if (bearing !== 0) {
        map?.rotateTo(0, { duration: DURATION })
      } else if (view === 'image') {
        if (warpedMapLayer && selectedMapIdForImageView) {
          const { bearing } = warpedMapLayer.getMapsCenterZoomBearing([
            selectedMapIdForImageView
          ])

          if (bearing) {
            map?.rotateTo(bearing, { duration: DURATION })
          }
        }
      }
    }
  }

  $effect(() => {
    if (previousSelectedMapId === selectedMapId) {
      return
    }

    untrack(() => {
      if (map && warpedMapLayer) {
        updateSelectedMapZOrder(selectedMapId)

        selectMap(
          view,
          map,
          warpedMapLayer,
          DURATION,
          PADDING,
          selectedMapId,
          previousSelectedMapId,
          !selectionCameFromMapClick
        )

        previousSelectedMapId = selectedMapId
      }
    })

    selectionCameFromMapClick = false
  })

  $effect(() => {
    if (view) {
      untrack(() => {
        if (map && warpedMapLayer && selectedMapIdForImageView) {
          setView(
            view,
            map,
            warpedMapLayer,
            selectedMapIdForImageView,
            DURATION,
            PADDING
          )
        }
      })
    }
  })

  function handleKeyDown(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      toggledOpacity = true
    } else if (event.key === 'b') {
      toggledRemoveBackground = true
    } else {
      return
    }

    event.preventDefault()
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      toggledOpacity = false
    } else if (event.key === 'b') {
      toggledRemoveBackground = false
    } else {
      return
    }

    event.preventDefault()
  }

  function handleContextMenu(event: MouseEvent) {
    if (contextMenuOpen) {
      event.preventDefault()
    }
  }

  function handleBackgroundColorChange(event: BackgroundColorChangeEvent) {
    const { mapId, backgroundColor } = event.detail
    warpedMapLayer?.setMapOptions(mapId, {
      removeColorColor: backgroundColor ? rgbToHex(backgroundColor) : undefined
    })
  }

  onMount(() => {
    if (!container) {
      return
    }

    // warpedMapLayer?.renderer?.mapsInViewport
    // const protocol = new Protocol()
    // maplibregl.addProtocol('pmtiles', protocol.tile)

    warpedMapList.addGeoreferencedMaps(georeferencedMaps)
    warpedMaps = warpedMapList.getWarpedMaps()

    warpedMapList.addEventListener(
      WarpedMapEventType.IMAGELOADED,
      handleImageLoaded
    )

    const bbox = warpedMapList.getMapsBbox()

    map = new MapLibreMap({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      maxPitch: 0,
      bearingSnap: 0,
      attributionControl: false,
      navigationControl: false,
      bounds: bbox,
      fitBoundsOptions: {
        padding: PADDING
      }
    })

    map.on('load', () => {
      if (!map) {
        return
      }

      // Add white background layer between basemap and warped maps
      map.addLayer({
        id: 'white-background',
        type: 'background',
        paint: {
          'background-color': '#ffffff',
          'background-opacity': 0,
          'background-opacity-transition': { duration: DURATION }
        }
      })

      warpedMapLayer = new WarpedMapLayer({ warpedMapList })

      map.addLayer(warpedMapLayer)
      originalMapOrder = warpedMapLayer.getMapIds()

      warpedMapLayer.setMapsOptions((mapId) => {
        const backgroundColor =
          backgroundColorsState.getBackgroundColorForMap(mapId)

        return {
          removeColorColor: backgroundColor
            ? rgbToHex(backgroundColor)
            : undefined,
          removeColor: true,
          removeColorHardness: 0.1,
          removeColorThreshold: 0
        }
      })

      map.on('click', handleMapClick)
      map.on('contextmenu', handleMapContextMenu)
      map.on('rotate', () => (bearing = map?.getBearing() || 0))

      // Select initial map if one is provided
      if (selectedMapId) {
        updateSelectedMapZOrder(selectedMapId)
        selectMap(view, map, warpedMapLayer, DURATION, PADDING, selectedMapId)
        previousSelectedMapId = selectedMapId
      }

      mapLoaded = true

      map.once(WarpedMapEventType.ALLREQUESTEDTILESLOADED, () => {
        imagesState.resumeFetchingThumbnails()
        backgroundColorsState.resume()
      })

      backgroundColorsState.addEventListener(
        BackGroundColorEvents.BACKGROUND_COLOR_CHANGE,
        handleBackgroundColorChange
      )

      // backgroundColorsState.resume()
    })

    return () => {
      imagesState.pauseFetchingThumbnails()
      backgroundColorsState.pause()

      map?.stop()

      warpedMapList.removeEventListener(
        WarpedMapEventType.IMAGELOADED,
        handleImageLoaded
      )
      backgroundColorsState.removeEventListener(
        BackGroundColorEvents.BACKGROUND_COLOR_CHANGE,
        handleBackgroundColorChange
      )
      if (flushParsedImagesHandle !== undefined) {
        cancelAnimationFrame(flushParsedImagesHandle)
      }

      map?.remove()
    }
  })
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  oncontextmenu={handleContextMenu}
/>

<div
  class="h-full w-full [&_canvas:focus-visible]:outline-none"
  bind:this={container}
></div>

{#if contextMenuMapId && contextMenuGeoreferencedMap && warpedMapLayer}
  <MapMenu
    bind:open={contextMenuOpen}
    x={contextMenuX}
    y={contextMenuY}
    latLon={contextMenuLatLon}
    {view}
    mapId={contextMenuMapId}
    georeferencedMap={contextMenuGeoreferencedMap}
    {warpedMapLayer}
    onViewImage={handleViewImage}
    onZoomToExtent={handleZoomToExtent}
  />
{/if}
