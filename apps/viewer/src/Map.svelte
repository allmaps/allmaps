<script>
  import { onMount } from 'svelte'

  import Map from 'ol/Map'
  import { Tile as TileLayer, Vector as VectorLayer } from 'ol/layer'
  import { Vector as VectorSource } from 'ol/source'
  import { Fill, Stroke, Style } from 'ol/style'
  import {GeoJSON} from 'ol/format'
  import XYZ from 'ol/source/XYZ'
  import View from 'ol/View'
  import { fromLonLat } from 'ol/proj'

  import { WarpedMapLayer } from '@allmaps/layers'
  import { createTransformer, toWorld } from '@allmaps/transform'

  export let map

  let ol
  let warpedMapLayer

  let vectorSource
  let vectorLayer

  $: updateMap(map)

  async function updateMap (map) {
    if (warpedMapLayer) {
      ol.removeLayer(warpedMapLayer)
    }

    if (ol) {
      vectorSource.clear()

      const transformArgs = createTransformer(map.gcps)
      const polygon = map.pixelMask.map((point) => toWorld(transformArgs, point))
      const geoMask = {
        type: 'Polygon',
        coordinates: [polygon]
      }

      vectorSource.addFeature((new GeoJSON()).readFeature(geoMask, { featureProjection: 'EPSG:3857' }))

      const imageUri = map.imageService['@id']
      const image = await fetchImage(imageUri)
      const options = {
        image,
        georeferencedMap: map
      }
      warpedMapLayer = new WarpedMapLayer(options)
      ol.addLayer(warpedMapLayer)

      const extent = vectorSource.getExtent()

      ol.getView().fit(extent, {
        // TODO: move to settings file
        padding: [10, 10, 10, 10],
        maxZoom: 18
      })
    }
  }

  async function fetchImage (imageUri) {
    const response = await fetch(`${imageUri}/info.json`)
    const image = await response.json()
    return image
  }

  onMount(async () => {
    // https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png
    const baseLayer = new TileLayer({
      source: new XYZ({
        url: 'https://a.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}.png'
      })
    })

    vectorSource = new VectorSource()
    vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: 'rgb(248, 193, 79)',
          width: 3
        })
      })
    })

    vectorLayer.setZIndex(100)

    ol = new Map({
      layers: [baseLayer, vectorLayer],
      target: 'ol',
      // controls: [],
      view: new View({
        enableRotation: false,
        minZoom: 6,
        maxZoom: 20,
        zoom: 12
      })
    })

    updateMap(map)
  })
</script>

<div id="ol">
</div>

<style>
  #ol {
    position: absolute;
    width: 100%;
    height: 100%;
  }
</style>