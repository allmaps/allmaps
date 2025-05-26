<script lang="ts">
  import { onMount } from 'svelte'
  import { page } from '$app/state'

  import Feature from 'ol/Feature.js'
  import OLMap from 'ol/Map.js'
  import OLPoint from 'ol/geom/Point.js'
  import LineString from 'ol/geom/LineString.js'
  import View from 'ol/View.js'
  import Icon from 'ol/style/Icon.js'
  import Style from 'ol/style/Style.js'
  import Stroke from 'ol/style/Stroke.js'
  import Fill from 'ol/style/Fill.js'
  import CircleStyle from 'ol/style/Circle.js'
  import VectorSource from 'ol/source/Vector.js'
  import IIIF from 'ol/source/IIIF.js'
  import IIIFInfo from 'ol/format/IIIFInfo.js'
  import TileLayer from 'ol/layer/Tile.js'
  import VectorLayer from 'ol/layer/Vector.js'

  import { Dialog } from 'bits-ui'
  import { X as XIcon } from 'phosphor-svelte'

  import { red } from '@allmaps/tailwind'
  import { isGeojsonPoint } from '@allmaps/stdlib'

  import { getSensorsState } from '$lib/state/sensors.svelte.js'
  import { getCompassState } from '$lib/state/compass.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getResourceTransformerState } from '$lib/state/resource-transformer.svelte.js'

  import type { ImageInformationResponse } from 'ol/format/IIIFInfo.js'
  import type { Options as FeatureIconOptions } from 'ol/style/Icon.js'
  import type TileGrid from 'ol/tilegrid/TileGrid.js'
  import type { MapBrowserEvent } from 'ol'

  import type { Point } from '@allmaps/types'

  import type { MapWithImageInfo, GeojsonRoute } from '$lib/shared/types.js'

  import HereIcon from '$lib/images/here.svg?raw'
  import HereOrientationIcon from '$lib/images/here-orientation.svg?raw'
  import Pin from '$lib/images/pin.svg?raw'
  import PinShadow from '$lib/images/pin-shadow.svg?raw'

  import 'ol/ol.css'

  const sensorsState = getSensorsState()
  const compassState = getCompassState()
  const uiState = getUiState()
  const resourceTransformerState = getResourceTransformerState()

  let mounted = $state(false)
  let currentMapId = $state<string>()

  let showFrom = $derived(page.route.id === '/maps/[mapId]/postcard')

  type FeatureIconSvg = {
    svg: string
  }

  type PopoverContents = {
    title?: string
    image?: string
    url?: string
    description?: string
  }

  type Props = {
    mapWithImageInfo: MapWithImageInfo
    geojsonRoute?: GeojsonRoute
    from?: Point
  }

  let { mapWithImageInfo, geojsonRoute, from }: Props = $props()

  let ol = $state.raw<HTMLElement>()
  let olMap = $state.raw<OLMap>()

  let popoverContents = $state<PopoverContents>()

  let geojsonRouteLayer: VectorLayer
  let geojsonMarkersLayer: VectorLayer
  let positionLayer: VectorLayer

  let positionImageCoordinates = $derived.by<Point | undefined>(() => {
    if (resourceTransformerState.resourcePosition) {
      return [
        resourceTransformerState.resourcePosition[0],
        -resourceTransformerState.resourcePosition[1]
      ]
    }
  })

  let fromImageCoordinates = $derived.by<Point | undefined>(() => {
    if (from && resourceTransformerState.transformer) {
      const imageCoordinates =
        resourceTransformerState.transformer.transformToResource([
          from[1],
          from[0]
        ])
      return [imageCoordinates[0], -imageCoordinates[1]]
    }
  })

  const tileLayer = new TileLayer()
  const positionFeature = new Feature()
  const fromFeature = new Feature({})
  const geojsonRouteFeature = new Feature()

  geojsonRouteFeature.setStyle([
    new Style({
      stroke: new Stroke({
        color: 'white',
        width: 5
      })
    }),
    new Style({
      stroke: new Stroke({
        color: red,
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

  function updatePositionFeature(imageCoordinates?: Point) {
    if (imageCoordinates) {
      showPositionFeature()

      positionFeature.setGeometry(new OLPoint(imageCoordinates))
    }
  }

  function updateFromFeature(imageCoordinates?: Point) {
    if (showFrom && imageCoordinates) {
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
      fromFeature.setGeometry(new OLPoint(imageCoordinates))
    } else {
      fromFeature.setStyle(undefined)
    }
  }

  function centerViewAroundPoint(view: View, tileGrid: TileGrid, point: Point) {
    view.setCenter([point[0], point[1]])
    view.setRotation(0)
    view.setZoom((tileGrid.getMinZoom() + tileGrid.getMaxZoom()) * 0.75)
  }

  function updateImage(mapWithImageInfo: MapWithImageInfo) {
    geojsonMarkersLayer.getSource()?.clear()

    if (!mounted || !olMap) {
      return
    }

    const imageInfo = mapWithImageInfo.imageInfo

    const options = new IIIFInfo(
      imageInfo as ImageInformationResponse
    ).getTileSourceOptions()

    if (!options) {
      return
    }

    options.zDirection = -1

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

      if (fromImageCoordinates) {
        centerViewAroundPoint(view, tileGrid, fromImageCoordinates)
      } else if (
        resourceTransformerState.resourcePositionInsideResource &&
        positionImageCoordinates
      ) {
        centerViewAroundPoint(view, tileGrid, positionImageCoordinates)
      } else {
        view.fit(tileGrid.getExtent(), {
          padding: [10, 10, 10, 10]
        })
      }

      if (
        geojsonRoute &&
        geojsonRoute.route &&
        resourceTransformerState.transformer
      ) {
        const transformer = resourceTransformerState.transformer

        const projectedGeojsonRoute = transformer.transformToResource(
          geojsonRoute.route.coordinates
        )
        geojsonRouteFeature.setGeometry(
          new LineString(projectedGeojsonRoute.map((c) => [c[0], -c[1]]))
        )

        const geojsonMarkerFeatures = geojsonRoute.markers.map((marker) => {
          if (isGeojsonPoint(marker.geometry)) {
            const projectedPoint = transformer.transformToResource(
              marker.geometry.coordinates
            )

            let title: string | undefined
            let image: string | undefined
            let url: string | undefined
            let description: string | undefined

            if (marker.properties && typeof marker.properties === 'object') {
              if (
                'title' in marker.properties &&
                typeof marker.properties.title === 'string'
              ) {
                title = marker.properties.title
              }

              if (
                'image' in marker.properties &&
                typeof marker.properties.image === 'string'
              ) {
                image = marker.properties.image
              }

              if (
                'description' in marker.properties &&
                typeof marker.properties.description === 'string'
              ) {
                description = marker.properties.description
              }

              if (
                'url' in marker.properties &&
                typeof marker.properties.url === 'string'
              ) {
                url = marker.properties.url
              }
            }

            return new Feature({
              geometry: new OLPoint([projectedPoint[0], -projectedPoint[1]]),
              title,
              image,
              url,
              description
            })
          }
        })

        geojsonMarkersLayer.getSource()?.addFeatures(geojsonMarkerFeatures)
      }

      olMap.on('pointerdrag', () => {
        dragging = true
      })

      view.on('change:rotation', () => {
        if (dragging) {
          compassState.compassMode = 'custom'
          compassState.customRotation =
            view.getRotation() * (180 / Math.PI) +
            (compassState.selectedMapBearing || 0)
        }
      })
    }

    updatePositionFeature(positionImageCoordinates)
    updateFromFeature(fromImageCoordinates)

    currentMapId = mapWithImageInfo.map.id
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

  function closeMarkerDialog() {
    popoverContents = undefined
  }

  // function hidePositionFeature() {
  //   positionFeature.setStyle()
  // }

  function showPositionFeature() {
    if (sensorsState.hasOrientation) {
      setPositionFeatureImage(HereOrientationIcon)
    } else {
      setPositionFeatureImage(HereIcon)
    }
  }

  onMount(() => {
    showPositionFeature()

    // setFeatureImage(fromFeature, [
    //   {
    //     height: 20,
    //     displacement: [30, 0],
    //     svg: PinShadow
    //   },
    //   {
    //     width: 40,
    //     displacement: [0, 34],
    //     rotation: 0.2,
    //     svg: Pin
    //   }
    // ])

    geojsonRouteLayer = new VectorLayer({
      source: new VectorSource({
        features: [geojsonRouteFeature]
      })
    })

    geojsonMarkersLayer = new VectorLayer({
      source: new VectorSource({
        features: []
      }),
      style: [
        new Style({
          image: new CircleStyle({
            radius: 9,
            fill: new Fill({
              color: 'white'
            })
          })
        }),
        new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({
              color: 'white'
            }),
            stroke: new Stroke({
              color: red,
              width: 4
            })
          })
        })
      ]
    })

    positionLayer = new VectorLayer({
      source: new VectorSource({
        features: [positionFeature, fromFeature]
      })
    })

    olMap = new OLMap({
      layers: [
        tileLayer,
        geojsonRouteLayer,
        geojsonMarkersLayer,
        positionLayer
      ],
      target: ol,
      controls: []
    })

    olMap.on('postrender', () => {
      if (olMap && fromImageCoordinates) {
        const fromScreenCoordinates =
          olMap.getPixelFromCoordinate(fromImageCoordinates)

        uiState.fromScreenCoordinates = [
          Math.round(fromScreenCoordinates[0]),
          Math.round(fromScreenCoordinates[1])
        ]
      }

      if (olMap && positionImageCoordinates) {
        const positionScreenCoordinates = olMap.getPixelFromCoordinate(
          positionImageCoordinates
        )

        // Somehow, positionScreenCoordinates is null sometimes, (maybe only
        // during the component is being unmounted?)
        if (positionScreenCoordinates) {
          uiState.positionScreenCoordinates = [
            Math.round(positionScreenCoordinates[0]),
            Math.round(positionScreenCoordinates[1])
          ]
        }
      }
    })

    olMap.on('click', (event: MapBrowserEvent<UIEvent>) => {
      if (olMap) {
        const features = olMap.getFeaturesAtPixel(event.pixel, {
          layerFilter: (layer) => layer === geojsonMarkersLayer,
          hitTolerance: 10
        })

        const feature = features[0]

        if (feature) {
          popoverContents = {
            title: feature.get('title'),
            image: feature.get('image'),
            url: feature.get('url'),
            description: feature.get('description')
          }
        } else {
          closeMarkerDialog()
        }
      }
    })

    olMap.on('pointermove', (event: MapBrowserEvent<UIEvent>) => {
      if (olMap) {
        const hit = olMap.hasFeatureAtPixel(event.pixel, {
          layerFilter: (layer) => layer === geojsonMarkersLayer,
          hitTolerance: 10
        })
        olMap.getTargetElement().style.cursor = hit ? 'pointer' : ''
      }
    })

    // Close the marker popover when the map is moved
    olMap.on('movestart', closeMarkerDialog)

    mounted = true
  })

  $effect(() => {
    updatePositionFeature(positionImageCoordinates)
  })

  $effect(() => {
    if (compassState.compassMode !== 'custom') {
      dragging = false
    }

    if (compassState.compassMode === 'image') {
      setResourceRotation(0)
    } else if (
      compassState.compassMode === 'north' &&
      compassState.selectedMapBearing !== undefined
    ) {
      setResourceRotation(-compassState.selectedMapBearing * (Math.PI / 180))
    } else if (
      compassState.compassMode === 'follow-orientation' &&
      sensorsState.orientationAlpha &&
      compassState.selectedMapBearing !== undefined
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
    updateFromFeature(fromImageCoordinates)
  })

  $effect(() => {
    if (
      sensorsState.orientationAlpha !== undefined &&
      compassState.compassMode !== 'follow-orientation' &&
      compassState.selectedMapBearing !== undefined
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
      if (mapWithImageInfo && currentMapId !== mapWithImageInfo.mapId) {
        updateImage(mapWithImageInfo)
      }
    }
  })
</script>

<div bind:this={ol} class="w-full h-full"></div>

{#snippet image(src: string, alt?: string)}
  <img
    class="w-full object-contain rounded-md"
    {src}
    alt={alt || 'Marker image'}
  />
{/snippet}

<Dialog.Root
  bind:open={
    () => popoverContents !== undefined,
    (open) => {
      if (!open) {
        closeMarkerDialog()
      }
    }
  }
>
  <Dialog.Portal>
    {#if popoverContents}
      <Dialog.Overlay
        class="h-full
        fixed inset-0 z-50 bg-black/80"
      />

      <Dialog.Content
        class="w-full h-full p-5 sm:p-10 md:p-20 lg:p-30 fixed z-100 flex items-center justify-center pointer-events-none!"
      >
        <div
          class="bg-white max-w-md max-h-full
            rounded shadow-lg p-4 overflow-auto flex flex-col gap-4 pointer-events-auto"
        >
          <Dialog.Title class="w-full flex gap-2 justify-between items-center">
            <div class="flex flex-row gap-2 items-center">
              {#if popoverContents.title}
                <Dialog.Title class="text-lg font-semibold"
                  >{popoverContents.title}</Dialog.Title
                >
              {/if}
            </div>

            <Dialog.Close
              class="cursor-pointer justify-self-end p-2 rounded-full hover:bg-gray/10 transition-colors"
            >
              <div>
                <XIcon class="size-6" />
                <span class="sr-only">Close</span>
              </div>
            </Dialog.Close>
          </Dialog.Title>

          {#if popoverContents.image}
            {#if popoverContents.url}
              <a href={popoverContents.url}
                >{@render image(popoverContents.image)}</a
              >
            {:else}
              {@render image(popoverContents.image)}
            {/if}
          {/if}
          {#if popoverContents.description}
            <p class="text-sm">{popoverContents.description}</p>
          {/if}
        </div>
      </Dialog.Content>
    {/if}
  </Dialog.Portal>
</Dialog.Root>
