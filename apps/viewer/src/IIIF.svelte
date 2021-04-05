<script>
  import { onMount } from 'svelte'

  import Map from 'ol/Map'
  import { IIIFLayer } from '@allmaps/layers'

  export let map

  let ol
  let iiifLayer

  $: updateMap(map)

  async function updateMap (map) {
    if (iiifLayer) {
      ol.removeLayer(iiifLayer)
    }

    if (ol) {
      const imageUri = map.image.uri
      const image = await fetchImage(imageUri)
      iiifLayer = new IIIFLayer(image)
      ol.addLayer(iiifLayer)

      ol.setView(iiifLayer.getView())
      ol.getView().fit(iiifLayer.getExtent(), {
        padding: [25, 25, 25, 25]
      })
    }
  }

  async function fetchImage (imageUri) {
    const response = await fetch(`${imageUri}/info.json`)
    const image = await response.json()
    return image
  }

  onMount(async () => {
    ol = new Map({
      layers: [],
      // controls: [],
      target: 'ol'
    })

    updateMap(map)
  })
</script>

<div id="ol" class="zoom-controls-bottom-left">
</div>

<style>
#ol {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>