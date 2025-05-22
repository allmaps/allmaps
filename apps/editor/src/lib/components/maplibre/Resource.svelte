<script lang="ts">
  import { onMount } from 'svelte'

  import { Map } from 'maplibre-gl'

  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { Image } from '@allmaps/iiif-parser'

  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getImageInfoState } from '$lib/state/image-info.svelte.js'

  import { makeFakeStraightAnnotation } from '$lib/shared/resource-annotation.js'

  import type { LngLatBoundsLike } from 'maplibre-gl'

  import type { GcpTransformer } from '@allmaps/transform'

  import type { Viewport } from '$lib/types/shared.js'

  import 'maplibre-gl/dist/maplibre-gl.css'

  const emptyMapStyle = {
    version: 8 as const,
    sources: {},
    layers: [],
    glyphs:
      'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf'
  }

  const sourceState = getSourceState()
  const imageInfoState = getImageInfoState()

  let resourceMapContainer: HTMLDivElement
  let warpedMapLayer: WarpedMapLayer | undefined
  let mapId: string | undefined

  let width = $state<number>()
  let height = $state<number>()
  let currentDisplayImageId = $state<string>()

  let mapLoaded = $state(false)

  type Props = {
    initialViewport?: Viewport
    resourceMap?: Map
    transformer?: GcpTransformer
    bounds?: LngLatBoundsLike
  }

  let {
    initialViewport,
    resourceMap = $bindable<Map | undefined>(),
    transformer = $bindable<GcpTransformer | undefined>(),
    bounds = $bindable<LngLatBoundsLike | undefined>()
  }: Props = $props()

  async function updateImage(imageId: string) {
    if (!warpedMapLayer || !resourceMap) {
      return
    }

    warpedMapLayer.clear()

    const imageInfo = await imageInfoState.fetchImageInfo(imageId)
    const parsedImage = Image.parse(imageInfo)

    width = parsedImage.width
    height = parsedImage.height

    const straightAnnotation = makeFakeStraightAnnotation(
      imageId,
      width,
      height
    )

    const results =
      await warpedMapLayer.addGeoreferenceAnnotation(straightAnnotation)

    if (typeof results[0] === 'string') {
      mapId = results[0]
    }

    const warpedMapList = warpedMapLayer.getWarpedMapList()

    if (mapId) {
      const warpedMap = warpedMapList.getWarpedMap(mapId)
      transformer = warpedMap?.transformer
    }

    bounds = warpedMapLayer.getBounds()

    currentDisplayImageId = imageId
  }

  onMount(() => {
    const newResourceMap = new Map({
      container: resourceMapContainer,
      style: emptyMapStyle,
      minZoom: 7,
      maxZoom: 18,
      center: [0, 0],
      zoom: 2,
      ...initialViewport,
      maxPitch: 0,
      hash: false,
      attributionControl: false,
      canvasContextAttributes: {
        preserveDrawingBuffer: true
      }
    })

    warpedMapLayer = new WarpedMapLayer()

    newResourceMap.once('style.load', () => {
      // @ts-expect-error "as const" is missing for WarpedMapLayer type
      newResourceMap.addLayer(warpedMapLayer)

      mapLoaded = true
      resourceMap = newResourceMap
    })

    $effect(() => {
      if (mapLoaded && sourceState.activeImageId) {
        updateImage(sourceState.activeImageId)
      }
    })

    return () => {
      if (warpedMapLayer) {
        warpedMapLayer.clear()
        resourceMap?.remove()
        warpedMapLayer = undefined
      }
    }
  })
</script>

<div bind:this={resourceMapContainer} class="w-full h-full"></div>
