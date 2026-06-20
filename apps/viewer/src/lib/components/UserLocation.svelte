<script lang="ts">
  import { fade } from 'svelte/transition'

  import { GeolocateControl, Marker } from 'maplibre-gl'

  import { pointInBbox } from '@allmaps/stdlib'
  import { lonLatProjection, webMercatorToLonLat } from '@allmaps/project'

  import { getUiState } from '$lib/state/ui.svelte.js'

  import type { Map as MapLibreMap } from 'maplibre-gl'

  import type { WarpedMap } from '@allmaps/render'
  import type { Point } from '@allmaps/types'

  const positionOptions: PositionOptions = {
    enableHighAccuracy: true
  }

  type Props = {
    map?: MapLibreMap
    view?: 'map' | 'image'
    selectedWarpedMap?: WarpedMap
    duration?: number
  }

  type GeolocateControlWithWatchState = GeolocateControl & {
    _lastKnownPosition?: GeolocationPosition
    _watchState?: string
  }

  let { map, view = 'map', selectedWarpedMap, duration = 400 }: Props = $props()

  const uiState = getUiState()

  let geolocateControl: GeolocateControl | undefined
  let geolocateControlContainer: HTMLElement | undefined
  let userLocationMarkerElement = $state<HTMLElement>()
  let userLocationMarker: Marker | undefined
  let userLocationMarkerLngLat = $state<Point>()
  let userPosition = $state<GeolocationPosition>()
  let locateUserRetryHandle: number | undefined
  let imageGeolocateRequestId = 0
  let maplibreGeolocationActive = $state(false)
  let suppressMaplibreGeolocationEvents = false

  function getPositionLngLat(position: GeolocationPosition): Point {
    return [position.coords.longitude, position.coords.latitude]
  }

  function getUserLocationLngLatForView(
    position: GeolocationPosition,
    currentView = view,
    currentSelectedWarpedMap = selectedWarpedMap
  ): Point | undefined {
    const lngLat = getPositionLngLat(position)

    if (currentView === 'map') {
      return lngLat
    }

    if (currentView !== 'image' || !currentSelectedWarpedMap) {
      return undefined
    }

    try {
      const resourcePoint =
        currentSelectedWarpedMap.projectedTransformer.transformToResource(
          lngLat,
          {
            projection: lonLatProjection
          }
        )

      if (
        !pointInBbox(
          resourcePoint,
          currentSelectedWarpedMap.resourceFullMaskBbox
        )
      ) {
        return undefined
      }

      const projectedGeoPoint =
        currentSelectedWarpedMap.projectedTransformer.transformToProjectedGeo(
          resourcePoint
        )

      return webMercatorToLonLat(projectedGeoPoint) as Point
    } catch (err) {
      console.warn('Failed to transform user location', err)
    }
  }

  function updateUserLocationMarker(
    position = userPosition,
    currentView = view,
    currentSelectedWarpedMap = selectedWarpedMap
  ) {
    if (!map || !position) {
      removeUserLocationMarker()
      return
    }

    if (currentView === 'image' && !currentSelectedWarpedMap) {
      return
    }

    const lngLat = getUserLocationLngLatForView(
      position,
      currentView,
      currentSelectedWarpedMap
    )

    if (!lngLat) {
      removeUserLocationMarker()
      return
    }

    userLocationMarkerLngLat = lngLat
  }

  function removeUserLocationMarker({ immediate = false } = {}) {
    if (!immediate && userLocationMarkerElement) {
      userLocationMarkerLngLat = undefined
      return
    }

    userLocationMarker?.remove()
    userLocationMarker = undefined
    userLocationMarkerLngLat = undefined
    userLocationMarkerElement = undefined
  }

  function handleUserLocationMarkerOutroEnd() {
    if (!userLocationMarkerLngLat) {
      removeUserLocationMarker({ immediate: true })
    }
  }

  function clearLocateUserRetry() {
    if (locateUserRetryHandle !== undefined) {
      window.clearTimeout(locateUserRetryHandle)
      locateUserRetryHandle = undefined
    }
  }

  $effect(() => {
    if (!map || !userLocationMarkerElement || !userLocationMarkerLngLat) {
      return
    }

    if (!userLocationMarker) {
      userLocationMarker = new Marker({
        element: userLocationMarkerElement,
        anchor: 'center'
      })
        .setLngLat(userLocationMarkerLngLat)
        .addTo(map)
      return
    }

    userLocationMarker.setLngLat(userLocationMarkerLngLat)
  })

  function centerUserLocationInImageView() {
    if (!map || view !== 'image' || !userPosition) {
      return
    }

    const lngLat = getUserLocationLngLatForView(userPosition)

    if (lngLat) {
      map.easeTo({
        center: lngLat,
        duration
      })
    }
  }

  function isMaplibreGeolocationTracking() {
    const watchState = (geolocateControl as GeolocateControlWithWatchState)
      ?._watchState

    return (
      maplibreGeolocationActive ||
      (watchState !== undefined && watchState !== 'OFF')
    )
  }

  function stopMaplibreGeolocationWithoutCamera({
    keepLocatingUser = false,
    keepMarker = false
  } = {}) {
    const control = geolocateControl as
      | GeolocateControlWithWatchState
      | undefined

    if (!control || !isMaplibreGeolocationTracking()) {
      return
    }

    suppressMaplibreGeolocationEvents = true

    try {
      if (control._watchState === 'BACKGROUND') {
        control._watchState = 'BACKGROUND_ERROR'
      }

      if (control._watchState && control._watchState !== 'OFF') {
        control.trigger()
      }
    } finally {
      suppressMaplibreGeolocationEvents = false
    }

    maplibreGeolocationActive = false
    if (!keepLocatingUser) {
      uiState.locatingUser = false
    }
    if (!keepMarker) {
      removeUserLocationMarker()
    }
  }

  export function locateUser() {
    if (uiState.locatingUser) {
      stopLocatingUser()
      return
    }

    if (view === 'image') {
      locateUserInImageView()
      return
    }

    startMaplibreGeolocation()
  }

  function startMaplibreGeolocation() {
    const triggered = geolocateControl?.trigger()

    if (triggered === false) {
      locateUserRetryHandle ??= window.setTimeout(() => {
        locateUserRetryHandle = undefined
        geolocateControl?.trigger()
      }, 250)
    }
  }

  function stopLocatingUser() {
    clearLocateUserRetry()
    imageGeolocateRequestId += 1
    stopMaplibreGeolocationWithoutCamera()
    maplibreGeolocationActive = false
    uiState.locatingUser = false
    userPosition = undefined
    removeUserLocationMarker()
  }

  function locateUserInImageView() {
    if (!('geolocation' in navigator)) {
      console.warn('Geolocation API is not available')
      uiState.locatingUser = false
      return
    }

    uiState.locatingUser = true
    const requestId = ++imageGeolocateRequestId

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId === imageGeolocateRequestId && uiState.locatingUser) {
          handleImageViewGeolocate(position)
        }
      },
      (error) => {
        if (requestId === imageGeolocateRequestId) {
          handleDirectGeolocateError(error)
        }
      },
      positionOptions
    )
  }

  $effect(() => {
    if (map && userPosition && uiState.locatingUser) {
      updateUserLocationMarker(userPosition, view, selectedWarpedMap)
    }
  })

  $effect(() => {
    if (view === 'image' && isMaplibreGeolocationTracking()) {
      stopMaplibreGeolocationWithoutCamera({
        keepLocatingUser: true,
        keepMarker: true
      })
      updateUserLocationMarker(userPosition, view, selectedWarpedMap)
    }
  })

  function handleGeolocate(event: GeolocationPosition & { type: string }) {
    if (suppressMaplibreGeolocationEvents) {
      return
    }

    userPosition = event
    uiState.locatingUser = true
    updateUserLocationMarker()
    centerUserLocationInImageView()
  }

  function handleImageViewGeolocate(position: GeolocationPosition) {
    userPosition = position
    uiState.locatingUser = true
    updateUserLocationMarker()
    centerUserLocationInImageView()
  }

  function handleGeolocateError(event: { error?: Error }) {
    if (suppressMaplibreGeolocationEvents) {
      return
    }

    uiState.locatingUser = false
    if (event.error) {
      console.warn('Unable to determine user location', event.error)
    }
  }

  function handleDirectGeolocateError(error: GeolocationPositionError) {
    uiState.locatingUser = false
    console.warn('Unable to determine user location', error)
  }

  function handleTrackUserLocationStart() {
    if (suppressMaplibreGeolocationEvents) {
      return
    }

    maplibreGeolocationActive = true
    uiState.locatingUser = true
  }

  function handleTrackUserLocationEnd() {
    if (suppressMaplibreGeolocationEvents) {
      return
    }

    const watchState = (geolocateControl as GeolocateControlWithWatchState)
      ?._watchState
    const receivingLocation = watchState !== undefined && watchState !== 'OFF'

    maplibreGeolocationActive = receivingLocation
    uiState.locatingUser = receivingLocation

    if (!receivingLocation) {
      removeUserLocationMarker()
    }
  }

  $effect(() => {
    if (!map) {
      return
    }

    geolocateControl = new GeolocateControl({
      positionOptions,
      fitBoundsOptions: {
        maxZoom: 15,
        duration
      },
      trackUserLocation: true,
      showUserLocation: false,
      showAccuracyCircle: false
    })
    geolocateControl.on('geolocate', handleGeolocate)
    geolocateControl.on('error', handleGeolocateError)
    geolocateControl.on('trackuserlocationstart', handleTrackUserLocationStart)
    geolocateControl.on('trackuserlocationend', handleTrackUserLocationEnd)
    geolocateControlContainer = geolocateControl.onAdd(map)
    geolocateControlContainer.hidden = true

    return () => {
      clearLocateUserRetry()

      removeUserLocationMarker({ immediate: true })
      uiState.locatingUser = false

      if (geolocateControl) {
        geolocateControl.off('geolocate', handleGeolocate)
        geolocateControl.off('error', handleGeolocateError)
        geolocateControl.off(
          'trackuserlocationstart',
          handleTrackUserLocationStart
        )
        geolocateControl.off('trackuserlocationend', handleTrackUserLocationEnd)
        geolocateControl.onRemove()
        geolocateControl = undefined
      }
    }
  })
</script>

{#if userLocationMarkerLngLat}
  <div
    transition:fade={{ duration: 200 }}
    onoutroend={handleUserLocationMarkerOutroEnd}
    bind:this={userLocationMarkerElement}
    aria-label="Current location"
    class="absolute grid size-5 place-items-center rounded-full bg-white shadow-[0_1px_4px_rgb(0_0_0/0.35)]"
  >
    <div class="size-3 rounded-full bg-pink"></div>
  </div>
{/if}
