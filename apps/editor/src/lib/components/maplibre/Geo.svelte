<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { Map, addProtocol } from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { pink } from '@allmaps/tailwind'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  // import { basemapStyle, addTerrain, removeTerrain } from '@allmaps/basemap'

  import { getProjectionsState } from '@allmaps/components/state'
  import { getMapsState } from '$lib/state/maps.svelte'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import {
    getResourceMask,
    getCompleteGcps,
    getTransformation,
    getResourceCrs,
    getFullMapId
  } from '$lib/shared/maps.js'
  import { getApiUrl } from '$lib/shared/urls.js'
  import { getStyle } from '$lib/shared/maplibre.js'

  import { UiEvents } from '$lib/shared/ui-events.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { LngLatBoundsLike, MapMouseEvent } from 'maplibre-gl'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { TransformationType } from '@allmaps/transform'

  import type {
    RemoveMapEvent,
    ReplaceResourceMaskEvent,
    ReplaceGcpsEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    SetTransformationEvent,
    SetResourceCrsEvent
  } from '$lib/types/events.js'

  import type { Viewport, BasemapPreset } from '$lib/types/shared.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  type Props = {
    mapIds: string[]
    initialViewport?: Viewport
    geoMap?: Map
    warpedMapLayer?: WarpedMapLayer
    warpedMapLayerBounds?: LngLatBoundsLike
    warpedMapsOpacity?: number
    renderMasks?: boolean
    onmoveend?: (bounds: LngLatBoundsLike) => void
    onBeforeSetStyle?: () => void
    onAfterSetStyle?: () => void
    onMapIdsChanged?: (mapIds: string[]) => void
  }

  let {
    mapIds,
    initialViewport,
    geoMap = $bindable<Map | undefined>(),
    warpedMapLayer = $bindable<WarpedMapLayer | undefined>(),
    warpedMapsOpacity = 1,
    renderMasks = false,
    onmoveend,
    warpedMapLayerBounds = $bindable<LngLatBoundsLike | undefined>(),
    onBeforeSetStyle,
    onAfterSetStyle,
    onMapIdsChanged
  }: Props = $props()

  let backgroundWarpedMapLayer = $state.raw<WarpedMapLayer>()

  let currentMapIds = new SvelteSet<string>([])

  let currentBackgroundGeoreferenceAnnotationUrl = $state<string>()

  let renderMaskOptions = $derived(
    renderMasks
      ? {
          renderMask: true,
          renderMaskColor: pink,
          renderMaskSize: 6
        }
      : { renderMask: false }
  )

  let renderOptions = $derived({
    opacity: warpedMapsOpacity,
    ...renderMaskOptions
  })

  const projectionsState = getProjectionsState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const uiState = getUiState()
  const urlState = getUrlState()

  let basemapPreset = $derived.by<BasemapPreset>(() => {
    if (urlState.params.basemapXyzUrl) {
      return {
        url: urlState.params.basemapXyzUrl,
        type: 'raster',
        attribution: 'Custom XYZ URL'
      }
    } else {
      return uiState.basemapPreset
    }
  })

  let geoMapContainer: HTMLDivElement

  const defaultViewport = {
    center: [0, 0] as [number, number],
    zoom: 1,
    bearing: 0
  }

  const viewport = initialViewport || defaultViewport

  async function addGeoreferencedMap(map: GeoreferencedMap) {
    if (!map.id) {
      throw new Error('Map is missing ID')
    }

    if (warpedMapLayer) {
      try {
        await warpedMapLayer.addGeoreferencedMap(map)
        currentMapIds.add(map.id)
      } catch {
        // Couldn't add Georeferenced Map. This probably means that
        // the map hasn't been fully georeferenced.
      }
    }
  }

  async function removeGeoreferencedMap(mapId: string) {
    if (warpedMapLayer && currentMapIds.has(mapId)) {
      warpedMapLayer.removeGeoreferencedMapById(mapId)
      currentMapIds.delete(mapId)
    }
  }

  async function setGeoreferencedMaps(maps: GeoreferencedMap[]) {
    let currentMapIdsChanged = false
    const newMapIds = new Set<string>()

    for (const map of maps) {
      if (!map.id) {
        throw new Error('Map is missing ID')
      }

      if (!currentMapIds.has(map.id)) {
        await addGeoreferencedMap(map)
        currentMapIdsChanged = true
      }

      newMapIds.add(map.id)
    }

    for (const currentMapId of currentMapIds) {
      if (!newMapIds.has(currentMapId)) {
        await removeGeoreferencedMap(currentMapId)
        currentMapIdsChanged = true
      }
    }

    if (currentMapIdsChanged) {
      onMapIdsChanged?.([...currentMapIds])
    }
  }

  function handleToggleVisible(event: CustomEvent<boolean>) {
    if (warpedMapLayer) {
      warpedMapLayer.setOpacity(
        event.detail ? warpedMapsOpacity : warpedMapsOpacity > 0 ? 0 : 1
      )
    }
  }

  function updateGcps(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map && warpedMapLayer) {
      const gcps = getCompleteGcps(map)

      try {
        warpedMapLayer.setMapGcps(getFullMapId(mapId), gcps)
      } catch {
        removeGeoreferencedMap(getFullMapId(mapId))
      }
    }
  }

  function updateResourceMask(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map && warpedMapLayer) {
      const resourceMask = getResourceMask(map)
      warpedMapLayer.setMapResourceMask(getFullMapId(mapId), resourceMask)
    }
  }

  function updateTransformation(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map && warpedMapLayer) {
      const transformation = getTransformation(map)

      let transformationType: TransformationType = 'polynomial1'

      if (transformation) {
        if (transformation === 'polynomial') {
          transformationType = 'polynomial1'
        } else if (transformation === 'polynomial1') {
          transformationType = 'polynomial1'
        } else if (transformation === 'polynomial2') {
          transformationType = 'polynomial2'
        } else if (transformation === 'polynomial3') {
          transformationType = 'polynomial3'
        } else if (transformation === 'thinPlateSpline') {
          transformationType = 'thinPlateSpline'
        } else if (transformation === 'helmert') {
          transformationType = 'helmert'
        }
      }

      try {
        warpedMapLayer.setMapTransformationType(
          getFullMapId(mapId),
          transformationType
        )
      } catch {
        removeGeoreferencedMap(getFullMapId(mapId))
      }
    }
  }

  function updateResourceCrs(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map && warpedMapLayer) {
      const resourceCrs = getResourceCrs(map)
      if (resourceCrs) {
        const allmapsProjectionId = `projections/${resourceCrs.id}`
        const projectionId = getApiUrl(allmapsProjectionId)
        const projection = projectionsState.projectionsById[projectionId]

        warpedMapLayer.setMapOptions(getFullMapId(mapId), {
          internalProjection: projection
        })
      } else {
        warpedMapLayer.setMapOptions(getFullMapId(mapId), {
          internalProjection: undefined
        })
      }
    }
  }

  function findFirstMapFromEvent(event: MapMouseEvent) {
    if (warpedMapLayer) {
      const mapIds = warpedMapLayer.getWarpedMapList().getMapIds({
        geoPoint: [event.lngLat.lng, event.lngLat.lat],
        onlyVisible: true
      })

      return mapIds[0]
    }
  }

  function handleClick(event: MapMouseEvent) {
    const mapId = findFirstMapFromEvent(event)
    if (mapId) {
      mapsState.activeMapId = mapId
      // TODO: implement click handling
    }
  }

  function handleContextmenu() {
    // event: MapMouseEvent
    // const mapId = findFirstMapFromEvent(event)
    // TODO: implement contextmenu handling
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    const mapId = event.detail.mapId
    removeGeoreferencedMap(mapId)
  }

  function handleReplaceResourceMask(event: ReplaceResourceMaskEvent) {
    const mapId = event.detail.mapId
    updateResourceMask(mapId)
  }

  function handleReplaceGcps(event: ReplaceGcpsEvent) {
    const mapId = event.detail.mapId
    updateGcps(mapId)
  }

  function handleInsertGcp(event: InsertGcpEvent) {
    const mapId = event.detail.mapId
    updateGcps(mapId)
  }

  function handleReplaceGcp(event: ReplaceGcpEvent) {
    const mapId = event.detail.mapId
    updateGcps(mapId)
  }

  function handleRemoveGcp(event: RemoveGcpEvent) {
    const mapId = event.detail.mapId
    updateGcps(mapId)
  }

  function handleInsertResourceMaskPoint(event: InsertResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    updateResourceMask(mapId)
  }

  function handleReplaceResourceMaskPoint(
    event: ReplaceResourceMaskPointEvent
  ) {
    const mapId = event.detail.mapId
    updateResourceMask(mapId)
  }
  function handleRemoveResourceMaskPoint(event: RemoveResourceMaskPointEvent) {
    const mapId = event.detail.mapId
    updateResourceMask(mapId)
  }

  function handleSetTransformation(event: SetTransformationEvent) {
    const mapId = event.detail.mapId
    updateTransformation(mapId)
  }

  function handleSetResourceCrs(event: SetResourceCrsEvent) {
    const mapId = event.detail.mapId
    updateResourceCrs(mapId)
  }

  $effect(() => {
    if (geoMap) {
      onBeforeSetStyle?.()
      geoMap.setStyle(getStyle(basemapPreset))
      geoMap.moveLayer('warped-map-layer')
      onAfterSetStyle?.()
    }
  })

  $effect(() => {
    if (geoMap && warpedMapLayer) {
      if (!backgroundWarpedMapLayer) {
        backgroundWarpedMapLayer = new WarpedMapLayer({
          layerId: 'background-warped-map-layer'
        })

        // @ts-expect-error MapLibre types are incompatible
        geoMap.addLayer(backgroundWarpedMapLayer)
        geoMap.moveLayer('background-warped-map-layer', 'warped-map-layer')
      }

      const backgroundGeoreferenceAnnotationUrl =
        urlState.params.backgroundGeoreferenceAnnotationUrl

      if (
        currentBackgroundGeoreferenceAnnotationUrl &&
        currentBackgroundGeoreferenceAnnotationUrl !==
          backgroundGeoreferenceAnnotationUrl
      ) {
        backgroundWarpedMapLayer.removeGeoreferenceAnnotationByUrl(
          currentBackgroundGeoreferenceAnnotationUrl
        )
      }

      if (
        backgroundGeoreferenceAnnotationUrl &&
        currentBackgroundGeoreferenceAnnotationUrl !==
          backgroundGeoreferenceAnnotationUrl
      ) {
        currentBackgroundGeoreferenceAnnotationUrl =
          backgroundGeoreferenceAnnotationUrl
        backgroundWarpedMapLayer.addGeoreferenceAnnotationByUrl(
          backgroundGeoreferenceAnnotationUrl
        )
      }
    }
  })

  $effect(() => {
    if (
      warpedMapLayer &&
      geoMap &&
      mapsState.connected === true &&
      projectionsState.ready &&
      mapIds
    ) {
      const maps = mapsMergedState.getMapsById(mapIds)
      setGeoreferencedMaps(maps).finally(() => {
        if (warpedMapLayer && currentMapIds.size) {
          warpedMapLayerBounds = warpedMapLayer.getBounds()
        }
      })
    }
  })

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer.setLayerOptions(renderOptions)
    }
  })

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    const newGeoMap = new Map({
      container: geoMapContainer,
      style: getStyle(basemapPreset),
      ...viewport,
      maxPitch: 0,
      minZoom: 2,
      hash: false,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true
      }
    })

    // if (terrain) {
    //   // @ts-expect-error incorrect MapLibre types
    //   addTerrain(newGeoMap, maplibregl)
    // }

    newGeoMap.on('moveend', () => onmoveend?.(newGeoMap.getBounds()))

    newGeoMap.on('click', handleClick)
    newGeoMap.on('contextmenu', handleContextmenu)

    newGeoMap.once('load', () => {
      geoMap = newGeoMap
      warpedMapLayer = new WarpedMapLayer(renderOptions)

      // @ts-expect-error MapLibre types are incompatible
      newGeoMap.addLayer(warpedMapLayer)
    })

    uiState.addEventListener(UiEvents.TOGGLE_VISIBLE, handleToggleVisible)

    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

    mapsState.addEventListener(
      MapsEvents.REPLACE_RESOURCE_MASK,
      handleReplaceResourceMask
    )
    mapsState.addEventListener(MapsEvents.REPLACE_GCPS, handleReplaceGcps)

    mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
    mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
    mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)
    mapsState.addEventListener(
      MapsEvents.INSERT_RESOURCE_MASK_POINT,
      handleInsertResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REPLACE_RESOURCE_MASK_POINT,
      handleReplaceResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.REMOVE_RESOURCE_MASK_POINT,
      handleRemoveResourceMaskPoint
    )
    mapsState.addEventListener(
      MapsEvents.SET_TRANSFORMATION,
      handleSetTransformation
    )
    mapsState.addEventListener(
      MapsEvents.SET_RESOURCE_CRS,
      handleSetResourceCrs
    )

    projectionsState.fetchProjections()

    return () => {
      if (warpedMapLayer) {
        warpedMapLayer.clear()
        geoMap?.remove()
        warpedMapLayer = undefined
      }

      uiState.removeEventListener(UiEvents.TOGGLE_VISIBLE, handleToggleVisible)

      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

      mapsState.removeEventListener(
        MapsEvents.REPLACE_RESOURCE_MASK,
        handleReplaceResourceMask
      )
      mapsState.removeEventListener(MapsEvents.REPLACE_GCPS, handleReplaceGcps)

      mapsState.removeEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
      mapsState.removeEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
      mapsState.removeEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)
      mapsState.removeEventListener(
        MapsEvents.INSERT_RESOURCE_MASK_POINT,
        handleInsertResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REPLACE_RESOURCE_MASK_POINT,
        handleReplaceResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.REMOVE_RESOURCE_MASK_POINT,
        handleRemoveResourceMaskPoint
      )
      mapsState.removeEventListener(
        MapsEvents.SET_TRANSFORMATION,
        handleSetTransformation
      )
      mapsState.removeEventListener(
        MapsEvents.SET_RESOURCE_CRS,
        handleSetResourceCrs
      )
    }
  })
</script>

<div bind:this={geoMapContainer} class="h-full w-full"></div>
