<script lang="ts">
  import { onMount } from 'svelte'

  import Map from 'ol/Map.js'
  import VectorLayer from 'ol/layer/Vector.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorSource from 'ol/source/Vector.js'
  import Stroke from 'ol/style/Stroke.js'
  import Style from 'ol/style/Style.js'
  import GeoJSON from 'ol/format/GeoJSON.js'
  import XYZ from 'ol/source/XYZ.js'
  import View from 'ol/View.js'
  import { fromLonLat } from 'ol/proj.js'

  import {
    createTransformer,
    svgPolygonToGeoJSONPolygon
  } from '@allmaps/transform'
  import { IIIF } from '@allmaps/iiif-parser'

  import { WarpedMapLayer, WarpedMapSource } from '@allmaps/openlayers'

  import type { Map as MapType, Annotation } from '@allmaps/annotation'

  export let annotation: Annotation

  let ol: Map
  let warpedMapLayer: WarpedMapLayer
  let warpedMapSource: WarpedMapSource

  let vectorSource
  let vectorLayer

  let xyz: XYZ
  let baseLayer

  $: updateAnnotation(annotation)

  async function updateAnnotation(annotation: Annotation) {
    if (ol && warpedMapSource) {
      // vectorSource.clear()

      await warpedMapSource.addGeorefAnnotation(annotation)

      // const transformArgs = createTransformer(map.gcps)

      // // TODO: what happens with maps without pixelMask?!
      // // Make sure annotation parser/generator always adds pixelMask!
      // if (map.pixelMask && map.pixelMask.length) {
      //   const geoMask = svgPolygonToGeoJSONPolygon(transformArgs, map.pixelMask)
      //   vectorSource.addFeature((new GeoJSON()).readFeature(geoMask, { featureProjection: 'EPSG:3857' }))
      // }

      // const imageUri = map.image.uri

      // const image = await fetchImage(imageUri)
      // const parsedImage = parseIiif(image)

      // const options = {
      //   parsedImage,
      //   georeferencedMap: map,
      //   source: new VectorSource()
      // }

      // warpedMapLayer = new WarpedMapLayer(options)
      // ol.addLayer(warpedMapLayer)

      // warpedMapLayer.on('tile-load-error', (event) => {
      //   TODO: this is probably a CORS error! Show these!
      //   TODO: and show other errors as well...
      // })

      const extent = warpedMapSource.getExtent()
      if (extent) {
        ol.getView().fit(extent, {
          padding: [25, 25, 25, 25]
          // maxZoom: 18
        })
      }
    }
  }

  // async function fetchImage(imageUri: string) {
  //   const response = await fetch(`${imageUri}/info.json`)
  //   const image = await response.json()
  //   return image
  // }

  const tileSources = [
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution:
        'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
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
    xyz = new XYZ({
      url: tileUrl,
      maxZoom: 19
    })

    baseLayer = new TileLayer({
      source: xyz
    })

    // vectorSource = new VectorSource()
    // vectorLayer = new VectorLayer({
    //   source: vectorSource,
    //   style: new Style({
    //     stroke: new Stroke({
    //       color: 'rgb(248, 193, 79)',
    //       width: 3
    //     })
    //   })
    // })

    // vectorLayer.setZIndex(100)

    warpedMapSource = new WarpedMapSource()
    warpedMapLayer = new WarpedMapLayer({
      source: warpedMapSource
    })

    ol = new Map({
      layers: [baseLayer, warpedMapLayer],
      target: 'ol',
      // controls: [],
      view: new View({
        // center: [-7914732, 5209134],

        // minZoom: 6,
        maxZoom: 24,
        zoom: 12
      })
    })

    updateAnnotation(annotation)
  })

  function handleKeydown(event: KeyboardEvent) {
    if (event.code === 'Space') {
      warpedMapLayer.setVisible(false)
    }
  }

  function handleKeyup(event: KeyboardEvent) {
    if (event.code === 'Space') {
      warpedMapLayer.setVisible(true)
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} on:keyup={handleKeyup} />

<div id="ol" class="zoom-controls-bottom-left" />

<div class="select-container">
  <div class="select">
    <select bind:value={tileSourceIndex}>
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
