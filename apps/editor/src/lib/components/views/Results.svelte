<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getMapsMergedState } from '$lib/state/maps-merged.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'

  import {
    getResourceMask,
    getCompleteGcps,
    toGeoreferencedMap,
    getFullMapId
  } from '$lib/shared/maps.js'
  import {
    // getExtentViewport,
    // getNavPlaceViewport,
    // getBboxViewport,
    sortGeoViewports
  } from '$lib/shared/viewport.js'
  import { MapsEvents } from '$lib/shared/maps-events.js'
  import { UiEvents } from '$lib/shared/ui-events.js'
  import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

  import Geo from '$lib/components/maplibre/Geo.svelte'

  import type {
    Annotation,
    AnnotationPage,
    GeoreferencedMap
  } from '@allmaps/annotation'
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
    SetTransformationEvent,
    ClickedItemEvent
  } from '$lib/types/events.js'
  import type { Viewport } from '$lib/types/shared.js'

  let geoMap = $state.raw<MapLibreMap>()

  let warpedMapLayer: WarpedMapLayer

  let geoMapReady = $state(false)

  // let currentImageId = $state<string>()
  let currentActiveMapId = $state<string>()

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const mapsMergedState = getMapsMergedState()
  const uiState = getUiState()
  const urlState = getUrlState()
  const viewportsState = getViewportsState()
  const scopeState = getScopeState()

  async function setGeoreferenceAnnotation(
    annotation: Annotation | AnnotationPage
  ) {
    if (!geoMap) {
      return
    }

    warpedMapLayer.clear()
    await warpedMapLayer.addGeoreferenceAnnotation(annotation)
    currentActiveMapId = mapsState.activeMapId

    const geoViewport = getGeoViewport()

    if (geoViewport) {
      geoMap.setZoom(geoViewport.zoom)
      geoMap.setCenter(geoViewport.center)
      geoMap.setBearing(geoViewport.bearing)
    } else {
      const bounds = warpedMapLayer.getBounds()

      if (bounds) {
        geoMap.fitBounds(bounds, {
          padding: MAPLIBRE_PADDING
        })
      }
    }

    // currentImageId = mapsState.connectedImageId
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

    // const view = geoMap?.getView()

    // if (view) {
    //   navPlaceGeoViewport = getNavPlaceViewport(view, sourceState.navPlace)
    //   urlGeoViewport = getBboxViewport(view, urlState.bbox)

    //   if (mapsMergedState.completeMaps.length) {
    //     const extent = warpedMapLayer.getBounds()

    //     if (extent) {
    //       dataGeoViewport = getExtentViewport(view, extent)
    //     }
    //   }
    // }

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
    if (!geoMap) {
      return
    }

    const geoZoom = geoMap.getZoom()
    const geoCenter = geoMap.getCenter().toArray()
    const geoBearing = geoMap.getBearing()

    if (geoZoom && geoCenter) {
      viewportsState.saveViewport(
        {
          view: 'results'
        },
        {
          zoom: geoZoom,
          center: geoCenter,
          bearing: geoBearing
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

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (event.detail.type === 'map') {
      const mapId = getFullMapId(event.detail.mapId)
      // warpedMapLayer.bringMapsToFront([mapId])
      const warpedMap = warpedMapLayer.getWarpedMap(mapId)
      console.log('clicked', mapId, warpedMap)
      if (warpedMap && geoMap) {
        geoMap.fitBounds(warpedMap.projectedGeoMaskBbox, {
          duration: 200,
          padding: MAPLIBRE_PADDING
        })
      }
    }
  }

  $effect(() => {
    if (geoMap) {
      // const geoTileSource = new XYZ({
      //   url: uiState.basemapPreset.url,
      //   attributions: uiState.basemapPreset.attribution,
      //   maxZoom: 19
      // })

      // geoTileLayer = new TileLayer({
      //   source: geoTileSource
      // })

      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      geoMap.addLayer(warpedMapLayer)

      geoMapReady = true
    }
  })

  $effect(() => {
    if (
      geoMapReady &&
      mapsState.connected === true &&
      //     // mapsState.connectedImageId !== currentImageId &&
      scopeState.annotation
    ) {
      setGeoreferenceAnnotation(scopeState.annotation)
    }
  })

  // $effect(() => {
  //   if (urlState.backgroundGeoreferenceAnnotationUrl) {
  //     addBackgroundGeoreferenceAnnotation(
  //       urlState.backgroundGeoreferenceAnnotationUrl
  //     )
  //   }
  // })

  // $effect(() => {
  //   if (urlState.basemapUrl) {
  //     // geoTileSource.setUrl(urlState.basemapUrl)
  //     // geoTileSource.setAttributions(undefined)
  //   } else {
  //     // geoTileSource.setUrl(uiState.basemapPreset.url)
  //     // geoTileSource.setAttributions(uiState.basemapPreset.attribution)
  //   }
  // })

  // $effect(() => {
  //   if (
  //     mapsState.activeMapId &&
  //     currentActiveMapId &&
  //     mapsState.activeMapId !== currentActiveMapId
  //   ) {
  //     currentActiveMapId = mapsState.activeMapId
  //   }

  onMount(() => {
    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)

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

      uiState.removeEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)

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

<Geo bind:geoMap />
