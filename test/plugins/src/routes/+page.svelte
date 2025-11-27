<script lang="ts">
  import { onMount } from 'svelte'

  import { Map as MapLibreMap, addProtocol } from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { WarpedMapLayer } from '@allmaps/maplibre'

  import { basemapStyle } from '@allmaps/basemap'

  let container: HTMLElement

  let map: MapLibreMap
  let warpedMapLayer: WarpedMapLayer

  const annotationUrl =
    'https://pages.allmaps.org/sprite-test/a5912d5d11a3ef64/128/thumbnail-sprites-annotation.json'

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      // @ts-expect-error MapLibre types are incompatible
      style: basemapStyle('en'),
      center: [14.2437, 40.8384],
      zoom: 7,
      maxPitch: 0,
      hash: true,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true
      }
    })

    map.once('load', () => {
      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)

      warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl)
    })
  })
</script>

<main class="grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>
</main>
