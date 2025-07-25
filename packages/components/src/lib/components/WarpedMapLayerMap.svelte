<script lang="ts">
  import { onMount, untrack } from 'svelte'
  import 'maplibre-gl/dist/maplibre-gl.css'
  import maplibregl from 'maplibre-gl'
  import { Protocol } from 'pmtiles'
  import { Previous } from 'runed'

  import { basemapStyle, addTerrain } from '@allmaps/basemap'
  import { computeWarpedMapBearing } from '@allmaps/bearing'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { webMercatorProjection } from '@allmaps/project'
  import { mergeOptionsUnlessUndefined } from '@allmaps/stdlib'

  import { OptionsState } from './options/OptionsState.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMap } from '@allmaps/render'
  import type { Bbox } from '@allmaps/types'

  export type WarpedMapLayerMapComponentOptions = {
    addNavigationControl: boolean
    addGeolocateControl: boolean
    opacity: number // TODO: remove when in MapLibreWarpedMapLayerOptions
  }

  const PADDING = 60
  const DURATION = 750

  let {
    georeferencedMaps = [],
    optionsState = new OptionsState(),
    mapOptionsStateByMapId = new Map(),
    componentOptions = {},
    mapOrImage = $bindable('map'),
    selectedMapId = $bindable(undefined),
    geoBbox = $bindable(undefined)
  }: {
    georeferencedMaps: GeoreferencedMap[]
    optionsState?: OptionsState
    mapOptionsStateByMapId?: Map<string, OptionsState>
    componentOptions?: Partial<WarpedMapLayerMapComponentOptions>
    mapOrImage?: 'map' | 'image'
    selectedMapId?: string
    geoBbox?: Bbox
  } = $props()

  let container: HTMLElement
  let map: maplibregl.Map // TODO: make readable?
  let warpedMapLayer: WarpedMapLayer | undefined = $state()
  let mapIds: string[] = $state([])
  let warpedMaps: WarpedMap[] = $state([])
  let selectedGeoreferencedMap: GeoreferencedMap | undefined = $state(undefined)
  let selectedWarpedMap: WarpedMap | undefined = $state(undefined)
  let selectedMapOptionsState: OptionsState | undefined = $state(undefined)

  const previousSelectedMapId = new Previous(() => selectedMapId)
  const previousSelectedGeoreferencedMap = new Previous(
    () => selectedGeoreferencedMap
  )
  const previousSelectedWarpedMap = new Previous(() => selectedWarpedMap)
  const previousSelectedMapOptionsState = new Previous(
    () => selectedMapOptionsState
  )

  onMount(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    map = new maplibregl.Map({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      maxPitch: 0,
      bearingSnap: 0,
      attributionControl: false
    })

    // addTerrain(map, maplibregl)

    map.addControl(
      new maplibregl.AttributionControl({ compact: false }),
      'bottom-left'
    )

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

      // Set the optionState default options again to reflect those of the warpedMapLayer.
      // This is important if the warpedMapLayer/warpedMapList's options (e.g. renderMask)
      // are different then the default options.
      // This way options components will show the correct options.
      optionsState.reference = warpedMapLayer.getDefaultLayerOptions({
        omitDefaultGeoreferencedMapOptions: true
      })
    })

    map.on('click', (e) => {
      selectMap(e)
    })

    map.on('contextmenu', (e) => {
      selectMap(e)
    })

    function selectMap(e: maplibregl.MapMouseEvent) {
      if (!warpedMapLayer || mapOrImage == 'image') {
        return
      }
      selectedMapId = warpedMapLayer.getWarpedMapList().getMapIds({
        geoPoint: [e.lngLat.lng, e.lngLat.lat],
        onlyVisible: true
      })[0]
    }

    map.on('dblclick', (e) => {
      if (!warpedMapLayer) {
        return
      }
      if (selectedWarpedMap) {
        if (geoBbox) {
          map.fitBounds(geoBbox, {
            animate: true,
            padding: PADDING,
            bearing: map.getBearing()
          })
        }
      }
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

      if (mapIds.length === 1) {
        selectedMapId = mapIds[0]
      }

      for (const mapId of mapIds) {
        if (!mapOptionsStateByMapId.has(mapId)) {
          mapOptionsStateByMapId.set(
            mapId,
            new OptionsState(
              warpedMapLayer?.getDefaultMapOptions(mapId),
              {},
              optionsState
            )
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
          padding: PADDING,
          bearing: map.getBearing()
        })
      }
    })
  })

  // Select map
  $effect(() => {
    if (
      previousSelectedMapOptionsState &&
      previousSelectedMapOptionsState.current
    ) {
      previousSelectedMapOptionsState.current.viewOptions.renderAppliableMask =
        undefined
      previousSelectedMapOptionsState.current.viewOptions.renderAppliableMaskSize =
        undefined
    }

    if (!selectedMapId) {
      selectedMapOptionsState = undefined
      selectedGeoreferencedMap = undefined
      selectedWarpedMap = undefined
    }

    if (selectedMapId) {
      selectedMapOptionsState = mapOptionsStateByMapId.get(selectedMapId)
      selectedGeoreferencedMap = georeferencedMaps.find(
        (georeferencedMap) => georeferencedMap.id == selectedMapId
      )
      selectedWarpedMap = warpedMaps.find(
        (warpedMap) => warpedMap.mapId == selectedMapId
      )

      if (!selectedMapOptionsState) {
        return
      }
      selectedMapOptionsState.viewOptions.renderAppliableMask = true
      selectedMapOptionsState.viewOptions.renderAppliableMaskSize = 8
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
      if (geoBbox) {
        map.fitBounds(geoBbox, {
          padding: PADDING,
          duration: DURATION,
          bearing: 0
        })
      }
      optionsState.viewOptions.visible = undefined
      const untrackedSelectedMapOptionsState = untrack(
        () => selectedMapOptionsState
      )
      if (untrackedSelectedMapOptionsState) {
        untrackedSelectedMapOptionsState.viewOptions.visible = undefined
        untrackedSelectedMapOptionsState.viewOptions.applyMask = undefined
        untrackedSelectedMapOptionsState.viewOptions.transformationType =
          undefined
        untrackedSelectedMapOptionsState.viewOptions.internalProjection =
          undefined
      }
    } else if (mapOrImage === 'image') {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'none')
        }
      }
      const untrackedSelectedWarpedMap = untrack(() => selectedWarpedMap)
      if (untrackedSelectedWarpedMap && selectedMapId) {
        map.fitBounds(untrackedSelectedWarpedMap.geoFullMaskBbox, {
          padding: PADDING,
          duration: DURATION,
          bearing: -computeWarpedMapBearing(untrackedSelectedWarpedMap)
        })
        // TODO: fix: reset transformation type: use extraOptions
      }
      optionsState.viewOptions.visible = false
      if (selectedMapOptionsState) {
        selectedMapOptionsState.viewOptions.visible = true
        selectedMapOptionsState.viewOptions.applyMask = false
        selectedMapOptionsState.viewOptions.transformationType = 'helmert'
        selectedMapOptionsState.viewOptions.internalProjection =
          webMercatorProjection
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
    const mapOptionsByMapId = new Map(
      Array.from(mapOptionsStateByMapId).map(([mapId, mapOptionsState]) => [
        mapId,
        $state.snapshot(
          mergeOptionsUnlessUndefined(
            mapOptionsState.options,
            mergeOptionsUnlessUndefined(
              optionsState.viewOptions,
              mapOptionsState.viewOptions
            )
          )
        )
      ])
    )
    const layerOptions = $state.snapshot(
      mergeOptionsUnlessUndefined(
        optionsState.options,
        optionsState.viewOptions
      )
    )

    // Using $state.snapshot() here to avoid proxies and allow for accurate comparison
    warpedMapLayer.setMapsOptionsByMapId(mapOptionsByMapId, layerOptions)
  })
</script>

<div class="h-full w-full" bind:this={container}></div>
