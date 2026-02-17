<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap, addProtocol } from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import {
    WarpedMapLayer,
    WarpedMapList,
    WebGL2WarpedMap
  } from '@allmaps/maplibre'

  import { basemapStyle } from '@allmaps/basemap'

  let container: HTMLElement

  let map: MapLibreMap
  let warpedMapList: WarpedMapList<WebGL2WarpedMap>
  let warpedMapLayer: WarpedMapLayer

  const annotationUrl =
    'https://annotations.allmaps.org/manifests/631b96e4d6d3f421'

  onMount(async () => {
    const annotation = await fetch(annotationUrl).then((response) =>
      response.json()
    )

    warpedMapList = new WarpedMapList()
    await warpedMapList.addGeoreferenceAnnotation(annotation)
    const center = warpedMapList.getMapsCenter({
      projection: { definition: 'EPSG:4326' }
    })
    const bbox = warpedMapList.getMapsBbox({
      projection: { definition: 'EPSG:4326' }
    })

    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      // @ts-expect-error MapLibre types are incompatible
      style: basemapStyle('en'),
      center,
      zoom: 7,
      maxPitch: 0,
      hash: true,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true
      }
    })

    map.once('load', () => {
      warpedMapLayer = new WarpedMapLayer({ warpedMapList })
      warpedMapLayer.addGeoreferenceAnnotationByUrl(
        'https://annotations.allmaps.org/manifests/a0d6d3379cfd9f0a'
      )
      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)
      if (bbox) {
        map.fitBounds(bbox, { padding: 20 })
      }
    })
  })
</script>

<main class="grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>
</main>
