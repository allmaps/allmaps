<script lang="ts">
  import { onMount } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'

  import { Map, addProtocol } from 'maplibre-gl'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { pink } from '@allmaps/tailwind'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  // import { basemapStyle, addTerrain, removeTerrain } from '@allmaps/basemap'

  import { getProjectionsState } from '@allmaps/components/state'

  import { getMapsState } from '$lib/state/maps.svelte'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

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

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { TransformationType } from '@allmaps/transform'

  import type {
    InsertMapEvent,
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

  import type { Viewport } from '$lib/types/shared.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  type Props = {
    mapIds: string[]
    initialViewport?: Viewport
    terrain?: boolean
    geoMap?: Map
    warpedMapLayerBounds?: LngLatBoundsLike
    warpedMapsOpacity?: number
    renderMasks?: boolean
    onlyRenderActiveMap?: boolean
    onmoveend?: (bounds: LngLatBoundsLike) => void
  }

  let {
    mapIds,
    initialViewport,
    geoMap = $bindable<Map | undefined>(),
    warpedMapsOpacity = $bindable(1),
    renderMasks = $bindable(false),
    onlyRenderActiveMap = $bindable(false),
    onmoveend,
    warpedMapLayerBounds = $bindable<LngLatBoundsLike | undefined>()
  }: Props = $props()

  let currentMapIds = $state<SvelteSet<string>>(new SvelteSet([]))

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

  let geoMapContainer: HTMLDivElement
  let warpedMapLayer = $state.raw<WarpedMapLayer>()

  const defaultViewport = {
    center: [0, 0] as [number, number],
    zoom: 1,
    bearing: 0
  }

  const viewport = {
    center: initialViewport?.center || defaultViewport.center,
    zoom: initialViewport?.zoom || defaultViewport.zoom,
    bearing: initialViewport?.bearing || defaultViewport.bearing
  }

  async function addGeoreferencedMap(map: GeoreferencedMap) {
    if (!map.id) {
      throw new Error('Map is missing ID')
    }

    if (warpedMapLayer) {
      await warpedMapLayer.addGeoreferencedMap(map)
      currentMapIds.add(map.id)
    }
  }

  async function removeGeoreferencedMap(mapId: string) {
    if (warpedMapLayer) {
      warpedMapLayer.removeGeoreferencedMapById(mapId)
      currentMapIds.delete(mapId)
    }
  }

  async function setGeoreferencedMaps(maps: GeoreferencedMap[]) {
    const newMapIds = new Set<string>()

    for (const map of maps) {
      if (!map.id) {
        throw new Error('Map is missing ID')
      }

      if (!currentMapIds.has(map.id)) {
        addGeoreferencedMap(map)
      }

      newMapIds.add(map.id)
    }

    for (const currentMapId of currentMapIds) {
      if (!newMapIds.has(currentMapId)) {
        removeGeoreferencedMap(currentMapId)
      }
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
      warpedMapLayer.setMapGcps(getFullMapId(mapId), gcps)
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

      warpedMapLayer.setMapTransformationType(
        getFullMapId(mapId),
        transformationType
      )
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
      }
    }
  }

  function findFirstMapFromEvent(event: maplibregl.MapMouseEvent) {
    if (warpedMapLayer) {
      const mapIds = warpedMapLayer.getWarpedMapList().getMapIds({
        geoPoint: [event.lngLat.lng, event.lngLat.lat],
        onlyVisible: true
      })

      return mapIds[0]
    }
  }

  function handleClick(event: maplibregl.MapMouseEvent) {
    // const mapId = findFirstMapFromEvent(event)
    // if (mapId) {
    //   mapsState.activeMapId = mapId
    //   console.log('click', mapId)
    // }
  }

  function handleContextmenu(event: maplibregl.MapMouseEvent) {
    // const mapId = findFirstMapFromEvent(event)
    // console.log('contextmenu', mapId)
  }

  function handleInsertMap(event: InsertMapEvent) {}

  function handleRemoveMap(event: RemoveMapEvent) {}

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
      geoMap.setStyle(getStyle(uiState.basemapPreset))
      geoMap.moveLayer('warped-map-layer')
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
      style: getStyle(uiState.basemapPreset),
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

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
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

      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
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

<div bind:this={geoMapContainer} class="w-full h-full"></div>
