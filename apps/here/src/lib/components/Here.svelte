<script lang="ts">
  import { onMount } from 'svelte'

  import Feature from 'ol/Feature.js'
  import OLMap from 'ol/Map.js'
  import OLPoint from 'ol/geom/Point.js'
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

  import DotsPattern from '$lib/components/DotsPattern.svelte'

  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'
  import type { Options as FeatureIconOptions } from 'ol/style/Icon.js'
  import type { GeojsonLineString, Point } from '@allmaps/types'

  import type { MapWithImageInfo } from '$lib/shared/types.js'

  import HereIcon from '$lib/shared/images/here.svg?raw'
  import HereOrientationIcon from '$lib/shared/images/here-orientation.svg?raw'
  import Pin from '$lib/shared/images/pin.svg?raw'
  import PinShadow from '$lib/shared/images/pin-shadow.svg?raw'

  const mapsState = getMapsState()
  const imageInfoState = getImageInfoState()
  const sensorsState = getSensorsState()
  const compassState = getCompassState()

  let mounted = $state(false)
  let lastSelectedMapId = $state<string>()

  type FeatureIconSvg = {
    svg: string
  }

  type Props = {
    selectedMapId: string
    geojsonRoute?: GeojsonLineString
    from?: Point
  }

  let { selectedMapId, geojsonRoute, from }: Props = $props()

  // const mapWithImageInfo = mapsState.getMapWithImageInfo(selectedMapId)
  // let selectedMapBearing = $derived(
  //   mapWithImageInfo ? computeGeoreferencedMapBearing(mapWithImageInfo.map) : 0
  // )

  let transformer: GcpTransformer

  let ol = $state<HTMLElement>()
  let olMap = $state<OLMap>()

  const tileLayer = new TileLayer()
  const positionFeature = new Feature()
  const fromFeature = new Feature({})
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

  function rotateFeatureStyleImage(
    feature: Feature,
    style: Style,
    rotationRad: number
  ) {
    const image = style?.getImage()
    image?.setRotation(rotationRad)
    feature.changed()
  }

  function setPinRotation(rotationRad: number) {
    if (positionFeature) {
      const styleLike = positionFeature.getStyle()

      // here-orientation.svg is pointing east.
      // Substract 90 degrees to rotate it to north.
      const pinRotationRad = rotationRad - Math.PI / 2

      if (Array.isArray(styleLike)) {
        styleLike.map((style) =>
          rotateFeatureStyleImage(positionFeature, style, pinRotationRad)
        )
      } else if (styleLike && 'getImage' in styleLike) {
        rotateFeatureStyleImage(positionFeature, styleLike, pinRotationRad)
      }
    }
  }

  function updatePosition(position?: GeolocationPosition) {
    if (position && transformer) {
      const feature = positionToGeoJsonFeature(position)
      if (positionFeature) {
        const imageCoordinates = transformer.transformBackward(feature.geometry)
        positionFeature.setGeometry(
          new OLPoint([imageCoordinates[0], -imageCoordinates[1]])
        )
      }
    }
  }

  function updateFrom(from?: Point) {
    if (from && transformer) {
      const imageCoordinates = transformer.transformBackward([from[1], from[0]])
      fromFeature.setGeometry(
        new OLPoint([imageCoordinates[0], -imageCoordinates[1]])
      )
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
    updateFrom(from)

    lastSelectedMapId = map.id
  }

  function setPositionFeatureImage(svg: string) {
    setFeatureImage(positionFeature, [
      {
        rotateWithView: true,
        width: 40,
        height: 40,
        svg
      }
    ])
  }

  function setFeatureImage(
    feature: Feature,
    icons: (FeatureIconOptions & FeatureIconSvg)[]
  ) {
    feature.setStyle(
      icons.map(
        (icon) =>
          new Style({
            image: new Icon({
              ...icon,
              // Important! SVG's width, height and viewbox must be set!
              src: `data:image/svg+xml;utf8,${encodeURIComponent(icon.svg)}`
            })
          })
      )
    )
  }

  onMount(async () => {
    if (sensorsState.hasOrientation) {
      setPositionFeatureImage(HereOrientationIcon)
    } else {
      setPositionFeatureImage(HereIcon)
    }

    setFeatureImage(fromFeature, [
      {
        height: 20,
        displacement: [30, 0],
        svg: PinShadow
      },
      {
        width: 40,
        displacement: [0, 34],
        rotation: 0.2,
        svg: Pin
      }
    ])

    const vectorLayer = new VectorLayer({
      source: new VectorSource({
        features: [geojsonFeature, positionFeature, fromFeature]
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
        setPositionFeatureImage(HereOrientationIcon)
      } else {
        setPositionFeatureImage(HereIcon)
      }
    }
  })

  $effect(() => {
    if (olMap && from) {
      updateFrom(from)
    }
  })

  $effect(() => {
    if (
      sensorsState.orientationAlpha !== undefined &&
      compassState.compassMode !== 'follow-orientation'
    ) {
      console.log(
        'nu set pin rotation',
        -sensorsState.orientationAlpha,
        compassState.selectedMapBearing
      )
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
