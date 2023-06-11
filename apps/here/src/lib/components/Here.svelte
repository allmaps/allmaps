<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import Map from 'ol/Map.js'
  import Point from 'ol/geom/Point.js'
  import View from 'ol/View.js'
  import CircleStyle from 'ol/style/Circle.js'
  import Fill from 'ol/style/Fill.js'
  import Stroke from 'ol/style/Stroke.js'
  import Style from 'ol/style/Style.js'
  import VectorSource from 'ol/source/Vector.js'
  import IIIF from 'ol/source/IIIF.js'
  import IIIFInfo from 'ol/format/IIIFInfo.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorLayer from 'ol/layer/Vector.js'

  import 'ol/ol.css'

  import { GCPTransformer } from '@allmaps/transform'

  import { positionToGeoJson } from '$lib/shared/position.js'

  import { map } from '$lib/shared/stores/maps.js'
  import { imageInfo } from '$lib/shared/stores/image-info.js'
  import { position } from '$lib/shared/stores/geolocation.js'

  $: {
    if ($position && transformer) {
      const feature = positionToGeoJson($position)
      if (positionFeature) {
        const imageCoordinates = transformer.fromGeoJSONPoint(feature.geometry)
        positionFeature.setGeometry(
          new Point([imageCoordinates[0], -imageCoordinates[1]])
        )
      }
    }
  }

  let transformer: GCPTransformer

  let ol: HTMLElement
  let positionFeature: Feature

  onMount(async () => {
    if (!$imageInfo || !$map) {
      return
    }

    transformer = new GCPTransformer($map.gcps)

    const tileLayer = new TileLayer()

    positionFeature = new Feature()

    positionFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: '#0a84fe'
          }),
          stroke: new Stroke({
            color: '#fff',
            width: 3
          })
        })
      })
    )

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [positionFeature]
      })
    })

    const olMap = new Map({
      layers: [tileLayer, vectorLayer],
      target: ol
    })

    const options = new IIIFInfo($imageInfo).getTileSourceOptions()
    options.zDirection = -1
    const iiifTileSource = new IIIF(options)
    tileLayer.setSource(iiifTileSource)

    const tileGrid = iiifTileSource.getTileGrid()

    if (tileGrid) {
      olMap.setView(
        new View({
          resolutions: tileGrid.getResolutions(),
          extent: tileGrid.getExtent(),
          constrainOnlyCenter: true
        })
      )
      olMap.getView().fit(tileGrid.getExtent())
    }
  })
</script>

<div bind:this={ol} class="w-full h-full" />
