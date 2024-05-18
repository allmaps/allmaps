<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import OLMap from 'ol/Map.js'
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

  import { GcpTransformer } from '@allmaps/transform'
  import { pink } from '@allmaps/tailwind'

  import { positionToGeoJson } from '$lib/shared/position.js'

  import { position } from '$lib/shared/stores/geolocation.js'
  import { selectedMapWithImageInfo } from '$lib/shared/stores/selected-map.js'

  import Controls from '$lib/components/Controls.svelte'

  import type { Map } from '@allmaps/annotation'
  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

  let mounted = false
  let lastSelectedMapId: string | undefined = undefined

  let transformer: GcpTransformer

  let ol: HTMLElement
  let olMap: OLMap
  const tileLayer = new TileLayer()
  const positionFeature: Feature = new Feature()

  $: {
    updatePosition($position)
  }

  $: {
    if (
      $selectedMapWithImageInfo &&
      $selectedMapWithImageInfo.map.id !== lastSelectedMapId
    ) {
      update($selectedMapWithImageInfo)
    }
  }

  // eslint-disable-next-line no-undef
  function updatePosition(position: GeolocationPosition) {
    if (position && transformer) {
      const feature = positionToGeoJson(position)
      if (positionFeature) {
        const imageCoordinates = transformer.transformBackward(feature.geometry)
        positionFeature.setGeometry(
          new Point([imageCoordinates[0], -imageCoordinates[1]])
        )
      }
    }
  }

  function update(mapWithImageInfo: {
    map: Map
    imageInfo: ImageInformationResponse
  }) {
    if (!mounted) {
      return
    }

    const map = mapWithImageInfo.map
    const imageInfo = mapWithImageInfo.imageInfo

    transformer = new GcpTransformer(map.gcps, map.transformation?.type)

    const options = new IIIFInfo(imageInfo).getTileSourceOptions()
    if (options) {
      options.zDirection = -1
    }
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

    updatePosition($position)

    lastSelectedMapId = map.id
  }

  onMount(async () => {
    positionFeature.setStyle(
      new Style({
        image: new CircleStyle({
          radius: 7,
          fill: new Fill({
            color: pink
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

    olMap = new OLMap({
      layers: [tileLayer, vectorLayer],
      target: ol
    })

    mounted = true

    if ($selectedMapWithImageInfo) {
      update($selectedMapWithImageInfo)
    }
  })
</script>

<div bind:this={ol} class="w-full h-full" />

<div class="absolute z-50 bottom-0 w-full flex justify-center p-4">
  <Controls />
</div>
