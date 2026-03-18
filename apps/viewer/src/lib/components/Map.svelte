<script lang="ts">
  import { onMount, untrack, tick } from 'svelte'

  import maplibregl from 'maplibre-gl'

  import { basemapStyle, addTerrain, removeTerrain } from '@allmaps/basemap'
  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { pink } from '@allmaps/tailwind'
  import { bufferBboxByRatio } from '@allmaps/stdlib'
  import { computeWarpedMapBearing } from '@allmaps/bearing'

  import MapMenu from './MapMenu.svelte'

  import { hasInputTarget } from '$lib/shared/keyboard.js'

  import type { LngLatBounds, MapMouseEvent } from 'maplibre-gl'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { WarpedMap } from '@allmaps/render'

  import type { Bbox } from '@allmaps/types'

  import type { Source } from '$lib/types/shared.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  // Partly from:
  // https://github.com/mclaeysb/allmaps/blob/344e9cd22946304b51a44a72984afadf2f50bf5e/packages/components/src/lib/components/maps/WarpedMapLayerMap.svelte

  const PADDING = 60
  const DURATION = 400

  type Props = {
    source: Source
    view?: 'map' | 'image'
    selectedMapId?: string
    opacity?: number
    removeColorThreshold?: number
    terrain?: boolean
    overlay?: { streets: boolean; buildings: boolean }
    bearing?: number
  }

  let {
    source,
    view = 'map',
    selectedMapId = $bindable(),
    opacity = 1,
    removeColorThreshold = 1,
    terrain = false,
    overlay = { streets: false, buildings: false },
    bearing = $bindable(0)
  }: Props = $props()

  let georeferencedMaps = $derived.by(() => {
    if (source.parsed.type === 'annotation') {
      return source.parsed.maps
    } else {
      return source.parsed.apiMaps || []
    }
  })

  let derivedOpacity = $derived.by(() => {
    if (view === 'image') {
      return 1
    } else {
      return toggledOpacity ? 0 : opacity
    }
  })

  let derivedRemoveColorThreshold = $derived.by(() => {
    if (view === 'image') {
      return 0
    } else {
      return toggledRemoveColorThreshold ? 1 : removeColorThreshold
    }
  })

  let mapLoaded = $state(false)
  let terrainAdded = $state(false)

  $effect(() => {
    if (warpedMapLayer) {
      warpedMapLayer?.setLayerOptions({
        opacity: derivedOpacity,
        removeColorColor: '#f2e2d0',
        removeColor: true,
        removeColorHardness: 0.1,
        removeColorThreshold: derivedRemoveColorThreshold / 3
      })
    }
  })

  // Add or remove terrain layer
  $effect(() => {
    if (!map) {
      return
    }

    if (mapLoaded) {
      if (terrain) {
        // @ts-expect-error incorrect MapLibre types
        addTerrain(map, maplibregl)
        terrainAdded = true
      } else if (terrainAdded) {
        // @ts-expect-error incorrect MapLibre types
        removeTerrain(map)
        terrainAdded = false
      }
    }
  })

  // // Control overlay layers visibility
  // $effect(() => {
  //   if (!map) {
  //     return
  //   }

  //   if (mapLoaded) {
  //     if (map.getLayer('overlay-streets')) {
  //       map.setLayoutProperty(
  //         'overlay-streets',
  //         'visibility',
  //         overlay.streets ? 'visible' : 'none'
  //       )
  //     }

  //     if (map.getLayer('overlay-buildings')) {
  //       map.setLayoutProperty(
  //         'overlay-buildings',
  //         'visibility',
  //         overlay.buildings ? 'visible' : 'none'
  //       )
  //     }
  //   }
  // })

  export function zoomToExtent() {
    const bounds = warpedMapLayer?.getBounds()
    if (bounds) {
      // @ts-expect-error incorrect MapLibre types
      map?.fitBounds(bounds, {
        padding: PADDING,
        duration: DURATION
      })
    }
  }

  let container = $state<HTMLElement>()
  let map = $state.raw<maplibregl.Map>()
  let warpedMapLayer = $state<WarpedMapLayer>()
  let geoBbox = $state<Bbox>()
  let warpedMaps = $state<WarpedMap[]>([])

  // Context menu state
  let contextMenuOpen = $state(false)
  let contextMenuX = $state(0)
  let contextMenuY = $state(0)
  let contextMenuMapId = $state<string>()
  let contextMenuGeoreferencedMap = $state<GeoreferencedMap>()
  let contextMenuLatLon = $state<[number, number]>([0, 0])

  let selectedMapIdForImageView = $derived(
    selectedMapId || georeferencedMaps[0]?.id
  )

  let selectedWarpedMap = $derived.by(() => {
    if (!warpedMapLayer || !selectedMapIdForImageView) {
      return undefined
    }
    return warpedMaps.find(
      (warpedMap) => warpedMap.mapId == selectedMapIdForImageView
    )
  })

  let toggledOpacity = $state(false)
  let toggledRemoveColorThreshold = $state(false)

  let previousSelectedMapId: string | undefined
  let internalSelection = false

  let previousMapBounds: LngLatBounds | undefined

  function findMapIdFromMapMouseEvent(event: MapMouseEvent) {
    return warpedMapLayer?.getWarpedMapList().getMapIds({
      geoPoint: [event.lngLat.lng, event.lngLat.lat],
      onlyVisible: true
    })[0]
  }

  function selectMap(mapId: string | undefined) {
    if (!warpedMapLayer || view === 'image') {
      return
    }

    if (previousSelectedMapId) {
      warpedMapLayer.setMapOptions(previousSelectedMapId, {
        renderMask: false
      })
    }

    if (mapId) {
      warpedMapLayer.setMapOptions(mapId, {
        renderMask: true
      })

      const warpedMap = warpedMaps.find((wm) => wm.mapId === mapId)
      if (map && warpedMap && !internalSelection) {
        map.fitBounds(warpedMap.geoMaskBbox, {
          padding: PADDING,
          duration: DURATION
        })
      }

      warpedMapLayer.bringMapsToFront([mapId])
      internalSelection = false
    }

    previousSelectedMapId = mapId
  }

  function handleMapClick(event: MapMouseEvent) {
    if (!warpedMapLayer || view === 'image') {
      return
    }

    // if (warpedMapLayer.renderer?.animating) {
    //   return
    // }

    let newSelectedMapId = findMapIdFromMapMouseEvent(event)

    if (newSelectedMapId && previousSelectedMapId !== newSelectedMapId) {
      internalSelection = true
      selectedMapId = newSelectedMapId
    } else {
      internalSelection = false
      selectedMapId = undefined
    }
  }

  async function handleMapContextMenu(event: MapMouseEvent) {
    event.preventDefault()
    event.originalEvent.stopPropagation()

    const mapId = findMapIdFromMapMouseEvent(event)
    if (mapId) {
      // Close the menu first if it's already open
      contextMenuOpen = false

      // Use tick to ensure the close happens before reopening
      await tick()

      contextMenuMapId = mapId
      contextMenuGeoreferencedMap = georeferencedMaps.find(
        (georeferencedMap) => georeferencedMap.id === mapId
      )
      contextMenuLatLon = [event.lngLat.lat, event.lngLat.lng]
      contextMenuX = event.originalEvent.clientX
      contextMenuY = event.originalEvent.clientY
      contextMenuOpen = true
    }
  }

  export function zoomIn() {
    map?.zoomIn()
  }

  export function zoomOut() {
    map?.zoomOut()
  }

  export function resetBearing() {
    map?.rotateTo(0, { duration: DURATION })
  }

  // Select map
  $effect(() => {
    if (previousSelectedMapId === selectedMapId) {
      return
    }

    if (view === 'map') {
      untrack(() => {
        selectMap(selectedMapId)
      })
    } else if (view === 'image') {
      untrack(() => {
        if (selectedMapId) {
          previousMapBounds = undefined

          warpedMapLayer?.setMapOptions(selectedMapId, {
            visible: true,
            applyMask: false,
            renderAppliedMask: false,
            renderMask: true,
            transformationType: 'helmert'
          })

          if (map && selectedWarpedMap) {
            map.fitBounds(selectedWarpedMap.geoMaskBbox, {
              padding: PADDING,
              animate: false,
              // duration: DURATION,
              bearing: -computeWarpedMapBearing(selectedWarpedMap)
            })

            if (previousSelectedMapId) {
              warpedMapLayer?.setMapOptions(previousSelectedMapId, {
                transformationType: undefined
              })

              warpedMapLayer?.setMapOptions(previousSelectedMapId, {
                visible: false,
                applyMask: true,
                renderAppliedMask: false,
                renderMask: false
              })
            }

            previousSelectedMapId = selectedMapId
          }
        }
      })
    }
  })

  // Switch between 'map' and 'image'
  $effect(() => {
    if (view === 'map') {
      untrack(() => {
        if (!map) {
          return
        }

        map.setMaxBounds()

        showBasemap(map)

        if (selectedMapId) {
          const otherMapIds = warpedMapLayer
            ? warpedMapLayer.getMapIds().filter((id) => id !== selectedMapId)
            : []

          warpedMapLayer?.setMapsOptions(
            otherMapIds,
            {
              visible: true,
              transformationType: undefined
            },
            undefined,
            { animate: false }
          )

          warpedMapLayer?.setMapOptions(selectedMapId, {
            applyMask: true,
            renderAppliedMask: true,
            renderMask: false,
            transformationType: undefined
          })

          // TODO: later, when visibility should be animated for otherMapIds,
          // animate it together with transformationType for selectedMapIdForImageView
          // using setMapsOptionsByMapId() as below
          // (after setting only transformationType but not visibilty with { animate: false } ) as above
          // and same when view == image
          //
          // const mapsOptionsByMapId = new Map()
          // mapsOptionsByMapId.set(selectedMapIdForImageView, {
          //   applyMask: true,
          //   renderAppliedMask: true,
          //   renderMask: false,
          //   transformationType: undefined
          // })
          // for (const mapId of otherMapIds) {
          //   mapsOptionsByMapId.set(mapId, {
          //     visible: true,
          //   })
          // }
          // warpedMapLayer?.setMapsOptionsByMapId(mapsOptionsByMapId)

          if (previousMapBounds) {
            map.fitBounds(previousMapBounds, {
              padding: PADDING,
              duration: DURATION,
              bearing: 0
            })
          } else if (selectedWarpedMap) {
            map.fitBounds(selectedWarpedMap.geoMaskBbox, {
              padding: PADDING,
              duration: DURATION,
              bearing: 0
            })
          }
        }
      })
    } else if (view === 'image') {
      untrack(() => {
        if (!map) {
          return
        }

        const untrackedSelectedWarpedMap = untrack(() => selectedWarpedMap)

        if (untrackedSelectedWarpedMap && selectedMapIdForImageView) {
          hideBasemap(map)

          const otherMapIds = warpedMapLayer
            ? warpedMapLayer
                .getMapIds()
                .filter((id) => id !== selectedMapIdForImageView)
            : []
          warpedMapLayer?.setMapsOptions(
            otherMapIds,
            {
              visible: false,
              transformationType: 'helmert'
            },
            undefined,
            { animate: false }
          )

          warpedMapLayer?.setMapOptions(selectedMapIdForImageView, {
            applyMask: false,
            renderAppliedMask: false,
            renderMask: true,
            transformationType: 'helmert'
          })

          // TODO: same remark as for view == map

          previousMapBounds = map.getBounds()

          map.fitBounds(untrackedSelectedWarpedMap.geoMaskBbox, {
            padding: PADDING,
            duration: DURATION,
            bearing: -computeWarpedMapBearing(untrackedSelectedWarpedMap)
          })

          map.once('idle', () => {
            map?.setMaxBounds(
              bufferBboxByRatio(untrackedSelectedWarpedMap.geoFullMaskBbox, 3)
            )
          })
        }
      })
    }
  })

  async function showBasemap(map: maplibregl.Map) {
    for (const layer of map.getLayersOrder()) {
      if (layer !== warpedMapLayer?.id) {
        map.setLayoutProperty(layer, 'visibility', 'visible')
      }
    }

    await tick()
    map.setPaintProperty('white-background', 'background-opacity', 0)
  }

  function hideBasemap(map: maplibregl.Map) {
    map.setPaintProperty('white-background', 'background-opacity', 1)

    setTimeout(() => {
      for (const layer of map.getLayersOrder()) {
        if (layer !== warpedMapLayer?.id) {
          map.setLayoutProperty(layer, 'visibility', 'none')
        }
      }
    }, DURATION)
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      toggledOpacity = true
    } else if (event.key === 'b') {
      toggledRemoveColorThreshold = true
    } else {
      return
    }

    event.preventDefault()
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (hasInputTarget(event)) {
      return
    }

    if (event.code === 'Space') {
      toggledOpacity = false
    } else if (event.key === 'b') {
      toggledRemoveColorThreshold = false
    } else {
      return
    }

    event.preventDefault()
  }

  function handleContextMenu(event: MouseEvent) {
    if (contextMenuOpen) {
      event.preventDefault()
    }
  }

  onMount(() => {
    if (!container) {
      return
    }

    // const protocol = new Protocol()
    // maplibregl.addProtocol('pmtiles', protocol.tile)

    map = new maplibregl.Map({
      container,
      // @ts-expect-error incorrect MapLibre types
      style: basemapStyle('en'),
      maxPitch: 0,
      bearingSnap: 0,
      attributionControl: false,
      navigationControl: false
    })

    map.on('load', async () => {
      if (!map) {
        return
      }

      // Add white background layer between basemap and warped maps
      map.addLayer({
        id: 'white-background',
        type: 'background',
        paint: {
          'background-color': '#ffffff',
          'background-opacity': 0,
          'background-opacity-transition': { duration: DURATION }
        }
      })

      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)

      // // Add overlay layers on top of warped maps
      // map.addLayer({
      //   id: 'overlay-streets',
      //   type: 'line',
      //   source: 'protomaps',
      //   'source-layer': 'roads',
      //   paint: {
      //     'line-color': '#ffffff',
      //     'line-width': 2,
      //     'line-opacity': 0.8
      //   },
      //   layout: {
      //     visibility: overlay.streets ? 'visible' : 'none'
      //   }
      // })

      // map.addLayer({
      //   id: 'overlay-buildings',
      //   type: 'fill',
      //   source: 'protomaps',
      //   'source-layer': 'buildings',
      //   paint: {
      //     'fill-color': pink,
      //     'fill-opacity': 0.3,
      //     'fill-outline-color': 'rgba(0, 0, 0, 1)'
      //     // 'fill-outline-opacity': 0.8
      //   },
      //   layout: {
      //     visibility: overlay.buildings ? 'visible' : 'none'
      //   }
      // })

      // map.addLayer({
      //   id: 'overlay-buildings-line',
      //   type: 'line',
      //   source: 'protomaps',
      //   'source-layer': 'buildings',
      //   paint: {
      //     'line-color': pink,
      //     'line-opacity': 1,
      //     'line-width': 2

      //     // 'line-outline-opacity': 0.8
      //   },
      //   layout: {
      //     visibility: overlay.buildings ? 'visible' : 'none'
      //   }
      // })

      await Promise.allSettled(
        georeferencedMaps.map((georeferencedMap) =>
          warpedMapLayer?.addGeoreferencedMap(georeferencedMap, {
            renderAppliedMaskColor: pink,
            renderAppliedMaskSize: 3,
            renderMaskColor: pink,
            renderMaskSize: 3
          })
        )
      )

      const warpedMapList = warpedMapLayer?.renderer?.warpedMapList
      warpedMaps = warpedMapList
        ? Array.from(warpedMapList.getWarpedMaps())
        : []

      geoBbox = warpedMapList?.getMapsBbox({
        projection: { definition: 'EPSG:4326' }
      })

      if (geoBbox) {
        map.fitBounds(geoBbox, {
          animate: false,
          padding: PADDING,
          duration: DURATION,
          bearing: 0
        })
      }

      map.on('click', handleMapClick)
      map.on('contextmenu', handleMapContextMenu)
      map.on('rotate', () => (bearing = map?.getBearing() || 0))

      // Select initial map if one is provided
      if (selectedMapId) {
        selectMap(selectedMapId)
      }

      mapLoaded = true
    })
  })
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  oncontextmenu={handleContextMenu}
/>

<div class="h-full w-full" bind:this={container}></div>

{#if contextMenuMapId && contextMenuGeoreferencedMap && warpedMapLayer}
  <MapMenu
    bind:open={contextMenuOpen}
    x={contextMenuX}
    y={contextMenuY}
    latLon={contextMenuLatLon}
    mapId={contextMenuMapId}
    georeferencedMap={contextMenuGeoreferencedMap}
    {warpedMapLayer}
  />
{/if}
