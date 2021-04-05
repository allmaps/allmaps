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

  let xyz
  let baseLayer

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

      const imageUri = map.image.uri

      const image = await fetchImage(imageUri)
      const options = {
        image,
        georeferencedMap: map,

        source: new VectorSource()

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

  const tileSources = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
	    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  ]

  let tileSourceIndex = 0

  $: {
    if (xyz) {
      const tileUrl = tileSources[tileSourceIndex].url
      xyz.setUrl(tileUrl)
    }
  }

  onMount(async () => {
    const tileUrl = tileSources[tileSourceIndex].url
    // TODO: set attribution
    xyz = new XYZ(tileUrl)

    baseLayer = new TileLayer({
      source: xyz
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

  function handleKeydown (event) {
    if (event.code === 'Space') {
      warpedMapLayer.setVisible(false)
    }
  }

  function handleKeyup (event) {
    if (event.code === 'Space') {
      warpedMapLayer.setVisible(true)
    }
  }
</script>

<svelte:window
  on:keydown={handleKeydown}
  on:keyup={handleKeyup} />

<div id="ol" class="zoom-controls-bottom-left">
</div>

<div class="select-container">
  <div class="select">
    <select bind:value={tileSourceIndex} >
      <option value={0}>Map</option>
      <option value={2}>Satellite</option>
    </select>
  </div>
</div>

<style>
#ol {
  position: absolute;
  width: 100%;
  height: 100%;
}

.select-container {
  bottom: 0;
  right: 0;
  position: absolute;
  padding: 0.5em;
}
</style>