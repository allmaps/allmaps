<script lang="ts">
  import { onDestroy } from 'svelte'

  import { Map as MapLibreMap } from 'maplibre-gl'

  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { Image } from '@allmaps/iiif-parser'
  import { parseAnnotation } from '@allmaps/annotation'
  import { GcpTransformer } from '@allmaps/transform'
  import { pink } from '@allmaps/tailwind'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import {
    generateFakeStraightAnnotation,
    computeTransformedAnnotationBbox
  } from '$lib/shared/annotation.js'

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { Annotation, AnnotationPage } from '@allmaps/annotation'

  import type { Viewport } from '$lib/types/shared.js'
  import type { ResourceMask } from '$lib/types/maps.js'

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

  let currentImageId = $state<string>()

  let resourceMapContainer: HTMLDivElement
  let warpedMapLayer: WarpedMapLayer | undefined

  let straightAnnotation = $state.raw<Annotation | AnnotationPage>()

  let bbox = $derived(
    straightAnnotation && computeTransformedAnnotationBbox(straightAnnotation)
  )

  let mapLoaded = $state(false)
  let mapLoading = $state(false)

  type Props = {
    initialViewport?: Viewport
    resourceMap?: MapLibreMap
    resourceMask?: ResourceMask
    renderMasks?: boolean
    transformer?: GcpTransformer
    warpedMapLayerBounds?: LngLatBoundsLike
  }

  let {
    initialViewport,
    resourceMap = $bindable<MapLibreMap | undefined>(),
    resourceMask,
    renderMasks,
    transformer = $bindable<GcpTransformer | undefined>(),
    warpedMapLayerBounds = $bindable<LngLatBoundsLike | undefined>()
  }: Props = $props()

  let renderOptions = $derived(
    renderMasks && resourceMask && resourceMask.length > 0
      ? {
          renderMaskColor: pink,
          renderMaskSize: 6,
          renderAppliableMask: true,
          applyMask: false
        }
      : {
          applyMask: false,
          renderAppliableMask: false
        }
  )

  async function updateStraightAnnotation(
    imageId: string,
    resourceMask?: ResourceMask
  ) {
    straightAnnotation = await generateStraightAnnotation(imageId, resourceMask)
    currentImageId = imageId
  }

  async function generateStraightAnnotation(
    imageId: string,
    resourceMask?: ResourceMask
  ) {
    const imageInfo = await imageInfoState.fetchImageInfo(imageId)
    const parsedImage = Image.parse(imageInfo)

    const width = parsedImage.width
    const height = parsedImage.height

    return generateFakeStraightAnnotation(imageId, width, height, resourceMask)
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
    if (
      sourceState.activeImageId &&
      currentImageId !== sourceState.activeImageId
    ) {
      updateStraightAnnotation(sourceState.activeImageId, resourceMask)
    }
  })

  $effect(() => {
    if (mapLoaded && warpedMapLayer && renderOptions) {
      warpedMapLayer.setLayerOptions(renderOptions)
    }
  })

  $effect(() => {
    if (straightAnnotation && mapLoaded) {
      updateMap(straightAnnotation)
    }
  })

  $effect(() => {
    if (straightAnnotation && !mapLoaded && !mapLoading) {
      mapLoading = true

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

      warpedMapLayer = new WarpedMapLayer(renderOptions)

      newResourceMap.once('style.load', () => {
        // @ts-expect-error "as const" is missing for WarpedMapLayer type
        newResourceMap.addLayer(warpedMapLayer)

        mapLoading = false
        mapLoaded = true
        resourceMap = newResourceMap
      })
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

<div bind:this={resourceMapContainer} class="h-full w-full"></div>
