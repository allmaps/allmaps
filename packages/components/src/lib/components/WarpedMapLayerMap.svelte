<script lang="ts">
  import { onMount } from 'svelte'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'
  import { computeGeoreferencedMapBearing } from '@allmaps/bearing'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { computeBbox } from '@allmaps/stdlib'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { MapLibreWarpedMapLayerOptions } from '@allmaps/maplibre'
  import type { WarpedMap } from '@allmaps/render'
  import type { Bbox } from '@allmaps/types'

  import {
    deleteFromAnnotationOptions,
    OptionsState
  } from './options/OptionsState.svelte'
  import { webMercatorProjection } from '@allmaps/project'

  export type WarpedMapLayerMapComponentOptions =
    MapLibreWarpedMapLayerOptions & {
      addNavigationControl: boolean
      addGeolocateControl: boolean
      opacity: number // TODO: remove when in MapLibreWarpedMapLayerOptions
    }

  let {
    georeferencedMaps = [],
    optionsState = new OptionsState(),
    mapOrImage = $bindable('map'),
    selectedMapId = $bindable(undefined)
  }: {
    georeferencedMaps: GeoreferencedMap[]
    optionsState?: OptionsState
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

  onMount(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    map = new maplibregl.Map({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      maxPitch: 0
    })

    // addTerrain(map, maplibregl)

    if (optionsState.mergedOptions.addNavigationControl) {
      map.addControl(new maplibregl.NavigationControl(), 'top-left')
    }
    if (optionsState.mergedOptions.addGeolocateControl) {
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
  })

  $effect(() => {
    selectedGeoreferencedMap = georeferencedMaps.find(
      (georeferencedMap) => georeferencedMap.id == selectedMapId
    )
    selectedWarpedMap = warpedMaps.find(
      (warpedMap) => warpedMap.mapId == selectedMapId
    )
  })

  $effect(() => {
    // if (!selectedMapId && warpedMaps[0]) {
    //   selectedMapId = warpedMaps[0].mapId
    // }
    if (mapOrImage === 'map') {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'visible')
        }
      }
      warpedMapLayer?.showMaps(mapIds)
      map.rotateTo(0)
      optionsState.viewOptions = {}
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
      optionsState.viewOptions = {
        transformationType: 'helmert',
        internalProjection: webMercatorProjection,
        applyMask: false
      }
    }
  })

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
    })
  })

  $effect(() => {
    if (!warpedMapLayer) {
      return
    }

    // TODO: check in warpedmaplayer that options are also applied to new maps
    warpedMapLayer.setLayerOptions(
      deleteFromAnnotationOptions(optionsState?.mergedOptions)
    )
  })

  // Fit bounds on mount
  $effect(() => {
    if (!geoBbox) {
      return
    }
    map.fitBounds(geoBbox, { animate: false, bearing: map.getBearing() })
  })

  // Fit bounds on select
  $effect(() => {
    if (!selectedWarpedMap) {
      if (geoBbox) {
        map.fitBounds(geoBbox, { bearing: map.getBearing() })
      }
    } else {
      let bbox = selectedWarpedMap.geoMaskBbox
      // Recompute bbox in case upside down
      bbox = computeBbox([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ])
      // TODO: fix also fit bounds when image
      map.fitBounds(bbox, {
        bearing: map.getBearing()
      })
    }
  })
</script>

<div class="h-full w-full" bind:this={container}></div>
