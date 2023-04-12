<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import { visibleMapIds, hiddenMapIds } from '$lib/shared/stores/visible.js'
  import {
    renderOptionsLayer,
    renderOptionsSelectedMaps,
    renderOptionsScope
  } from '$lib/shared/stores/render-options.js'
  import {
    ol,
    xyzLayer,
    warpedMapSource
  } from '$lib/shared/stores/openlayers.js'
  import { sourceLoading, sourcesCount } from '$lib/shared/stores/sources.js'
  import { activeMap } from '$lib/shared/stores/active.js'
  import { mapIds } from '$lib/shared/stores/maps.js'
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

  import {
    invisiblePolygonStyle,
    selectedPolygonStyle,
    idsFromFeatures
  } from '$lib/shared/openlayers.js'

  import { WarpedMapLayer } from '@allmaps/openlayers'
  import { computeBBox } from '@allmaps/stdlib'

  import ContextMenu from '$lib/components/elements/ContextMenu.svelte'
  import HiddenWarpedMap from '$lib/components/elements/HiddenWarpedMap.svelte'

  import type { WarpedMap } from '@allmaps/render'

  import type { ShowContextMenu } from '$lib/shared/types.js'

  let warpedMapLayer: WarpedMapLayer

  let vectorSource: VectorSource
  let vectorLayer: VectorLayer<VectorSource>

  let select: Select

  let xyz: XYZ
  let baseLayer

  let showContextMenu: ShowContextMenu | undefined

  function addMapToVectorLayer(warpedMap: WarpedMap) {
    const geoMask = warpedMap.geoMask
    const feature = new GeoJSON().readFeature(geoMask)

    feature.setId(warpedMap.mapId)
    vectorSource.addFeature(feature)
  }

  async function updateWarpedMapLayer() {
    if ($ol) {
      vectorSource.clear()

      for (let mapId of $mapIds) {
        const warpedMap = $warpedMapSource?.getMap(mapId)
        if (warpedMap) {
          addMapToVectorLayer(warpedMap)
        }
      }

      const extent = $warpedMapSource.getExtent()
      if (extent) {
        $ol.getView().fit(extent, {
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  $: {
    if (!$sourceLoading && $sourcesCount > 0) {
      updateWarpedMapLayer()
    }
  }

  $: {
    if ($ol && $activeMap && $activeMap.updateView) {
      const warpedMap = $warpedMapSource?.getMap($activeMap.viewerMap.mapId)
      if (warpedMap) {
        const bbox = computeBBox(warpedMap.geoMask.coordinates[0])
        $ol.getView().fit(bbox, {
          duration: 200,
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  $: {
    if (xyz) {
      xyz.setUrl($xyzLayer.url)
    }
  }

  function handleSelect(event: SelectEvent) {
    const selectedMapIds = idsFromFeatures(event.selected)
    const deselectedMapIds = idsFromFeatures(event.deselected)

    updateSelectedMaps(selectedMapIds, deselectedMapIds, false)
  }

  $: {
    if ($warpedMapSource) {
      $warpedMapSource.showMaps($visibleMapIds)
      $warpedMapSource.hideMaps($hiddenMapIds)
    }
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
    xyz = new XYZ({
      url: $xyzLayer.url,
      maxZoom: 19
    })

    baseLayer = new TileLayer({
      source: xyz
    })

    warpedMapLayer = new WarpedMapLayer({
      source: $warpedMapSource
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

    // TODO: fix typescript error
    // warpedMapLayer.on(
    //   // @ts-ignore
    //   WarpedMapEventType.WARPEDMAPADDED,
    //   (event: OLWarpedMapEvent) => {
    //     const mapId = event.data as string
    //     const warpedMap = $warpedMapSource?.getMap(mapId)

    //     if (warpedMap) {
    //       updateVectorLayer(warpedMap)
    //     }
    //   }
    // )

    const element = $ol.getTargetElement()
    if (element) {
      element.addEventListener('contextmenu', (event) => {
        if ($ol) {
          event.preventDefault()

          const feature = $ol.forEachFeatureAtPixel(
            $ol.getEventPixel(event),
            (feature) => feature
          )

          if (feature) {
            showContextMenu = {
              event,
              feature
            }
          }
        }
      })
    }

    if (!$sourceLoading && $sourcesCount > 0) {
      updateWarpedMapLayer()
    }
  })

  onDestroy(() => {
    $ol = undefined
  })
</script>

<div id="ol" class="w-full h-full" />
{#if showContextMenu}
  <ContextMenu show={showContextMenu} />
{/if}
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
