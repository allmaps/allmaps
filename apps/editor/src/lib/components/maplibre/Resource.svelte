<script lang="ts">
  import { onDestroy } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { Image } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'
  import { GcpTransformer } from '@allmaps/transform'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import {
    makeFakeStraightAnnotation,
    computeTransformedAnnotationBbox
  } from '$lib/shared/annotation.js'

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { Annotation, AnnotationPage } from '@allmaps/annotation'

  import type { Viewport } from '$lib/types/shared.js'

  import { MAPLIBRE_PADDING } from '$lib/shared/constants.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  const emptyMapStyle = {
    version: 8 as const,
    sources: {},
    layers: [],
    glyphs: 'https://fonts.allmaps.org/maplibre/{fontstack}/{range}.pbf'
    // 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf'
  }

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()

  let resourceMapContainer: HTMLDivElement
  let warpedMapLayer: WarpedMapLayer | undefined

  let straightAnnotation = $state.raw<Annotation | AnnotationPage>()

  let bbox = $derived(
    straightAnnotation && computeTransformedAnnotationBbox(straightAnnotation)
  )

  let mapLoaded = $state(false)

  type Props = {
    initialViewport?: Viewport
    resourceMap?: MapLibreMap
    transformer?: GcpTransformer
    warpedMapLayerBounds?: LngLatBoundsLike
  }

  let {
    initialViewport,
    resourceMap = $bindable<MapLibreMap | undefined>(),
    transformer = $bindable<GcpTransformer | undefined>(),
    warpedMapLayerBounds = $bindable<LngLatBoundsLike | undefined>()
  }: Props = $props()

  async function makeStraightAnnotation(imageId: string) {
    const imageInfo = await imageInfoState.fetchImageInfo(imageId)
    const parsedImage = Image.parse(imageInfo)

    const width = parsedImage.width
    const height = parsedImage.height

    straightAnnotation = makeFakeStraightAnnotation(imageId, width, height)
  }

  async function updateMap(annotation: Annotation | AnnotationPage) {
    if (!warpedMapLayer) {
      return
    }

    warpedMapLayer.clear()

    await warpedMapLayer.addGeoreferenceAnnotation(annotation)

    // TODO: get transformer from warpedMapLayer's WarpedMapList
    const maps = parseAnnotation(annotation)
    const map = maps[0]
    transformer = new GcpTransformer(map.gcps, map.transformation?.type)

    warpedMapLayerBounds = warpedMapLayer.getBounds()
  }

  $effect(() => {
    if (sourceState.activeImageId) {
      makeStraightAnnotation(sourceState.activeImageId)
    }
  })

  $effect(() => {
    if (straightAnnotation && !mapLoaded) {
      const newResourceMap = new MapLibreMap({
        container: resourceMapContainer,
        style: emptyMapStyle,
        minZoom: 7,
        maxZoom: 18,
        ...initialViewport,
        maxPitch: 0,
        hash: false,
        attributionControl: false,
        canvasContextAttributes: {
          preserveDrawingBuffer: true
        }
      })

      if (!initialViewport && bbox) {
        const camera = newResourceMap.cameraForBounds(bbox, {
          padding: MAPLIBRE_PADDING
        })

        if (camera && camera.center && camera.zoom) {
          newResourceMap.setZoom(camera.zoom)
          newResourceMap.setCenter(camera.center)
        }
      }

      warpedMapLayer = new WarpedMapLayer()

      newResourceMap.once('style.load', () => {
        // @ts-expect-error "as const" is missing for WarpedMapLayer type
        newResourceMap.addLayer(warpedMapLayer)

        mapLoaded = true
        resourceMap = newResourceMap

        if (straightAnnotation) {
          updateMap(straightAnnotation)
        }
      })
    } else if (straightAnnotation) {
      updateMap(straightAnnotation)
    }
  })

  onDestroy(() => {
    if (warpedMapLayer) {
      warpedMapLayer.clear()
      resourceMap?.remove()
      warpedMapLayer = undefined
    }
  })
</script>

<div bind:this={resourceMapContainer} class="w-full h-full"></div>
