<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import {
    renderOptionsLayer,
    renderOptionsSelectedMaps,
    renderOptionsScope
  } from '$lib/shared/stores/render-options.js'
  import { ol, xyzLayer } from '$lib/shared/stores/openlayers.js'
  import { sourcesById } from '$lib/shared/stores/sources.js'

  import {
    selectedMapIds,
    selectedMaps,
    updateSelectedMaps
  } from '$lib/shared/stores/selected.js'

  import OLMap from 'ol/Map.js'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import XYZ from 'ol/source/XYZ.js'
  import View from 'ol/View.js'
  import { GeoJSON } from 'ol/format'
  import { Vector as VectorSource } from 'ol/source'
  import Select, { SelectEvent } from 'ol/interaction/Select.js'
  import { click } from 'ol/events/condition.js'

  import { applyStyle } from 'ol-mapbox-style';
  import { VectorTile } from 'ol/layer.js';
  import protomaps from 'protomaps-themes-base';
  import {Attribution} from 'ol/control.js';

  import {
    invisiblePolygonStyle,
    selectedPolygonStyle,
    idsFromFeatures
  } from '$lib/shared/openlayers.js'

  import {
    WarpedMapLayer,
    WarpedMapSource,
    OLWarpedMapEvent,
    WarpedMapEventType
  } from '@allmaps/openlayers'

  import HiddenWarpedMap from '$lib/components/elements/HiddenWarpedMap.svelte'

  import type { WarpedMap } from '@allmaps/render'
  import type { Source } from '$lib/shared/types.js'

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

  $: {
    if (xyz) {
      xyz.setUrl($xyzLayer.url)
    }
  }

  function handleSelect(event: SelectEvent) {
    const selectedMapIds = idsFromFeatures(event.selected)
    const deselectedMapIds = idsFromFeatures(event.deselected)

    updateSelectedMaps(selectedMapIds, deselectedMapIds)
  }

  $: {
    if (warpedMapLayer) {
      if ($renderOptionsScope === 'layer') {
        warpedMapLayer.setOpacity($renderOptionsLayer.opacity)

        if ($renderOptionsLayer.removeBackground.enabled) {
          warpedMapLayer.setRemoveBackground(
            $renderOptionsLayer.removeBackground.color,
            {
              threshold: $renderOptionsLayer.removeBackground.threshold,
              hardness: $renderOptionsLayer.removeBackground.hardness
            }
          )
        } else {
          warpedMapLayer.resetRemoveBackground()
        }
        if ($renderOptionsLayer.colorize.enabled) {
          warpedMapLayer.setColorize($renderOptionsLayer.colorize.color)
        } else {
          warpedMapLayer.resetColorize()
        }
      } else {
        const renderOptions = $renderOptionsSelectedMaps[0]

        for (let selectedMapId of $selectedMapIds) {
          warpedMapLayer.setMapOpacity(selectedMapId, renderOptions.opacity)
          warpedMapLayer.setMapRemoveBackground(
            selectedMapId,
            renderOptions.removeBackground.color,
            {
              threshold: renderOptions.removeBackground.threshold,
              hardness: renderOptions.removeBackground.hardness
            }
          )
          warpedMapLayer.setMapColorize(
            selectedMapId,
            renderOptions.colorize.color
          )
        }
      }
    }
  }

  onMount(async () => {
    // TODO: set attribution

    baseLayer = new VectorTile({declutter: true});

    applyStyle(baseLayer, {
      version:"8",
      layers:protomaps("protomaps","white"),
      sources:{
        protomaps: {
          type: "vector",
          tiles: ["https://api.protomaps.com/tiles/v2/{z}/{x}/{y}.pbf?key=507ade1803ce471c"],
          attribution: 'base layer © <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>',
          maxzoom: 14
        }
      }
    });

    const attribution = new Attribution({
      collapsible: false,
    });

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
      controls: [attribution],
      view: new View({
        maxZoom: 24,
        zoom: 12
      })
    })

    select = new Select({
      condition: click,
      style: selectedPolygonStyle
    })

    // TODO: enable select
    // $ol.addInteraction(select)
    // select.on('select', handleSelect)

    // TODO: fix typescript error
    warpedMapLayer.on(
      // @ts-ignore
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
</script>

<div id="ol" class="w-full h-full" />
{#if vectorSource && select}
  <div class="hidden">
    <ol>
      {#each $selectedMaps as viewerMap (viewerMap.mapId)}
        <li>
          <HiddenWarpedMap {vectorSource} {select} {viewerMap} />
        </li>
      {/each}
    </ol>
  </div>
{/if}
