<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'

  import { getFullMapId } from '$lib/shared/maps.js'
  import { sortGeoViewports } from '$lib/shared/viewport.js'

  import { UiEvents } from '$lib/shared/ui-events.js'
  import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

  import Geo from '$lib/components/maplibre/Geo.svelte'

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { Point, Bbox } from '@allmaps/types'

  import type { ClickedItemEvent } from '$lib/types/events.js'
  import type { Viewport } from '$lib/types/shared.js'

  let geoMap = $state.raw<MapLibreMap>()
  let warpedMapLayerBounds = $state.raw<LngLatBoundsLike>()

  const uiState = getUiState()
  const viewportsState = getViewportsState()
  const scopeState = getScopeState()

  const geoViewport = $derived(
    viewportsState.getViewport({
      view: 'results'
    })
  )

  // async function setGeoreferenceAnnotation(
  //   annotation: Annotation | AnnotationPage
  // ) {
  //   if (!geoMap || !geoMapReady) {
  //     return
  //   }

  //   // warpedMapLayer.clear()
  //   // await warpedMapLayer.addGeoreferenceAnnotation(annotation)
  //   currentActiveMapId = mapsState.activeMapId

  //   const geoViewport = getGeoViewport()

  //   if (geoViewport) {
  //     geoMap.flyTo({
  //       ...geoViewport,
  //       duration: 0,
  //       padding: MAPLIBRE_PADDING
  //     })
  //   } else {
  //     // const bounds = warpedMapLayer.getBounds()
  //     // if (bounds) {
  //     //   geoMap.fitBounds(bounds, {
  //     //     duration: 0,
  //     //     padding: MAPLIBRE_PADDING
  //     //   })
  //     // }
  //   }
  // }

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

  function handleLastClickedItem(event: ClickedItemEvent) {
    if (event.detail.type === 'map') {
      const mapId = getFullMapId(event.detail.mapId)
      // warpedMapLayer.bringMapsToFront([mapId])
      // const warpedMap = warpedMapLayer.getWarpedMap(mapId)
      // if (warpedMap && geoMap) {
      //   geoMap.fitBounds(warpedMap.projectedGeoMaskBbox, {
      //     duration: 200,
      //     padding: MAPLIBRE_PADDING
      //   })
      // }
    }
  }

  function handleZoomToExtent() {
    if (geoMap && warpedMapLayerBounds) {
      geoMap.fitBounds(warpedMapLayerBounds, {
        duration: 300,
        padding: MAPLIBRE_PADDING
      })
    }
  }

  function handleFitBbox(event: CustomEvent<Bbox>) {
    geoMap?.fitBounds(event.detail, {
      duration: 300,
      padding: MAPLIBRE_PADDING
    })
  }

  function handleSetCenter(event: CustomEvent<Point>) {
    geoMap?.setCenter(event.detail, {
      duration: 300
    })
  }

  function handleToggleRenderMasks() {
    uiState.resultsOptions.renderMasks = !uiState.resultsOptions.renderMasks
  }

  $effect(() => {
    if (geoMap && warpedMapLayerBounds) {
      geoMap.fitBounds(warpedMapLayerBounds, {
        duration: 200,
        padding: MAPLIBRE_PADDING
      })
    }
  })

  onMount(() => {
    uiState.addEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)
    uiState.addEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
    uiState.addEventListener(UiEvents.FIT_BBOX, handleFitBbox)
    uiState.addEventListener(UiEvents.SET_CENTER, handleSetCenter)
    uiState.addEventListener(
      UiEvents.TOGGLE_RENDER_MASKS,
      handleToggleRenderMasks
    )

    return () => {
      saveViewport()

      uiState.removeEventListener(UiEvents.CLICKED_ITEM, handleLastClickedItem)
      uiState.removeEventListener(UiEvents.ZOOM_TO_EXTENT, handleZoomToExtent)
      uiState.removeEventListener(UiEvents.FIT_BBOX, handleFitBbox)
      uiState.removeEventListener(UiEvents.SET_CENTER, handleSetCenter)
      uiState.removeEventListener(
        UiEvents.TOGGLE_RENDER_MASKS,
        handleToggleRenderMasks
      )
    }
  })
</script>

<Geo
  bind:geoMap
  bind:warpedMapLayerBounds
  mapIds={scopeState.mapIds}
  initialViewport={geoViewport}
  warpedMapsOpacity={uiState.resultsOptions.warpedMapLayerOpacity}
  renderMasks={uiState.resultsOptions.renderMasks}
/>
