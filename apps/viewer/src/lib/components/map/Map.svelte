<script lang="ts">
  import { onMount, untrack, tick } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { basemapStyle, addTerrain, removeTerrain } from '@allmaps/basemap'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { WarpedMapList } from '@allmaps/render'

  import { bboxToLine, rgbToHex } from '@allmaps/stdlib'
  import { computeWarpedMapBearing } from '@allmaps/bearing'

  import { WarpedMapEvent, WarpedMapEventType } from '@allmaps/render'

  import MapContextMenu from '../menu/MapContextMenu.svelte'
  import UserLocation from './UserLocation.svelte'

  import { getImagesState } from '$lib/state/images.svelte'
  import { getBackgroundColorsState } from '$lib/state/background-colors.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { BackGroundColorEvents } from '$lib/shared/background-color-events.js'
  import { hasInputTarget } from '$lib/shared/keyboard.js'
  import { setView, selectMap } from '$lib/shared/views.js'

  import type { MapMouseEvent } from 'maplibre-gl'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Image as IIIFImage } from '@allmaps/iiif-parser'
  import type { WarpedMap } from '@allmaps/render'
  import type { WebGL2WarpedMap } from '@allmaps/render/webgl2'
  import type { BackgroundColorChangeEvent } from '$lib/shared/background-color-events.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  // Partly from:
  // https://github.com/mclaeysb/allmaps/blob/344e9cd22946304b51a44a72984afadf2f50bf5e/packages/components/src/lib/components/maps/WarpedMapLayerMap.svelte

  const PADDING = 60
  const DURATION = 400

  type Props = {
    view?: 'map' | 'image'
    selectedMapId?: string
    opacity?: number
    removeBackground?: boolean
    terrain?: boolean
    bearing?: number
    imageUpBearing?: number
  }

  type WarpedMapLayerEvent = {
    mapIds?: string[]
    tileUrl?: string
    error?: Error
    errorKind?: string
    corsLikely?: boolean
    status?: number
  }

  let {
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
  let userLocation = $state.raw<UserLocation>()

  let opacityBeforeShortcut: number | undefined
  let removeBackgroundBeforeShortcut: boolean | undefined

  let previousSelectedMapId: string | undefined
  let previousView: 'map' | 'image' | undefined
  let previousImageViewBearing: number | undefined
  let selectionCameFromMapClick = false
  let originalMapOrder: string[] = []

  const imagesState = getImagesState()
  const backgroundColorsState = getBackgroundColorsState()
  const mapsState = getMapsState()
  const uiState = getUiState()

  let georeferencedMaps = $derived(mapsState.maps)

  let derivedOpacity = $derived.by(() => {
    if (view === 'image') {
      return 1
    } else {
      return opacity
    }
  })

  function getBackgroundRemovalOptions(mapId: string) {
    const backgroundColor =
      backgroundColorsState.getBackgroundColorForMap(mapId)
    const removeColor =
      view === 'map' && removeBackground && backgroundColor !== undefined

    return {
      removeColorColor: backgroundColor ? rgbToHex(backgroundColor) : undefined,
      removeColor,
      removeColorHardness: 0.1,
      removeColorThreshold: removeColor ? 1 / 3 : 0
    }
  }

  let mapLoaded = $state(false)
  let terrainAdded = $state(false)

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer?.setLayerOptions({
        opacity: derivedOpacity
      })
    }
  })

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer.setMapsOptions((mapId) =>
        getBackgroundRemovalOptions(mapId)
      )
    }
  })

  $effect(() => {
    if (!warpedMapLayer) {
      return
    }

    const hiddenMapIds = uiState.hiddenMapIds
    const mapIdForImageView = selectedMapIdForImageView

    warpedMapLayer.setMapsOptions((mapId) => ({
      visible:
        view === 'map'
          ? !hiddenMapIds.includes(mapId)
          : mapId === mapIdForImageView && !hiddenMapIds.includes(mapId)
    }))
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
      if (selectedMapId && !uiState.isMapHidden(selectedMapId)) {
        const warpedMap = warpedMapLayer?.getWarpedMap(selectedMapId)
        const bounds = warpedMap?.geoMaskBbox
        if (bounds) {
          map?.fitBounds(bounds, {
            padding: PADDING,
            duration: DURATION
          })
        }
      } else {
        const bbox = warpedMapLayer?.renderer?.warpedMapList.getMapsBbox({
          onlyVisible: true
        })
        const bounds = bbox && bboxToLine(bbox)
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

  let selectedMapIdForImageView = $derived.by(() => {
    const selectedMapIsSelectable = mapsState.isMapSelectable(selectedMapId)

    if (selectedMapId && selectedMapIsSelectable) {
      return selectedMapId
    }

    if (selectedMapId) {
      return mapsState.nextMapId ?? mapsState.selectableMaps[0]?.id
    }

    return mapsState.selectableMaps[0]?.id
  })

  $effect(() => {
    if (!selectedMapId) {
      return
    }

    if (mapsState.isMapSelectable(selectedMapId)) {
      return
    }

    selectedMapId = selectedMapIdForImageView
  })

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

  function handleImageInfoFetchError(event: WarpedMapEvent) {
    const imageId = event.data?.imageId
    const error = event.error

    if (!imageId || !error) {
      return
    }

    imagesState.addImageInfoError(imageId, error, {
      imageInfoUrl: event.data?.imageInfoUrl,
      kind: event.data?.errorKind,
      corsLikely: event.data?.corsLikely,
      status: event.data?.status
    })
  }

  function handleTileFetchError(event: WarpedMapLayerEvent) {
    const { mapIds, tileUrl, error } = event

    if (!mapIds || !tileUrl || !error) {
      return
    }

    for (const mapId of mapIds) {
      const warpedMap = warpedMapList.getWarpedMap(mapId)
      const imageId = warpedMap?.georeferencedMap.resource.id

      if (!imageId) {
        continue
      }

      imagesState.addImageTileError(imageId, error, {
        tileUrl,
        kind: event.errorKind,
        corsLikely: event.corsLikely,
        status: event.status
      })
    }
  }

  function handleMapTileLoaded(event: WarpedMapLayerEvent) {
    const { mapIds } = event

    if (!mapIds) {
      return
    }

    for (const mapId of mapIds) {
      const warpedMap = warpedMapList.getWarpedMap(mapId)
      const imageId = warpedMap?.georeferencedMap.resource.id

      if (imageId) {
        imagesState.markImageTileLoaded(imageId)
      }
    }
  }

  function handleWarpedMapError(event: WarpedMapEvent) {
    const error = event.error

    if (!error) {
      return
    }

    const mapIds = event.data?.mapIds

    if (mapIds?.length) {
      for (const mapId of mapIds) {
        mapsState.addMapRenderError(error, mapId)
      }
    } else {
      mapsState.addMapRenderError(error)
    }

    console.warn('Failed to load warped map', {
      mapIds,
      error
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
    const mapIds = warpedMapLayer?.getWarpedMapList().getMapIds({
      geoPoint: [event.lngLat.lng, event.lngLat.lat],
      onlyVisible: true
    })

    if (mapIds && mapIds.length) {
      return mapIds.at(-1)
    }
  }

  function findMapIdAtViewportCenter() {
    if (!map || !warpedMapLayer) {
      return
    }

    const center = map.getCenter()

    return warpedMapLayer.getWarpedMapList().getMapIds({
      geoPoint: [center.lng, center.lat],
      onlyVisible: true
    })[0]
  }

  function handleMapClick(event: MapMouseEvent) {
    if (!warpedMapLayer || view === 'image') {
      return
    }

    let newSelectedMapId = findMapIdFromMapMouseEvent(event)

    if (!mapsState.isMapSelectable(newSelectedMapId)) {
      newSelectedMapId = undefined
    }

    if (newSelectedMapId && selectedMapId !== newSelectedMapId) {
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

  function updatePreviousImageViewBearing(mapId?: string) {
    if (!warpedMapLayer || !mapId) {
      previousImageViewBearing = undefined
      return
    }

    const { bearing } = warpedMapLayer.getMapsCenterZoomBearing([mapId], {
      padding: PADDING
    })

    previousImageViewBearing = bearing
  }

  function isMapInViewport(mapId: string | undefined) {
    if (!mapId) {
      return false
    }

    return warpedMapLayer?.renderer?.mapsInViewport.has(mapId) ?? false
  }

  function shouldPreserveCameraOnViewChange(
    fromView: 'map' | 'image' | undefined,
    toView: 'map' | 'image',
    mapIdForView: string | undefined
  ) {
    if (!fromView || fromView === toView) {
      return false
    }

    return fromView === 'image' || isMapInViewport(mapIdForView)
  }

  function getMapIdForViewChange(
    fromView: 'map' | 'image' | undefined,
    toView: 'map' | 'image'
  ) {
    if (fromView === 'map' && toView === 'image' && !selectedMapId) {
      const centerMapId = findMapIdAtViewportCenter()

      if (centerMapId) {
        return centerMapId
      }
    }

    return selectedMapIdForImageView
  }

  export function zoomIn() {
    map?.zoomIn()
  }

  export function zoomOut() {
    map?.zoomOut()
  }

  export function locateUser() {
    userLocation?.locateUser()
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

        if (view === 'image') {
          updatePreviousImageViewBearing(selectedMapId)
        }

        previousSelectedMapId = selectedMapId
      }
    })

    selectionCameFromMapClick = false
  })

  $effect(() => {
    if (view) {
      untrack(() => {
        if (map && warpedMapLayer && selectedMapIdForImageView) {
          const mapIdForView =
            view === 'map'
              ? selectedMapId
              : getMapIdForViewChange(previousView, view)

          if (view === 'image' && !mapIdForView) {
            return
          }

          const preserveCameraIfZoomedIn = shouldPreserveCameraOnViewChange(
            previousView,
            view,
            mapIdForView
          )

          const setViewResult = setView(
            view,
            map,
            warpedMapLayer,
            mapIdForView,
            DURATION,
            PADDING,
            undefined,
            preserveCameraIfZoomedIn,
            previousView,
            previousImageViewBearing
          )

          if (view === 'image') {
            previousImageViewBearing = setViewResult.naturalBearing
          }

          previousView = view
        }
      })
    }
  })

  function handleKeyDown(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()

      if (
        view !== 'map' ||
        event.repeat ||
        opacityBeforeShortcut !== undefined
      ) {
        return
      }

      opacityBeforeShortcut = uiState.opacity
      uiState.opacity = opacityBeforeShortcut > 0 ? 0 : 1
    } else if (event.key.toLowerCase() === 'b') {
      event.preventDefault()

      if (
        view !== 'map' ||
        event.repeat ||
        removeBackgroundBeforeShortcut !== undefined ||
        !backgroundColorsState.hasBackgroundColors
      ) {
        return
      }

      removeBackgroundBeforeShortcut = uiState.removeBackground
      uiState.removeBackground = !removeBackgroundBeforeShortcut
    } else {
      return
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      event.preventDefault()

      if (opacityBeforeShortcut === undefined) {
        return
      }

      uiState.opacity = opacityBeforeShortcut
      opacityBeforeShortcut = undefined
    } else if (event.key.toLowerCase() === 'b') {
      event.preventDefault()

      if (removeBackgroundBeforeShortcut === undefined) {
        return
      }

      uiState.removeBackground = removeBackgroundBeforeShortcut
      removeBackgroundBeforeShortcut = undefined
    } else {
      return
    }
  }

  function handleContextMenu(event: MouseEvent) {
    if (contextMenuOpen) {
      event.preventDefault()
    }
  }

  function handleBackgroundColorChange(event: BackgroundColorChangeEvent) {
    const { mapId } = event.detail
    warpedMapLayer?.setMapOptions(mapId, getBackgroundRemovalOptions(mapId))
  }

  function handleRequestedTilesLoading() {
    uiState.tilesLoading = true
  }

  function handleAllRequestedTilesLoaded() {
    uiState.tilesLoading = false
  }

  onMount(() => {
    if (!container) {
      return
    }

    previousView = view

    const mapRenderResults =
      warpedMapList.addGeoreferencedMaps(georeferencedMaps)
    mapsState.setMapRenderResults(mapRenderResults)
    warpedMaps = warpedMapList.getWarpedMaps()

    warpedMapList.addEventListener(
      WarpedMapEventType.IMAGELOADED,
      handleImageLoaded
    )
    warpedMapList.addEventListener(
      WarpedMapEventType.IMAGEINFOFETCHERROR,
      handleImageInfoFetchError
    )
    warpedMapList.addEventListener(
      WarpedMapEventType.ERROR,
      handleWarpedMapError
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

      map.on(
        WarpedMapEventType.REQUESTEDTILESLOADING,
        handleRequestedTilesLoading
      )
      map.on(
        WarpedMapEventType.ALLREQUESTEDTILESLOADED,
        handleAllRequestedTilesLoaded
      )
      map.on(WarpedMapEventType.MAPTILELOADED, handleMapTileLoaded)
      map.on(WarpedMapEventType.TILEFETCHERROR, handleTileFetchError)

      map.addLayer(warpedMapLayer)
      originalMapOrder = warpedMapLayer.getMapIds()

      warpedMapLayer.setMapsOptions((mapId) =>
        getBackgroundRemovalOptions(mapId)
      )

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
      uiState.tilesLoading = false

      map?.stop()

      map?.off(
        WarpedMapEventType.REQUESTEDTILESLOADING,
        handleRequestedTilesLoading
      )
      map?.off(
        WarpedMapEventType.ALLREQUESTEDTILESLOADED,
        handleAllRequestedTilesLoaded
      )
      map?.off(WarpedMapEventType.MAPTILELOADED, handleMapTileLoaded)
      map?.off(WarpedMapEventType.TILEFETCHERROR, handleTileFetchError)

      warpedMapList.removeEventListener(
        WarpedMapEventType.IMAGELOADED,
        handleImageLoaded
      )
      warpedMapList.removeEventListener(
        WarpedMapEventType.IMAGEINFOFETCHERROR,
        handleImageInfoFetchError
      )
      warpedMapList.removeEventListener(
        WarpedMapEventType.ERROR,
        handleWarpedMapError
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
>
  <UserLocation
    bind:this={userLocation}
    {map}
    {view}
    {selectedWarpedMap}
    duration={DURATION}
  />
</div>

{#if contextMenuMapId && contextMenuGeoreferencedMap && warpedMapLayer}
  <MapContextMenu
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
