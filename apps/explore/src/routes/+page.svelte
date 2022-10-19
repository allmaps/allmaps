<script lang="ts">
  import { onMount } from 'svelte'

  import Map from 'ol/Map.js'

  import TileLayer from 'ol/layer/Tile.js'
  import VectorTileLayer from 'ol/layer/VectorTile.js'
  import VectorTileSource from 'ol/source/VectorTile.js'
  import MVTFormat from 'ol/format/MVT.js'
  import OSMSource from 'ol/source/OSM.js'
  import Style from 'ol/style/Style.js'
  import Stroke from 'ol/style/Stroke.js'
  import View from 'ol/View.js'
  import { fromLonLat } from 'ol/proj.js'

  let ol: Map

  onMount(async () => {
    const vtLayer = new VectorTileLayer({
      declutter: false,
      source: new VectorTileSource({
        format: new MVTFormat(),
        url: 'https://api.allmaps.org/maps/{z}/{x}/{y}.mvt'
      }),
      style: new Style({
        stroke: new Stroke({
          color: 'red',
          width: 1
        })
      })
    })

    ol = new Map({
      layers: [
        new TileLayer({
          source: new OSMSource()
        }),
        vtLayer
      ],
      target: 'ol',
      // controls: [],
      view: new View({
        center: fromLonLat([-77.41, 37.5]),
        zoom: 10
      })
    })
  })
</script>

<h1>Allmaps Explore</h1>

<div id="ol">s</div>

<style>
  #ol {
    position: absolute;
    width: 100%;
    height: 100%;
  }
</style>
