<script lang="ts">
  import { onMount } from 'svelte'
  import { Map as MapLibreMap, addProtocol } from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import {
    WarpedMapLayer,
    WarpedMapList,
    WebGL2WarpedMap
  } from '@allmaps/maplibre'
  import { basemapStyle } from '@allmaps/basemap'
  import { mergePartialOptions } from '@allmaps/stdlib'

  import OptionInputs from '$lib/components/OptionInputs.svelte'
  import AnnotationSelector from '$lib/components/AnnotationSelector.svelte'

  import type { WebGL2WarpedMapOptions } from '@allmaps/render/webgl2'

  let { data } = $props()

  let container: HTMLElement

  let map: MapLibreMap
  let warpedMapList: WarpedMapList<WebGL2WarpedMap>
  let warpedMapLayer = $state<WarpedMapLayer>()
  let annotationUrl = $state(
    'https://annotations.allmaps.org/manifests/02c7b8df6fac1378'
  )
  let annotation = $state.raw()
  let options = $state<Partial<WebGL2WarpedMapOptions>>()
  let testDefaultOptions = $state<Partial<WebGL2WarpedMapOptions>>({})

  onMount(async () => {
    annotation = await fetch(annotationUrl).then((response) => response.json())

    warpedMapList = new WarpedMapList()
    await warpedMapList.addGeoreferenceAnnotation(annotation)
    const bbox = warpedMapList.getMapsBbox()

    options = mergePartialOptions(
      WebGL2WarpedMap.getDefaultWithoutGeoreferencedMapOptions(),
      testDefaultOptions
    )

    const protocol = new Protocol()
    addProtocol('pmtiles', protocol.tile)

    map = new MapLibreMap({
      container,
      // @ts-expect-error MapLibre types are incompatible
      style: basemapStyle('en'),
      maxPitch: 0,
      hash: true,
      attributionControl: false
    })

    map.on('load', () => {
      warpedMapLayer = new WarpedMapLayer({ warpedMapList })
      // @ts-expect-error MapLibre types are incompatible
      map.addLayer(warpedMapLayer)
      if (bbox) {
        map.fitBounds(bbox, { padding: 20, duration: 0 })
      }
    })
  })

  $effect(() => {
    if (!warpedMapLayer || !options) {
      return
    }

    // Spread options to ensure all properties are read, registering them as reactive dependencies
    const copiedOptions = { ...options }
    warpedMapLayer.setLayerOptions(copiedOptions)
  })

  $effect(() => {
    if (!warpedMapLayer) {
      return
    }
    if (!annotation) {
      warpedMapLayer.clear()
      return
    }

    warpedMapLayer.clear()
    warpedMapLayer.addGeoreferenceAnnotation(annotation).then(() => {
      const bbox = warpedMapLayer?.getBbox()
      if (bbox) map.fitBounds(bbox, { padding: 20, duration: 0 })
    })
  })
</script>

<main class="grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>

  <div class="absolute top-0 right-0 m-2">
    <AnnotationSelector
      annotationObjects={[undefined, ...data.annotationObjects]}
      {annotationUrl}
      bind:annotation
    ></AnnotationSelector>
  </div>

  <div class="absolute top-0 m-2">
    {#if options}
      <OptionInputs bind:options></OptionInputs>
    {/if}
  </div>
</main>
