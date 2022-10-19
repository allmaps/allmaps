<script lang="ts">
  import { onMount } from 'svelte'

  import { Header } from '@allmaps/ui-components'

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

  import 'ol/ol.css'

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

<div class="absolute w-full h-full flex flex-col">
  <Header appName="Explore" />
  <div id="ol" class="w-full h-full" />
</div>
