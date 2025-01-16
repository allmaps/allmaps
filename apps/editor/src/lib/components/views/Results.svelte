<script lang="ts">
  import { onMount } from 'svelte'

  import OLMap from 'ol/Map'
  import View from 'ol/View'
  import { Tile as TileLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ'

  import { fromLonLat } from 'ol/proj'

  import { WarpedMapLayer } from '@allmaps/openlayers'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import {
    getResourceMask,
    getCompleteGcps,
    toGeoreferencedMap,
    getFullMapId
  } from '$lib/shared/maps.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { TransformationType } from '@allmaps/transform'

  import type {
    InsertMapEvent,
    RemoveMapEvent,
    InsertResourceMaskPointEvent,
    ReplaceResourceMaskPointEvent,
    RemoveResourceMaskPointEvent,
    InsertGcpEvent,
    ReplaceGcpEvent,
    RemoveGcpEvent,
    SetTransformationEvent
  } from '$lib/types/events.js'
  import type { DbMaps, DbMap } from '$lib/types/maps.js'

  let geoOlMapTarget: HTMLDivElement
  let geoOlMap: OLMap
  let geoTileLayer: TileLayer<XYZ>

  let warpedMapLayer: WarpedMapLayer

  let currentImageId = $state<string | undefined>(undefined)

  const mapsState = getMapsState()
  const uiState = getUiState()

  // async function updateImage(imageId: string | undefined) {
  //   if (imageId) {
  //   }
  // }

  async function initializeMaps(maps: DbMaps) {
    warpedMapLayer.clear()
    for (const map of Object.values(maps)) {
      await addMap(map)
    }

    const extent = warpedMapLayer.getExtent()
    if (extent) {
      geoOlMap.getView().fit(extent)
    }

    currentImageId = mapsState.connectedImageId
  }

  async function addMap(map: DbMap) {
    await warpedMapLayer.addGeoreferencedMap(toGeoreferencedMap(map))
  }

  function updateResourceMask(mapId: string) {
    console.log('n u het masker updaten')
    const map = mapsState.getMapById(mapId)
    if (map) {
      const resourceMask = getResourceMask(map)
      warpedMapLayer.setMapResourceMask(getFullMapId(mapId), resourceMask)
    }
  }

  function updateGcps(mapId: string) {
    const map = mapsState.getMapById(mapId)
    if (map) {
      const gcps = getCompleteGcps(map)
      warpedMapLayer.setMapGcps(getFullMapId(mapId), gcps)
    }
  }

  function handleInsertMap(event: InsertMapEvent) {
    addMap(event.detail.map)
  }

  function handleRemoveMap(event: RemoveMapEvent) {
    const mapId = event.detail.mapId
    warpedMapLayer.removeGeoreferencedMapById(getFullMapId(mapId))
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

  function handleSetTransformation(event: SetTransformationEvent) {
    const mapId = event.detail.mapId
    let transformationType: TransformationType = 'polynomial1'

    if (event.detail.transformation) {
      if (event.detail.transformation === 'polynomial') {
        transformationType = 'polynomial1'
      } else if (event.detail.transformation === 'polynomial1') {
        transformationType = 'polynomial1'
      } else if (event.detail.transformation === 'polynomial2') {
        transformationType = 'polynomial2'
      } else if (event.detail.transformation === 'polynomial3') {
        transformationType = 'polynomial3'
      } else if (event.detail.transformation === 'thinPlateSpline') {
        transformationType = 'thinPlateSpline'
      }
    }

    warpedMapLayer.setMapTransformationType(
      getFullMapId(mapId),
      transformationType
    )
  }

  onMount(() => {
    const geoTileSource = new XYZ({
      url: uiState.presetBaseMap.url,
      attributions: uiState.presetBaseMap.attribution,
      maxZoom: 19
    })

    geoTileLayer = new TileLayer({
      source: geoTileSource
    })

    warpedMapLayer = new WarpedMapLayer()

    geoOlMap = new OLMap({
      layers: [
        geoTileLayer,
        // @ts-expect-error @allmaps/openlayers does not yet include types for multiple OpenLayers version
        warpedMapLayer
      ],
      target: geoOlMapTarget,
      view: new View({
        center: fromLonLat([0, 0]),
        zoom: 2,
        maxZoom: 22
      }),
      controls: []
    })

    // $effect(() => {
    //   if (sourceState.activeImageId) {
    //     updateImage(sourceState.activeImageId)
    //   }
    // })

    $effect(() => {
      if (
        mapsState.connected === true &&
        mapsState.maps &&
        mapsState.connectedImageId !== currentImageId
      ) {
        initializeMaps(mapsState.maps)
      }
    })

    mapsState.addEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
    mapsState.addEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

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

    mapsState.addEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
    mapsState.addEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
    mapsState.addEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

    mapsState.addEventListener(
      MapsEvents.SET_TRANSFORMATION,
      handleSetTransformation
    )

    return () => {
      warpedMapLayer.clear()
      warpedMapLayer.dispose()

      mapsState.removeEventListener(MapsEvents.INSERT_MAP, handleInsertMap)
      mapsState.removeEventListener(MapsEvents.REMOVE_MAP, handleRemoveMap)

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

      mapsState.removeEventListener(MapsEvents.INSERT_GCP, handleInsertGcp)
      mapsState.removeEventListener(MapsEvents.REPLACE_GCP, handleReplaceGcp)
      mapsState.removeEventListener(MapsEvents.REMOVE_GCP, handleRemoveGcp)

      mapsState.removeEventListener(
        MapsEvents.SET_TRANSFORMATION,
        handleSetTransformation
      )
    }
  })
</script>

<div bind:this={geoOlMapTarget} class="w-full h-full"></div>
