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
    'https://sammeltassen.nl/iiif-manifests/allmaps/rotterdam-1897.json'

  onMount(() => {
    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      // @ts-expect-error MapLibre types are incompatible
      style: basemapStyle('en'),
      maxPitch: 0,
      hash: true,
      attributionControl: false
    })

    map.once('load', () => {
      warpedMapLayer = new WarpedMapLayer()

      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)

      warpedMapLayer.addGeoreferenceAnnotationByUrl(annotationUrl).then(() => {
        const bounds = warpedMapLayer.getBounds()
        if (bounds) {
          map.fitBounds(bounds as unknown as maplibregl.LngLatBoundsLike)
        }
      })
    })
  })
</script>

<main class="grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>
</main>
