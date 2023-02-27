<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import { ol } from '$lib/shared/stores/openlayers.js'
  import { highlightedMap } from '$lib/shared/stores/highlighted.js'

  import OLMap from 'ol/Map.js'
  import Feature from 'ol/Feature'
  import { Vector as VectorLayer } from 'ol/layer'
  import { Polygon } from 'ol/geom'
  import { Vector as VectorSource } from 'ol/source'

  import {
    selectedPolygonStyle,
    maskToPolygon
  } from '$lib/shared/openlayers.js'

  import { IIIFLayer } from '@allmaps/openlayers'

  import type { ViewerMap } from '$lib/shared/types.js'

  let iiifLayer: IIIFLayer
  let vectorSource: VectorSource
  let vectorLayer: VectorLayer<VectorSource>

  $: updateMap($highlightedMap)

  function updateVectorLayer(viewerMap: ViewerMap) {
    const map = viewerMap.map

    const feature = new Feature({
      index: 0,
      geometry: new Polygon(maskToPolygon(map.pixelMask))
    })

    feature.setId(map.id)

    vectorSource.clear()
    vectorSource.addFeature(feature)
  }

  async function updateMap(viewerMap: ViewerMap) {
    if ($ol && iiifLayer) {
      $ol.removeLayer(iiifLayer)
    }

    if ($ol) {
      const map = viewerMap.map

      const imageUri = map.image.uri
      const imageInfo = await fetchImageInfo(imageUri)

      updateVectorLayer(viewerMap)

      iiifLayer = new IIIFLayer(imageInfo)
      $ol.addLayer(iiifLayer)

      iiifLayer.setZIndex(1)
      vectorLayer.setZIndex(2)

      const extent = iiifLayer.getExtent()

      if (extent) {
        $ol.getView().fit(extent, {
          padding: [25, 25, 25, 25]
        })
      }
    }
  }

  // TODO: move to stdlib
  async function fetchImageInfo(imageUri: string) {
    const response = await fetch(`${imageUri}/info.json`)
    const image = await response.json()
    return image
  }

  onMount(async () => {
    vectorSource = new VectorSource()
    vectorLayer = new VectorLayer({
      source: vectorSource,
      style: selectedPolygonStyle
    })

    $ol = new OLMap({
      controls: [],
      layers: [vectorLayer],
      target: 'ol'
    })

    await updateMap($highlightedMap)
  })

  onDestroy(() => {
    $ol = undefined
  })
</script>

<div id="ol" class="w-full h-full" />
