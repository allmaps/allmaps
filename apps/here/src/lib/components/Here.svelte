<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import OLMap from 'ol/Map.js'
  import Point from 'ol/geom/Point.js'
  import LineString from 'ol/geom/LineString.js'
  import View from 'ol/View.js'
  import Icon from 'ol/style/Icon.js'
  import Style from 'ol/style/Style.js'
  import Stroke from 'ol/style/Stroke.js'
  import VectorSource from 'ol/source/Vector.js'
  import IIIF from 'ol/source/IIIF.js'
  import IIIFInfo from 'ol/format/IIIFInfo.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorLayer from 'ol/layer/Vector.js'

  import 'ol/ol.css'

  import { GcpTransformer } from '@allmaps/transform'
  import { pink } from '@allmaps/tailwind'

  import { positionToGeoJsonFeature } from '$lib/shared/position.js'

  import { getMapsState } from '$lib/state/maps.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'
  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'

  import Controls from '$lib/components/Controls.svelte'
  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'
  import type { GeojsonLineString } from '@allmaps/types'

  import type { MapWithImageInfo } from '$lib/shared/types.js'

  import HereIcon from '$lib/shared/images/here.svg?raw'
  import HereOrientationIcon from '$lib/shared/images/here-orientation.svg?raw'

  const mapsState = getMapsState()
  const imageInfoState = getImageInfoState()
  const sensorsState = getSensorsState()
  const compassState = getCompassState()

  let mounted = $state(false)
  let lastSelectedMapId = $state<string>()

  type Props = {
    selectedMapId: string
    geojsonRoute?: GeojsonLineString
    // sharedCoordinates?
    // backgroundColor?
  }

  let { selectedMapId, geojsonRoute }: Props = $props()

  // const mapWithImageInfo = mapsState.getMapWithImageInfo(selectedMapId)
  // let selectedMapBearing = $derived(
  //   mapWithImageInfo ? computeGeoreferencedMapBearing(mapWithImageInfo.map) : 0
  // )

  let transformer: GcpTransformer

  let ol = $state<HTMLElement>()
  let olMap = $state<OLMap>()

  const tileLayer = new TileLayer()
  const positionFeature = new Feature()
  const geojsonFeature = new Feature()

  geojsonFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: 'white',
        width: 4
      })
    }),
    new Style({
      stroke: new Stroke({
        color: pink,
        width: 3
      })
    })
  ])

  let dragging = $state(false)

  function setResourceRotation(rotationRad: number) {
    if (olMap) {
      olMap.getView().animate({
        rotation: rotationRad,
        duration: 100
      })
    }
  }

  function setPinRotation(rotationRad: number) {
    if (positionFeature) {
      const style = positionFeature.getStyle() as Style
      const image = style?.getImage()
      image?.setRotation(rotationRad)
      positionFeature.changed()
    }
  }

  // eslint-disable-next-line no-undef
  function updatePosition(position?: GeolocationPosition) {
    if (position && transformer) {
      const feature = positionToGeoJsonFeature(position)
      if (positionFeature) {
        const imageCoordinates = transformer.transformBackward(feature.geometry)
        positionFeature.setGeometry(
          new Point([imageCoordinates[0], -imageCoordinates[1]])
        )
      }
    }
  }

  function update(mapWithImageInfo: MapWithImageInfo) {
    lastSelectedMapId = mapWithImageInfo.mapId

    if (!mounted || !olMap) {
      return
    }

    const map = mapWithImageInfo.map
    const imageInfo = mapWithImageInfo.imageInfo

    transformer = new GcpTransformer(map.gcps, map.transformation?.type)

    const options = new IIIFInfo(
      imageInfo as ImageInformationResponse
    ).getTileSourceOptions()
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

      let projectedGeojsonRoute: GeojsonLineString | undefined
      if (geojsonRoute) {
        projectedGeojsonRoute =
          transformer.transformBackwardAsGeojson(geojsonRoute)
        geojsonFeature.setGeometry(
          new LineString(
            projectedGeojsonRoute.coordinates.map((c) => [c[0], -c[1]])
          )
        )
      }

      olMap.on('pointerdrag', () => {
        dragging = true
      })

      view.on('change:rotation', () => {
        if (dragging) {
          compassState.compassMode = 'custom'
          compassState.customRotation =
            view.getRotation() * (180 / Math.PI) +
            compassState.selectedMapBearing
        }
      })
    }

    updatePosition(sensorsState.position)

    lastSelectedMapId = map.id
  }

  function setFeatureImage(svg: string) {
    // Important! SVG's width, height and viewbox must be set!
    const iconSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`

    positionFeature.setStyle(
      new Style({
        image: new Icon({
          opacity: 1,
          rotateWithView: true,
          width: 40,
          height: 40,
          src: iconSrc
        })
      })
    )
  }

  onMount(async () => {
    if (sensorsState.hasOrientation) {
      setFeatureImage(HereOrientationIcon)
    } else {
      setFeatureImage(HereIcon)
    }

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [geojsonFeature, positionFeature]
      })
    })

    olMap = new OLMap({
      layers: [tileLayer, vectorLayer],
      target: ol,
      controls: []
    })

    mounted = true

    const map = await mapsState.fetchMapFromMapId(selectedMapId)
    if (map) {
      imageInfoState.fetchImageInfo(map.resource.id)
    }
  })

  $effect(() => {
    updatePosition(sensorsState.position)
  })

  $effect(() => {
    if (compassState.compassMode !== 'custom') {
      dragging = false
    }

    if (compassState.compassMode === 'image') {
      setResourceRotation(0)
    } else if (compassState.compassMode === 'north') {
      setResourceRotation(-compassState.selectedMapBearing * (Math.PI / 180))
    } else if (
      compassState.compassMode === 'follow-orientation' &&
      sensorsState.orientationAlpha
    ) {
      setResourceRotation(
        (sensorsState.orientationAlpha + compassState.selectedMapBearing + 45) *
          (Math.PI / 180)
      )

      setPinRotation(
        sensorsState.orientationAlpha * (Math.PI / 180)
        // (360 -
        //   (sensorsState.orientationAlpha +
        //     compassState.selectedMapBearing +
        //     45)) *
        //   (Math.PI / 180)
      )
    }
  })

  $effect(() => {
    if (olMap) {
      if (sensorsState.hasOrientation) {
        setFeatureImage(HereOrientationIcon)
      } else {
        setFeatureImage(HereIcon)
      }
    }
  })

  $effect(() => {
    if (
      sensorsState.orientationAlpha &&
      compassState.compassMode !== 'follow-orientation'
    ) {
      setPinRotation(
        (-sensorsState.orientationAlpha + compassState.selectedMapBearing) *
          (Math.PI / 180)
      )
    } else if (compassState.compassMode === 'follow-orientation') {
      // setPinRotation(
      //   (-sensorsState.orientationAlpha + compassState.selectedMapBearing) *
      //     (Math.PI / 180)
      // )
    }
  })

  $effect(() => {
    if (mounted) {
      const mapWithImageInfo = mapsState.getMapWithImageInfo(selectedMapId)
      if (mapWithImageInfo && lastSelectedMapId !== mapWithImageInfo.mapId) {
        update(mapWithImageInfo)
      }
    }
  })
</script>

<DotsPattern color={pink} opacity={0.5}>
  <div bind:this={ol} class="w-full h-full"></div>
</DotsPattern>

<div class="absolute z-50 bottom-0 w-full p-2 pointer-events-none">
  <Controls {selectedMapId} />
</div>
