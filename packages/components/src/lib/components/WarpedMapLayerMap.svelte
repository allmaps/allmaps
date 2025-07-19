<script lang="ts">
  import { onMount } from 'svelte'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'
  import { computeGeoreferencedMapBearing } from '@allmaps/bearing'
  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { OptionsState } from './options/OptionsState.svelte'
  import { webMercatorPickerProjection } from '$lib/shared/projections/projections'

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
    optionsState?: OptionsState
    optionsStateByMapId?: Map<string, OptionsState>
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
  let selectedOptionState: OptionsState | undefined = $state(undefined)

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
    })

    map.on('click', (e) => {
      if (!warpedMapLayer) {
        return
      }
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
    if (!selectedMapId) {
      selectedOptionState = undefined
      selectedGeoreferencedMap = undefined
      selectedWarpedMap = undefined

      optionsState.viewOptions.renderAppliableMask = undefined
      optionsState.viewOptions.renderAppliableMaskSize = undefined
    } else {
      selectedOptionState = optionsStateByMapId.get(selectedMapId)
      selectedGeoreferencedMap = georeferencedMaps.find(
        (georeferencedMap) => georeferencedMap.id == selectedMapId
      )
      selectedWarpedMap = warpedMaps.find(
        (warpedMap) => warpedMap.mapId == selectedMapId
      )
      if (!selectedWarpedMap) {
        return
      }

      optionsState.viewOptions.renderAppliableMask = true
      optionsState.viewOptions.renderAppliableMaskSize = 8
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
      optionsState.viewOptions.transformationType = undefined
      optionsState.viewOptions.internalProjection = undefined
      optionsState.viewOptions.applyMask = undefined
    } else if (mapOrImage == 'image') {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'none')
        }
      }
      if (selectedGeoreferencedMap && selectedMapId) {
        map.rotateTo(-computeGeoreferencedMapBearing(selectedGeoreferencedMap))
        warpedMapLayer?.hideMaps(mapIds)
        warpedMapLayer?.showMap(selectedMapId)
        // TODO: fix: reset transformation type: use extraOptions
      }
      optionsState.viewOptions.transformationType = 'helmert'
      optionsState.viewOptions.internalProjection = webMercatorPickerProjection
      optionsState.viewOptions.applyMask = false
    }
  })

  // Set options
  $effect(() => {
    if (!warpedMapLayer) {
      return
    }

    // TODO: check in warpedmaplayer that options are also applied to new maps
    warpedMapLayer.setLayerOptions(optionsState?.mergedOptions)
    if (selectedMapId && selectedOptionState) {
      warpedMapLayer.setMapsOptions(
        [selectedMapId],
        selectedOptionState.mergedOptions
      )
    }
  })
</script>

<div class="h-full w-full" bind:this={container}></div>
