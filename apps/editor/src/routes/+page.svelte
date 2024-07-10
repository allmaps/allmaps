<script lang="ts">
  import { onMount } from 'svelte'

  import { Map } from 'maplibre-gl'
  import {
    TerraDraw,
    TerraDrawMapLibreGLAdapter,
    TerraDrawPointMode,
    TerraDrawPolygonMode,
    TerraDrawSelectMode
  } from 'terra-draw'

  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { fetchImageInfo } from '@allmaps/stdlib'
  import { Image } from '@allmaps/iiif-parser'

  import { makeFakeStraightAnnotation } from '$lib/annotation'

  import 'maplibre-gl/dist/maplibre-gl.css'

  let container: HTMLDivElement

  const emptyMapStyle = {
    version: 8 as const,
    sources: {},
    layers: []
  }

  const imageUri = 'https://map-view.nls.uk/iiif/2/24595%2F245959737'

  let mapId: string | undefined

  let inside = false

  onMount(async () => {
    const imageInfo = await fetchImageInfo(imageUri)
    const parsedImage = Image.parse(imageInfo)

    const width = parsedImage.width
    const height = parsedImage.height

    const map = new Map({
      container,
      style: emptyMapStyle,
      minZoom: 7,
      maxZoom: 18,
      center: [0, 0],
      zoom: 16
    })

    const warpedMapLayer = new WarpedMapLayer()

    const pointMode = new TerraDrawPointMode({})
    const polygonMode = new TerraDrawPolygonMode({})

    const selectMode = new TerraDrawSelectMode({
      flags: {
        polygon: {
          feature: {
            // The entire Feature can be moved
            draggable: false,

            // Individual coordinates that make up the Feature...
            coordinates: {
              // Can be added
              midpoints: true,
              draggable: true,
              deletable: true

              // Provide a custom validation that will run when we attempt to edit the geometry
            }
          }
        }
      }
    })

    // Create Terra Draw
    const draw = new TerraDraw({
      adapter: new TerraDrawMapLibreGLAdapter({
        map
      }),
      modes: [pointMode, polygonMode, selectMode]
    })

    // Start drawing
    draw.start()
    // draw.setMode('')
    draw.setMode('point')

    draw.on('finish', () => {
      if (draw.getMode() === 'polygon') {
        draw.setMode('select')
      }
    })

    document.addEventListener('mousemove', (event) => {
      const features = draw.getFeaturesAtPointerEvent(event, {
        // The number pixels to search around input point
        pointerDistance: 40,

        // Ignore features that have been selected
        ignoreSelectFeatures: true
      })

      if (features.length > 0) {
        const id = features[0].id
        if (id) {
          // console.log(id)
          draw.selectFeature(id)
        }
      }

      // features

      // Do something with the features...
      // console.log({ featuresAtMouseEvent })
    })

    map.on('load', async () => {
      map.addLayer(warpedMapLayer)

      const straightAnnotation = makeFakeStraightAnnotation(
        imageUri,
        width,
        height
      )

      const results =
        await warpedMapLayer.addGeoreferenceAnnotation(straightAnnotation)
      if (typeof results[0] === 'string') {
        mapId = results[0]
      }

      const bounds = warpedMapLayer.getBounds()

      if (bounds) {
        map.fitBounds(bounds, {
          animate: false
        })
      }
    })

    map.on('mousemove', (event) => {
      const lngLat = event.lngLat
      const point = [lngLat.lng, lngLat.lat] as [number, number]
      const warpedMapList = warpedMapLayer.getWarpedMapList()
      if (mapId) {
        const warpedMap = warpedMapList.getWarpedMap(mapId)

        if (warpedMap) {
          const resourcePoint = warpedMap.transformer
            .transformToResource(point)
            .map((c) => Math.round(c))

          inside =
            resourcePoint[0] >= 0 &&
            resourcePoint[0] < width &&
            resourcePoint[1] >= 0 &&
            resourcePoint[1] < height
        }
      }
    })
  })
</script>

<div id="container" style:background-color={inside ? 'green' : 'red'}>
  <div id="map" bind:this={container}></div>
</div>

<svelte:head>
  <style>
    body {
      margin: 0;
    }
  </style>
</svelte:head>

<style>
  #container {
    position: absolute;
    transition: 200ms background-color;
    width: 100%;
    height: 100%;
  }

  #map {
    position: relative;
    width: 100%;
    height: 100%;
  }
</style>
