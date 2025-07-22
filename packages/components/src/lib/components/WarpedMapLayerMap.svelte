<script lang="ts">
  import { onMount } from 'svelte'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'
  import { Previous } from 'runed'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'
  import { computeWarpedMapBearing } from '@allmaps/bearing'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { webMercatorProjection } from '@allmaps/project'

  import { OptionsState } from './options/OptionsState.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMap } from '@allmaps/render'
  import type { Bbox } from '@allmaps/types'

  export type WarpedMapLayerMapComponentOptions = {
    addNavigationControl: boolean
    addGeolocateControl: boolean
    opacity: number // TODO: remove when in MapLibreWarpedMapLayerOptions
  }

  let {
    georeferencedMaps = [],
    optionsState = new OptionsState(),
    optionsStateByMapId = new Map(),
    componentOptions = {},
    mapOrImage = $bindable('map'),
    selectedMapId = $bindable(undefined)
  }: {
    georeferencedMaps: GeoreferencedMap[]
    optionsState: OptionsState
    optionsStateByMapId: Map<string, OptionsState>
    componentOptions?: Partial<WarpedMapLayerMapComponentOptions>
    mapOrImage?: 'map' | 'image'
    selectedMapId?: string
  } = $props()

  let container: HTMLElement
  let map: maplibregl.Map // TODO: make readable?
  let warpedMapLayer: WarpedMapLayer | undefined = $state()
  let mapIds: string[] = $state([])
  let warpedMaps: WarpedMap[] = $state([])
  let geoBbox: Bbox | undefined = $state(undefined)
  let selectedGeoreferencedMap: GeoreferencedMap | undefined = $state(undefined)
  let selectedWarpedMap: WarpedMap | undefined = $state(undefined)
  let selectedOptionsState: OptionsState | undefined = $state(undefined)

  const previousSelectedMapId = new Previous(() => selectedMapId)
  const previousSelectedGeoreferencedMap = new Previous(
    () => selectedGeoreferencedMap
  )
  const previousSelectedWarpedMap = new Previous(() => selectedWarpedMap)
  const previousSelectedOptionsState = new Previous(() => selectedOptionsState)

  onMount(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    map = new maplibregl.Map({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      maxPitch: 0,
      bearingSnap: 0
    })

    // addTerrain(map, maplibregl)

    if (componentOptions.addNavigationControl) {
      map.addControl(new maplibregl.NavigationControl(), 'top-left')
    }
    if (componentOptions.addGeolocateControl) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true
          },
          trackUserLocation: true
        }),
        'top-left'
      )
    }

    map.on('load', () => {
      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)

      // Get the layer options and re-initialize the optionState with those option
      // Such that components using the options state
      // reflect the starting values for their options (like visible: true, ...)
      optionsState.setOptions(
        warpedMapLayer.getDefaultLayerOptions({
          omitDefaultGeoreferencedMapOptions: true
        })
      )
    })

    map.on('click', (e) => {
      if (!warpedMapLayer) {
        return
      }
      // TODO: set filter on only visible,
      // to not accidentally click on other maps while in image mode
      selectedMapId = warpedMapLayer.getWarpedMapList().getMapIds({
        geoPoint: [e.lngLat.lng, e.lngLat.lat]
      })[0]
    })
  })

  // Add maps
  $effect(() => {
    if (!warpedMapLayer) {
      return
    }

    //TODO: why clear? This also clears cache!
    // warpedMapLayer.clear()

    // TODO: remove current?

    // TODO: move adding georeferencedmaps to warpedmaplist
    Promise.allSettled(
      georeferencedMaps.map((georeferencedMap) =>
        warpedMapLayer?.addGeoreferencedMap(georeferencedMap)
      )
    ).then(() => {
      const warpedMapList = warpedMapLayer?.renderer?.warpedMapList
      if (!warpedMapList) {
        return
      }
      warpedMaps = Array.from(warpedMapList.getWarpedMaps())
      mapIds = Array.from(warpedMapList.getMapIds())

      for (const mapId of mapIds) {
        if (!optionsStateByMapId.has(mapId)) {
          optionsStateByMapId.set(
            mapId,
            new OptionsState(warpedMapLayer?.getDefaultMapOptions(mapId))
          )
        }
      }

      geoBbox =
        mapIds.length > 0
          ? warpedMapList.getMapsBbox({
              projection: { definition: 'EPSG:4326' }
            })
          : undefined
      if (geoBbox) {
        map.fitBounds(geoBbox, {
          animate: false,
          padding: 20,
          bearing: map.getBearing()
        })
      }
    })
  })

  // Select map
  $effect(() => {
    if (previousSelectedOptionsState && previousSelectedOptionsState.current) {
      previousSelectedOptionsState.current.viewOptions.renderAppliableMask =
        undefined
      previousSelectedOptionsState.current.viewOptions.renderAppliableMaskSize =
        undefined
    }

    if (!selectedMapId) {
      selectedOptionsState = undefined
      selectedGeoreferencedMap = undefined
      selectedWarpedMap = undefined

      // optionsState.viewOptions.renderAppliableMask = undefined
      // optionsState.viewOptions.renderAppliableMaskSize = undefined
    } else {
      selectedOptionsState = optionsStateByMapId.get(selectedMapId)
      selectedGeoreferencedMap = georeferencedMaps.find(
        (georeferencedMap) => georeferencedMap.id == selectedMapId
      )
      selectedWarpedMap = warpedMaps.find(
        (warpedMap) => warpedMap.mapId == selectedMapId
      )
      if (!selectedOptionsState) {
        return
      }

      selectedOptionsState.viewOptions.renderAppliableMask = true
      selectedOptionsState.viewOptions.renderAppliableMaskSize = 8
    }
  })

  // Switch between 'map' and 'image'
  $effect(() => {
    if (mapOrImage === 'map') {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'visible')
        }
      }
      warpedMapLayer?.showMaps(mapIds)
      map.rotateTo(0)
      optionsState.viewOptions.visible = true
      if (selectedOptionsState) {
        selectedOptionsState.viewOptions.visible = true
        selectedOptionsState.viewOptions.transformationType = undefined
        selectedOptionsState.viewOptions.internalProjection = undefined
        selectedOptionsState.viewOptions.applyMask = undefined
      }
    } else if (mapOrImage == 'image') {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'none')
        }
      }
      if (selectedWarpedMap && selectedMapId) {
        map.rotateTo(-computeWarpedMapBearing(selectedWarpedMap))
        warpedMapLayer?.hideMaps(mapIds)
        warpedMapLayer?.showMap(selectedMapId)
        // TODO: fix: reset transformation type: use extraOptions
      }
      optionsState.viewOptions.visible = false
      if (selectedOptionsState) {
        selectedOptionsState.viewOptions.visible = true
        selectedOptionsState.viewOptions.transformationType = 'helmert'
        selectedOptionsState.viewOptions.internalProjection =
          webMercatorProjection
        selectedOptionsState.viewOptions.applyMask = false
      }
    }
  })

  // Set options
  $effect(() => {
    // Wait for warpedMaps to be added (don't set options yet just after setting warpedMapLayer)
    if (!warpedMapLayer || !warpedMaps) {
      return
    }

    // TODO: replace this with more elegant code once you can .map() a Map()
    const mergedOptionsByMapId = new Map(
      Array.from(optionsStateByMapId).map(([mapId, optionsState]) => [
        mapId,
        optionsState.mergedOptions
      ])
    )

    // Using $state.snapshot() here to avoid proxies and allow for accurate comparison
    console.log(mergedOptionsByMapId, optionsState.mergedOptions)
    warpedMapLayer.setMapsOptionsByMapId(
      $state.snapshot(mergedOptionsByMapId),
      $state.snapshot(optionsState.mergedOptions)
    )
  })
</script>

<div class="h-full w-full" bind:this={container}></div>
