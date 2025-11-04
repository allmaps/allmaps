<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { ProjectedGcpTransformer, lonLatProjection } from '@allmaps/project'
  import { computeBbox, combineBboxes } from '@allmaps/stdlib'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getViewportsState } from '$lib/state/viewports.svelte.js'
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import {
    getNavPlaceViewport,
    getBboxViewport,
    sortGeoViewports
  } from '$lib/shared/viewport.js'

  import { UiEvents } from '$lib/shared/ui-events.js'
  import {
    MAPLIBRE_PADDING,
    MAPLIBRE_FIT_BOUNDS_DURATION
  } from '$lib/shared/constants.js'

  import Geo from '$lib/components/maplibre/Geo.svelte'

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { Point, Bbox } from '@allmaps/types'
  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { ClickedItemEvent } from '$lib/types/events.js'
  import type { Viewport } from '$lib/types/shared.js'

  let geoMap = $state.raw<MapLibreMap>()
  let warpedMapLayerBounds = $state.raw<LngLatBoundsLike>()

  const uiState = getUiState()
  const viewportsState = getViewportsState()
  const scopeState = getScopeState()
  const sourceState = getSourceState()
  const urlState = getUrlState()

  const geoViewport = $derived(getGeoViewport())

  let warpedMapLayer = $state.raw<WarpedMapLayer>()

  function computeGeoreferencedMapBbox(map: GeoreferencedMap) {
    const transformer = ProjectedGcpTransformer.fromGeoreferencedMap(map, {
      projection: lonLatProjection
    })
    const geoMask = transformer.transformToGeo([map.resourceMask])
    return computeBbox(geoMask)
  }

  function getGeoViewport(): Viewport | undefined {
    let stateGeoViewport: Viewport | undefined
    let navPlaceGeoViewport: Viewport | undefined
    let urlGeoViewport: Viewport | undefined
    let dataGeoViewport: Viewport | undefined

    navPlaceGeoViewport = getNavPlaceViewport(sourceState.navPlace)
    urlGeoViewport = getBboxViewport(urlState.params.bbox)

    if (scopeState.maps) {
      const bboxes: Bbox[] = []
      for (const map of scopeState.maps) {
        const bbox = computeGeoreferencedMapBbox(map)
        bboxes.push(bbox)
      }
      if (bboxes.length > 0) {
        const combinedBbox = combineBboxes(...bboxes)
        dataGeoViewport = getBboxViewport(combinedBbox)
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
    // TODO: can this be removed?
    // This is now handled in an $effect
    //
    // if (event.detail.type === 'map') {
    // const mapId = getFullMapId(event.detail.mapId)
    // warpedMapLayer.bringMapsToFront([mapId])
    // const warpedMap = warpedMapLayer.getWarpedMap(mapId)
    // if (warpedMap && geoMap) {
    //   geoMap.fitBounds(warpedMap.projectedGeoMaskBbox, {
    //     duration: 200,
    //     padding: MAPLIBRE_PADDING
    //   })
    // }
    // }
  }

  function handleZoomToExtent() {
    if (geoMap && warpedMapLayerBounds) {
      geoMap.fitBounds(warpedMapLayerBounds, {
        duration: MAPLIBRE_FIT_BOUNDS_DURATION,
        padding: MAPLIBRE_PADDING
      })
    }
  }

  function handleFitBbox(event: CustomEvent<Bbox>) {
    geoMap?.fitBounds(event.detail, {
      duration: MAPLIBRE_FIT_BOUNDS_DURATION,
      padding: MAPLIBRE_PADDING
    })
  }

  function handleSetCenter(event: CustomEvent<Point>) {
    geoMap?.setCenter(event.detail, {
      duration: MAPLIBRE_FIT_BOUNDS_DURATION
    })
  }

  function handleToggleRenderMasks() {
    uiState.resultsOptions.renderMasks = !uiState.resultsOptions.renderMasks
  }

  $effect(() => {
    if (scopeState.activeMapId && geoMap) {
      const bbox = warpedMapLayer?.getMapsBbox([scopeState.activeMapId], {
        projection: lonLatProjection
      })

      if (bbox) {
        const bounds = [
          [bbox[0], bbox[1]],
          [bbox[2], bbox[3]]
        ] as LngLatBoundsLike

        warpedMapLayer?.bringMapsToFront([scopeState.activeMapId])

        geoMap.fitBounds(bounds, {
          duration: MAPLIBRE_FIT_BOUNDS_DURATION,
          padding: MAPLIBRE_PADDING
        })
      }
    }
  })

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
  bind:warpedMapLayer
  mapIds={scopeState.mapIds}
  initialViewport={geoViewport}
  warpedMapsOpacity={uiState.resultsOptions.warpedMapLayerOpacity}
  renderMasks={uiState.resultsOptions.renderMasks}
/>
