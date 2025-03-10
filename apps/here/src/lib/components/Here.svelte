<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import OLMap from 'ol/Map.js'
  import Point from 'ol/geom/Point.js'
  import View from 'ol/View.js'
  import Icon from 'ol/style/Icon.js'
  import Style from 'ol/style/Style.js'
  import VectorSource from 'ol/source/Vector.js'
  import IIIF from 'ol/source/IIIF.js'
  import IIIFInfo from 'ol/format/IIIFInfo.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorLayer from 'ol/layer/Vector.js'

  import 'ol/ol.css'

  import { GcpTransformer } from '@allmaps/transform'

  import { positionToGeoJson } from '$lib/shared/position.js'

  import { position } from '$lib/shared/stores/geolocation.js'
  import {
    selectedMapWithImageInfo,
    bearing
  } from '$lib/shared/stores/selected-map.js'
  import { rotation } from '$lib/shared/stores/rotation.js'
  import {
    orientationAlpha,
    hasOrientation
  } from '$lib/shared/stores/orientation.js'
  import { compassMode } from '$lib/shared/stores/compass-mode.js'

  import Controls from '$lib/components/Controls.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'

  import HereIcon from '$lib/shared/images/here.svg?raw'
  import HereOrientationIcon from '$lib/shared/images/here-orientation.svg?raw'

  let mounted = false
  let lastSelectedMapId: string | undefined = undefined

  let transformer: GcpTransformer

  let ol: HTMLElement
  let olMap: OLMap
  const tileLayer = new TileLayer()
  const positionFeature: Feature = new Feature()

  let dragging = false

  $: {
    updatePosition($position)
  }

  $: {
    if ($compassMode !== 'custom') {
      dragging = false
    }

    if ($compassMode === 'image') {
      setRotation(0)
    } else if ($compassMode === 'north') {
      setRotation(-$bearing)
    } else if ($compassMode === 'follow-orientation' && $orientationAlpha) {
      setRotation($bearing + $orientationAlpha)
    }
  }

  $: {
    if (olMap) {
      if ($hasOrientation) {
        setFeatureImage(HereOrientationIcon)
      } else {
        setFeatureImage(HereIcon)
      }
    }
  }

  $: {
    if ($orientationAlpha) {
      if (positionFeature) {
        const style = positionFeature.getStyle() as Style
        const image = style?.getImage()
        image?.setRotation($orientationAlpha * (Math.PI / 180) + $bearing)
        positionFeature.changed()
      }
    }
  }

  $: {
    if (
      $selectedMapWithImageInfo &&
      $selectedMapWithImageInfo.map.id !== lastSelectedMapId
    ) {
      update($selectedMapWithImageInfo)
    }
  }

  function setRotation(rotation: number) {
    if (olMap) {
      olMap.getView().animate({
        rotation: rotation * (Math.PI / 180),
        duration: 100
      })
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
    map: GeoreferencedMap
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
      const view = new View({
        resolutions: tileGrid.getResolutions(),
        extent: tileGrid.getExtent(),
        constrainOnlyCenter: true
      })

      olMap.setView(view)

      view.fit(tileGrid.getExtent())

      olMap.on('pointerdrag', () => {
        dragging = true
      })

      view.on('change:rotation', () => {
        if (dragging) {
          $compassMode = 'custom'
          $rotation = view.getRotation() * (180 / Math.PI) + $bearing
        }
      })
    }

    updatePosition($position)

    lastSelectedMapId = map.id
  }

  function setFeatureImage(svg: string) {
    positionFeature.setStyle(
      new Style({
        image: new Icon({
          opacity: 1,
          rotateWithView: true,
          width: 30,
          height: 30,
          src: 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
        })
      })
    )
  }

  onMount(() => {
    if ($hasOrientation) {
      setFeatureImage(HereOrientationIcon)
    } else {
      setFeatureImage(HereIcon)
    }

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [positionFeature]
      })
    })

    olMap = new OLMap({
      layers: [tileLayer, vectorLayer],
      target: ol,
      controls: []
    })

    mounted = true

    if ($selectedMapWithImageInfo) {
      update($selectedMapWithImageInfo)
    }
  })
</script>

<div bind:this={ol} class="w-full h-full" />

<div class="absolute z-50 bottom-0 w-full p-2">
  <Controls />
</div>
