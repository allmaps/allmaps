<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import { page } from '$app/state'

  import { Map, Marker } from 'maplibre-gl'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { orange } from '@allmaps/tailwind'
  import { isGeojsonPoint } from '@allmaps/stdlib'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getErrorState } from '$lib/state/error.svelte.js'
  import { getResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'
  import {
    createImageView,
    getImageBearing,
    getPositionRotation
  } from '$lib/shared/image-view.js'

  import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl'
  import type { Point } from '@allmaps/types'
  import type {
    MapWithImageInfo,
    GeojsonRoute,
    PopoverContents
  } from '$lib/shared/types.js'

  import MarkerPopover from '$lib/components/MarkerPopover.svelte'
  import HereIcon from '$lib/images/here.svg?raw'
  import HereOrientationIcon from '$lib/images/here-orientation.svg?raw'
  import Pin from '$lib/images/pin.svg?raw'
  import PinShadow from '$lib/images/pin-shadow.svg?raw'

  import 'maplibre-gl/dist/maplibre-gl.css'

  type Props = {
    mapWithImageInfo: MapWithImageInfo
    geojsonRoute?: GeojsonRoute
    from?: Point
  }

  let { mapWithImageInfo, geojsonRoute, from }: Props = $props()

  const sensorsState = getSensorsState()
  const compassState = getCompassState()
  const uiState = getUiState()
  const errorState = getErrorState()
  const resourceTransformerState = getResourceTransformerState()

  let container: HTMLDivElement
  let map = $state.raw<Map>()
  let loaded = $state(false)
  let interacting = $state(false)
  let warpedMapLayer: WarpedMapLayer
  let positionMarker: Marker
  let fromMarker: Marker
  let fromShadowMarker: Marker
  let positionMarkerAttached = false
  let fromMarkersAttached = false
  let popoverContents = $state<PopoverContents>()

  const imageView = $derived(createImageView(mapWithImageInfo))
  const showFrom = $derived(page.route.id === '/maps/[mapId]/postcard')
  const positionCoordinates = $derived(
    resourceTransformerState.resourcePosition
  )
  const fromCoordinates = $derived(
    showFrom && from && resourceTransformerState.transformer
      ? resourceTransformerState.transformer.transformToResource([
          from[1],
          from[0]
        ])
      : undefined
  )

  function createIcon(svg: string, width?: number, height?: number) {
    const element = document.createElement('div')
    element.innerHTML = svg
    const image = element.querySelector('svg')!
    image.style.width = width ? `${width}px` : 'auto'
    image.style.height = height ? `${height}px` : 'auto'
    return element
  }

  function closeMarkerDialog() {
    popoverContents = undefined
  }

  function updateScreenCoordinates() {
    // These reads must not become dependencies of the marker effects below.
    untrack(() => {
      if (!map) {
        return
      }

      const fromPoint = fromCoordinates
        ? map.project(imageView.toLngLat(fromCoordinates))
        : undefined
      const positionPoint = positionCoordinates
        ? map.project(imageView.toLngLat(positionCoordinates))
        : undefined
      uiState.fromScreenCoordinates = fromPoint
        ? [Math.round(fromPoint.x), Math.round(fromPoint.y)]
        : undefined
      uiState.positionScreenCoordinates = positionPoint
        ? [Math.round(positionPoint.x), Math.round(positionPoint.y)]
        : undefined
    })
  }

  function markerAtPoint(event: MapMouseEvent) {
    if (!map || !loaded || !geojsonRoute?.markers.length) return
    const { x, y } = event.point
    return map.queryRenderedFeatures(
      [
        [x - 10, y - 10],
        [x + 10, y + 10]
      ],
      { layers: ['route-markers'] }
    )[0]
  }

  onMount(() => {
    const newMap = new Map({
      container,
      style: { version: 8, sources: {}, layers: [] },
      maxPitch: 0,
      renderWorldCopies: false,
      attributionControl: false
    })

    map = newMap
    warpedMapLayer = new WarpedMapLayer({ applyMask: false })

    positionMarker = new Marker({
      element: createIcon(HereIcon, 40, 40),
      rotationAlignment: 'map'
    })
    fromMarker = new Marker({
      element: createIcon(Pin, 40),
      offset: [0, -34],
      rotation: 0.2 * (180 / Math.PI),
      rotationAlignment: 'viewport'
    })
    fromShadowMarker = new Marker({
      element: createIcon(PinShadow, undefined, 20),
      offset: [30, 0],
      rotationAlignment: 'viewport'
    })

    newMap.on('error', (event) => {
      errorState.error = event.error
    })

    newMap.once('load', () => {
      newMap.addLayer(warpedMapLayer)
      newMap.addSource('route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      newMap.addSource('route-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      newMap.addLayer({
        id: 'route-outline',
        type: 'line',
        source: 'route',
        paint: { 'line-color': 'white', 'line-width': 5 }
      })
      newMap.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        paint: { 'line-color': orange, 'line-width': 3 }
      })
      newMap.addLayer({
        id: 'route-markers-outline',
        type: 'circle',
        source: 'route-markers',
        paint: { 'circle-color': 'white', 'circle-radius': 9 }
      })
      newMap.addLayer({
        id: 'route-markers',
        type: 'circle',
        source: 'route-markers',
        paint: {
          'circle-color': 'white',
          'circle-radius': 4,
          'circle-stroke-color': orange,
          'circle-stroke-width': 4
        }
      })
      loaded = true
    })

    newMap.on('render', updateScreenCoordinates)

    newMap.on('rotate', (event) => {
      if (event.originalEvent) {
        compassState.compassMode = 'custom'
        compassState.customRotation =
          -newMap.getBearing() - (compassState.selectedMapBearing ?? 0)
      }
    })

    newMap.on('click', (event) => {
      const feature = markerAtPoint(event)
      if (!feature) {
        closeMarkerDialog()
        return
      }
      const properties = feature.properties
      popoverContents = {
        title:
          typeof properties.title === 'string' ? properties.title : undefined,
        image:
          typeof properties.image === 'string' ? properties.image : undefined,
        url: typeof properties.url === 'string' ? properties.url : undefined,
        description:
          typeof properties.description === 'string'
            ? properties.description
            : undefined
      }
    })

    newMap.on('mousemove', (event) => {
      if (newMap.isMoving()) {
        return
      }

      const cursor = markerAtPoint(event) ? 'pointer' : ''

      if (newMap.getCanvas().style.cursor !== cursor) {
        newMap.getCanvas().style.cursor = cursor
      }
    })

    newMap.on('movestart', (event) => {
      if (event.originalEvent) {
        interacting = true
      }

      closeMarkerDialog()
      newMap.getCanvas().style.cursor = ''
    })

    newMap.on('moveend', () => {
      interacting = false

      if (!loaded) {
        return
      }

      // Match the image view's previous constrainOnlyCenter behavior.
      const [southwest, northeast] = imageView.bounds
      const center = newMap.getCenter()
      const longitude = Math.max(
        southwest[0],
        Math.min(northeast[0], center.lng)
      )
      const latitude = Math.max(
        southwest[1],
        Math.min(northeast[1], center.lat)
      )

      if (longitude !== center.lng || latitude !== center.lat) {
        newMap.setCenter([longitude, latitude])
      }
    })

    const resizeObserver = new ResizeObserver(() => newMap.resize())
    resizeObserver.observe(container)

    return () => {
      loaded = false
      resizeObserver.disconnect()
      positionMarker.remove()
      fromMarker.remove()
      fromShadowMarker.remove()
      positionMarkerAttached = false
      fromMarkersAttached = false
      newMap.remove()
      map = undefined
    }
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    warpedMapLayer.clear()
    warpedMapLayer.addImageInfos([mapWithImageInfo.imageInfo])
    warpedMapLayer.addGeoreferencedMap(imageView.map)
    // Allow the full image to fit even when its coarsest tile level is large.
    map.setMinZoom(0)
    map.setMaxZoom(imageView.maxZoom)
    map.fitBounds(imageView.bounds, { padding: 10, duration: 0, bearing: 0 })
    map.setMinZoom(Math.min(map.getZoom(), imageView.minZoom))
    // Location updates move the marker without resetting a user's camera.
    untrack(() => {
      const center =
        fromCoordinates ??
        (resourceTransformerState.resourcePositionInsideResource
          ? positionCoordinates
          : undefined)
      if (center) {
        map?.jumpTo({
          center: imageView.toLngLat(center),
          zoom: imageView.positionZoom
        })
      }
      const bearing = getImageBearing(
        compassState.compassMode,
        compassState.selectedMapBearing,
        sensorsState.orientationAlpha
      )
      if (bearing !== undefined) map?.setBearing(bearing)
      closeMarkerDialog()
    })
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    const transformer = resourceTransformerState.transformer
    const route = geojsonRoute?.route
    const coordinates =
      route && transformer
        ? transformer
            .transformToResource(
              route.coordinates.map((point): Point => [point[0], point[1]])
            )
            .map(imageView.toLngLat)
        : []

    map.getSource<GeoJSONSource>('route')?.setData({
      type: 'FeatureCollection',
      features: coordinates.length
        ? [
            {
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates }
            }
          ]
        : []
    })

    map.getSource<GeoJSONSource>('route-markers')?.setData({
      type: 'FeatureCollection',
      features: transformer
        ? (geojsonRoute?.markers ?? []).flatMap((marker) => {
            if (!isGeojsonPoint(marker.geometry)) return []
            const coordinates = imageView.toLngLat(
              transformer.transformToResource(
                marker.geometry.coordinates as Point
              )
            )
            return [
              {
                type: 'Feature' as const,
                properties: marker.properties ?? {},
                geometry: { type: 'Point' as const, coordinates }
              }
            ]
          })
        : []
    })
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    if (positionCoordinates) {
      positionMarker.setLngLat(imageView.toLngLat(positionCoordinates))
      if (!positionMarkerAttached) {
        positionMarker.addTo(map)
        positionMarkerAttached = true
      }
    } else if (positionMarkerAttached) {
      positionMarker.remove()
      positionMarkerAttached = false
    }
    updateScreenCoordinates()
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    positionMarker
      .getElement()
      .replaceChildren(
        ...createIcon(
          sensorsState.hasOrientation ? HereOrientationIcon : HereIcon,
          40,
          40
        ).childNodes
      )
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    if (
      sensorsState.orientationAlpha !== undefined &&
      compassState.selectedMapBearing !== undefined
    ) {
      positionMarker.setRotation(
        getPositionRotation(
          compassState.compassMode,
          compassState.selectedMapBearing,
          sensorsState.orientationAlpha
        )
      )
    }
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    if (fromCoordinates) {
      const coordinates = imageView.toLngLat(fromCoordinates)
      fromShadowMarker.setLngLat(coordinates)
      fromMarker.setLngLat(coordinates)
      if (!fromMarkersAttached) {
        fromShadowMarker.addTo(map)
        fromMarker.addTo(map)
        fromMarkersAttached = true
      }
    } else if (fromMarkersAttached) {
      fromMarker.remove()
      fromShadowMarker.remove()
      fromMarkersAttached = false
    }
    updateScreenCoordinates()
  })

  $effect(() => {
    if (!map || !loaded) {
      return
    }

    const mode = compassState.compassMode
    const bearing = getImageBearing(
      mode,
      mode === 'image' ? undefined : compassState.selectedMapBearing,
      mode === 'follow-orientation' ? sensorsState.orientationAlpha : undefined
    )
    if (bearing === undefined) {
      return
    }

    // Ignore equivalent angles and let active gestures finish uninterrupted.
    const difference =
      ((((bearing - map.getBearing() + 180) % 360) + 360) % 360) - 180
    if (interacting || Math.abs(difference) < 0.01) return
    map.easeTo({ bearing, duration: 100 })
  })
</script>

<div bind:this={container} class="w-full h-full"></div>

<MarkerPopover {popoverContents} />
