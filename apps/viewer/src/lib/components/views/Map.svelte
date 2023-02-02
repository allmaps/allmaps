<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import {
    renderOptionsAll,
    renderOptionsByMapId,
    renderOptionsScope
  } from '$lib/shared/stores/render-options.js'
  import { ol } from '$lib/shared/stores/openlayers.js'
  import { sourcesById } from '$lib/shared/stores/sources.js'

  import {
    selectedMapsById,
    setSelectedMapIds
  } from '$lib/shared/stores/selected.js'

  import OLMap from 'ol/Map.js'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ.js'
  import View from 'ol/View.js'
  import { GeoJSON } from 'ol/format'
  import { Vector as VectorSource } from 'ol/source'
  import Select from 'ol/interaction/Select.js'
  import { click } from 'ol/events/condition.js'

  import {
    invisiblePolygonStyle,
    selectedPolygonStyle
  } from '$lib/shared/openlayers.js'

  import {
    WarpedMapLayer,
    WarpedMapSource,
    OLWarpedMapEvent,
    WarpedMapEventType
  } from '@allmaps/openlayers'

  import HiddenWarpedMap from '$lib/components/elements/HiddenWarpedMap.svelte'

  import type { Writable } from 'svelte/store'
  import type { WarpedMap } from '@allmaps/render'
  import type { Source, SelectedMap } from '$lib/shared/types.js'

  let warpedMapLayer: WarpedMapLayer
  let warpedMapSource: WarpedMapSource

  let vectorSource: VectorSource
  let vectorLayer: VectorLayer<VectorSource>

  let select: Select

  let xyz: XYZ
  let baseLayer

  type IDs = Set<string>

  const sourcesInWarpedMapSource: IDs = new Set()

  function updateVectorLayer(warpedMap: WarpedMap) {
    const geoMask = warpedMap.geoMask
    const feature = new GeoJSON().readFeature(geoMask)

    feature.setId(warpedMap.mapId)
    vectorSource.addFeature(feature)
  }

  async function updateWarpedMapLayer(sourcesById: Map<string, Source>) {
    if ($ol && warpedMapSource) {
      const addSourceIds: IDs = new Set()
      const deleteSourceIds: IDs = new Set()

      for (let currentSourceId of sourcesById.keys()) {
        if (!sourcesInWarpedMapSource.has(currentSourceId)) {
          addSourceIds.add(currentSourceId)
        }
      }

      for (let warpedMapSourceId of sourcesInWarpedMapSource) {
        if (!sourcesById.has(warpedMapSourceId)) {
          deleteSourceIds.add(warpedMapSourceId)
        }
      }

      for (let addSourceId of addSourceIds) {
        const source = sourcesById.get(addSourceId)
        if (source) {
          await warpedMapSource.addGeorefAnnotation(source.json)
        }

        sourcesInWarpedMapSource.add(addSourceId)
      }

      for (let deleteSourceId of deleteSourceIds) {
        // TODO: remove maps from warpedMapSource

        sourcesInWarpedMapSource.delete(deleteSourceId)
      }

      const extent = warpedMapSource.getExtent()
      if (extent) {
        $ol.getView().fit(extent, {
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  $: {
    updateWarpedMapLayer($sourcesById)
  }

  const tileSources = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  ]

  let tileSourceIndex = 0

  $: {
    if (xyz) {
      const tileUrl = tileSources[tileSourceIndex].url
      xyz.setUrl(tileUrl)
    }
  }

  function handleSelect() {
    const selectedFeatures = select.getFeatures()
    const selectedMapIds = selectedFeatures
      .getArray()
      .map((feature) => String(feature.getId()))

    setSelectedMapIds(selectedMapIds)
  }

  // $: {
  //   for (let selectedMap of $selectedMaps.values() ){
  //     // if ($selectedMap)
  //     // console.log(selectedMap.)
  //   }
  // // const selectedFeatures = select.getFeatures()
  // // // console.log(value)
  // // vectorSource.getFeatureById
  // // selectedFeatures.
  // // for (let selectedMapId of value) {
  // // }
  // // vectorSource.getFeatures().forEach((feature) => {
  // //   const mapId = String(feature.getId())
  // //   // if (!value.has(mapId)) {
  // //   //   selectedFeatures.remove(feature)
  // //   // } else {
  // //   //   selectedFeatures.push(feature)
  // //   // }
  // // })
  // // })
  // }

  onMount(async () => {
    const tileUrl = tileSources[tileSourceIndex].url
    // TODO: set attribution
    xyz = new XYZ({
      url: tileUrl,
      maxZoom: 19
    })

    baseLayer = new TileLayer({
      source: xyz
    })

    warpedMapSource = new WarpedMapSource()
    warpedMapLayer = new WarpedMapLayer({
      source: warpedMapSource
    })

    vectorSource = new VectorSource()
    vectorLayer = new VectorLayer({
      source: vectorSource,
      style: invisiblePolygonStyle
    })

    $ol = new OLMap({
      layers: [baseLayer, warpedMapLayer, vectorLayer],
      target: 'ol',
      controls: [],
      view: new View({
        maxZoom: 24,
        zoom: 12
      })
    })

    select = new Select({
      condition: click,
      style: selectedPolygonStyle
    })

    $ol.addInteraction(select)

    select.on('select', handleSelect)

    renderOptionsAll.subscribe((renderOptions) => {
      warpedMapLayer.setOpacity(renderOptions.opacity)

      if (renderOptions.removeBackground.enabled) {
        warpedMapLayer.setRemoveBackground(
          renderOptions.removeBackground.color,
          {
            threshold: renderOptions.removeBackground.threshold,
            hardness: renderOptions.removeBackground.hardness
          }
        )
      } else {
        warpedMapLayer.resetRemoveBackground()
      }

      if (renderOptions.colorize.enabled) {
        warpedMapLayer.setColorize(renderOptions.colorize.color)
      } else {
        warpedMapLayer.resetColorize()
      }
    })

    warpedMapLayer.on(
      WarpedMapEventType.WARPEDMAPADDED,
      (event: OLWarpedMapEvent) => {
        const mapId = event.data as string
        const warpedMap = warpedMapSource.getWarpedMap(mapId)
        if (warpedMap) {
          updateVectorLayer(warpedMap)
        }
      }
    )

    updateWarpedMapLayer($sourcesById)
  })

  onDestroy(() => {
    $ol = undefined
  })

  // function setBackgroundColor() {
  //   if (warpedMapLayer) {
  //     // TODO: use subscribe instead of get
  //     const removeBackgroundColorValue = get(removeBackgroundColor)
  //     const backgroundColorValue = get(backgroundColor)
  //     const backgroundColorThresholdValue = get(backgroundColorThreshold)
  //     const backgroundColorThresholdHardnessValue = get(
  //       backgroundColorThresholdHardness
  //     )

  //     warpedMapLayer.setBackgroundColor(
  //       removeBackgroundColorValue ? backgroundColorValue : null
  //     )
  //     warpedMapLayer.setBackgroundColorThreshold(
  //       backgroundColorThresholdValue,
  //       backgroundColorThresholdHardnessValue
  //     )
  //   }
  // }

  // function setColorizeColor() {
  //   if (warpedMapLayer) {
  //     const colorizeValue = get(colorize)
  //     const colorizeColorValue = get(colorizeColor)

  //     warpedMapLayer.setColorizeColor(colorizeValue ? colorizeColorValue : null)
  //   }
  // }

  // opacity.subscribe((value) => {
  //   if (warpedMapLayer) {
  //     warpedMapLayer.setOpacity(value)
  //   }
  // })

  // removeBackgroundColor.subscribe((value) => {
  //   setBackgroundColor()
  // })

  // backgroundColor.subscribe((value) => {
  //   setBackgroundColor()
  // })
  // backgroundColorThreshold.subscribe((value) => {
  //   setBackgroundColor()
  // })
  // backgroundColorThresholdHardness.subscribe((value) => {
  //   setBackgroundColor()
  // })
  // colorize.subscribe((value) => {
  //   setColorizeColor()
  // })
  // colorizeColor.subscribe((value) => {
  //   setColorizeColor()
  // })

  function handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Space' && event.target === document.body) {
      warpedMapLayer.setVisible(false)
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'Space' && event.target === document.body) {
      warpedMapLayer.setVisible(true)
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div id="ol" class="w-full h-full" />
{#if vectorSource && select}
  <div class="hidden">
    <ol>
      {#each [...$selectedMapsById.entries()] as [mapId, selectedMap] (mapId)}
        <li>
          <HiddenWarpedMap {vectorSource} {select} {selectedMap} />
        </li>
      {/each}
    </ol>
  </div>
{/if}
