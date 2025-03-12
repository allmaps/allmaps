<script lang="ts">
  import { onMount } from 'svelte'

  import OLMap from 'ol/Map'
  import View from 'ol/View'
  import { Tile as TileLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ'

  import { fromLonLat } from 'ol/proj'

  import { WarpedMapLayer } from '@allmaps/openlayers'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'

  import {
    getResourceMask,
    getCompleteGcps,
    toGeoreferencedMap,
    getFullMapId
  } from '$lib/shared/maps.js'
  import {
    getExtentViewport,
    getNavPlaceViewport,
    getBboxViewport,
    sortGeoViewports
  } from '$lib/shared/viewport.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'

  import type { GeoreferencedMap } from '@allmaps/annotation'
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
  import type { Viewport } from '$lib/types/shared.js'

  let geoOlMapTarget: HTMLDivElement
  let geoOlMap: OLMap
  let geoTileLayer: TileLayer<XYZ>

  let warpedMapLayer: WarpedMapLayer

  let currentImageId = $state<string | undefined>(undefined)

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const viewportsState = getViewportsState()

  async function initializeMaps(maps: GeoreferencedMap[]) {
    warpedMapLayer.clear()
    for (const map of Object.values(maps)) {
      await addMap(map)
    }

    const geoViewport = getGeoViewport()

    if (geoViewport) {
      const view = geoOlMap.getView()
      view.setZoom(geoViewport.zoom)
      view.setCenter(geoViewport.center)
      view.setRotation(geoViewport.rotation)
    } else {
      const extent = warpedMapLayer.getExtent()

      if (extent) {
        geoOlMap.getView().fit(extent)
      }
    }

    currentImageId = mapsState.connectedImageId
  }

  async function addMap(map: GeoreferencedMap) {
    await warpedMapLayer.addGeoreferencedMap(map)
  }

  function updateResourceMask(mapId: string) {
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
    addMap(toGeoreferencedMap(event.detail.map))
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
      } else if (event.detail.transformation === 'helmert') {
        transformationType = 'helmert'
      }
    }

    warpedMapLayer.setMapTransformationType(
      getFullMapId(mapId),
      transformationType
    )
  }

  function getGeoViewport(): Viewport | undefined {
    let stateGeoViewport: Viewport | undefined
    let navPlaceGeoViewport: Viewport | undefined
    let urlGeoViewport: Viewport | undefined
    let dataGeoViewport: Viewport | undefined

    const view = geoOlMap?.getView()

    if (view) {
      navPlaceGeoViewport = getNavPlaceViewport(view, sourceState.navPlace)
      urlGeoViewport = getBboxViewport(view, urlState.bbox)

      if (mapsMergedState.completeMaps.length) {
        const extent = warpedMapLayer.getExtent()

        if (extent) {
          dataGeoViewport = getExtentViewport(view, extent)
        }
      }
    }

    stateGeoViewport = viewportsState.getViewport({
      view: 'results'
    })

    const geoViewports = sortGeoViewports({
      state: stateGeoViewport,
      navPlace: navPlaceGeoViewport,
      url: urlGeoViewport,
      data: dataGeoViewport
    })

    return geoViewports[0]
  }

  function saveViewport() {
    const geoZoom = geoOlMap.getView().getZoom()
    const geoCenter = geoOlMap.getView().getCenter()
    const geoRotation = geoOlMap.getView().getRotation()

    if (geoZoom && geoCenter) {
      viewportsState.saveViewport(
        {
          view: 'results'
        },
        {
          zoom: geoZoom,
          center: geoCenter,
          rotation: geoRotation
        }
      )
    }
  }

  async function addBackgroundGeoreferenceAnnotation(url: string) {
    const mapIdOrErrors =
      await warpedMapLayer.addGeoreferenceAnnotationByUrl(url)

    const mapIds = mapIdOrErrors.filter(
      (mapIdOrError) => typeof mapIdOrError === 'string'
    )

    warpedMapLayer.sendMapsToBack(mapIds)
  }

  onMount(() => {
    const geoTileSource = new XYZ({
      url: uiState.basemapPreset.url,
      attributions: uiState.basemapPreset.attribution,
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

    $effect(() => {
      if (
        mapsState.connected === true &&
        mapsState.maps &&
        mapsState.connectedImageId !== currentImageId &&
        mapsMergedState.completeMaps.length
      ) {
        // TODO: load maps from other images as well
        initializeMaps(mapsMergedState.completeMaps)
      }
    })

    $effect(() => {
      warpedMapLayer.clear()
      if (urlState.backgroundGeoreferenceAnnotationUrl) {
        addBackgroundGeoreferenceAnnotation(
          urlState.backgroundGeoreferenceAnnotationUrl
        )
      }
    })

    $effect(() => {
      if (urlState.basemapUrl) {
        geoTileSource.setUrl(urlState.basemapUrl)
        geoTileSource.setAttributions(undefined)
      } else {
        geoTileSource.setUrl(uiState.basemapPreset.url)
        geoTileSource.setAttributions(uiState.basemapPreset.attribution)
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
      saveViewport()

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
