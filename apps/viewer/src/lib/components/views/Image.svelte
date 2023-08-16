<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import Polygon from 'ol/geom/Polygon.js'

  import { fetchImageInfo } from '@allmaps/stdlib'

  import {
    imageInfoCache,
    imageOl,
    imageIiifLayer,
    imageVectorSource
  } from '$lib/shared/stores/openlayers.js'
  import { activeMap } from '$lib/shared/stores/active.js'

  import { maskToPolygon } from '$lib/shared/openlayers.js'

  import { computeBBox } from '@allmaps/stdlib'

  import type { ViewerMap } from '$lib/shared/types.js'

  $: {
    if (imageOl && $activeMap) {
      updateMap($activeMap.viewerMap)
    }
  }

  function updateVectorSource(viewerMap: ViewerMap) {
    const map = viewerMap.map

    const feature = new Feature({
      index: 0,
      geometry: new Polygon(maskToPolygon(map.pixelMask))
    })

    feature.setId(map.id)

    imageVectorSource.clear()
    imageVectorSource.addFeature(feature)
  }

  async function updateMap(viewerMap: ViewerMap) {
    if (imageOl && imageIiifLayer) {
      updateVectorSource(viewerMap)

      const map = viewerMap.map

      const imageUri = map.image.uri
      const imageInfo = await fetchImageInfo(imageUri, {
        cache: imageInfoCache
      })

      imageIiifLayer.setImageInfo(imageInfo)

      const pixelMaskBbox = computeBBox(viewerMap.map.pixelMask)
      const iiifLayerPixelMaskBbox = [
        pixelMaskBbox[0],
        -pixelMaskBbox[3],
        pixelMaskBbox[2],
        -pixelMaskBbox[1]
      ]

      imageOl.getView().fit(iiifLayerPixelMaskBbox, {
        padding: [25, 25, 25, 25]
      })
    }
  }

  onMount(() => {
    imageOl?.setTarget('ol')

    return () => {
      imageOl?.setTarget()
    }
  })
</script>

<div id="ol" class="w-full h-full" />
