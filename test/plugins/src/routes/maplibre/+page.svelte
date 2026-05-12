<script lang="ts">
  import { onMount } from 'svelte'
  import { Map as MapLibreMap, addProtocol } from 'maplibre-gl'
  import { Protocol } from 'pmtiles'

  import { WarpedMapLayer } from '@allmaps/maplibre'
  import { WarpedMapList } from '@allmaps/render'
  import { WebGL2WarpedMap } from '@allmaps/render/webgl2'
  import { basemapStyle } from '@allmaps/basemap'
  import { mergeOptions } from '@allmaps/stdlib'
  import { lonLatProjection, webMercatorProjection } from '@allmaps/project'

  import OptionInputs from '$lib/components/OptionInputs.svelte'
  import AnnotationSelector from '$lib/components/AnnotationSelector.svelte'

  import type {
    WebGL2WarpedMapOptions,
    WebGL2WarpedMapWithoutGeoreferencedMapOptions
  } from '@allmaps/render/webgl2'
  import type { Projection } from '@allmaps/project'

  let { data } = $props()

  let container: HTMLElement

  let map: MapLibreMap
  let warpedMapList: WarpedMapList<WebGL2WarpedMap>
  let warpedMapLayer = $state<WarpedMapLayer>()
  let annotationUrl = $state(
    'https://annotations.allmaps.org/manifests/02c7b8df6fac1378'
  )
  let annotation = $state.raw()
  let options = $state<WebGL2WarpedMapWithoutGeoreferencedMapOptions>(
    WebGL2WarpedMap.getDefaultWithoutGeoreferencedMapOptions()
  )
  let testDefaultOptions = $state<Partial<WebGL2WarpedMapOptions>>({})
  let showComponents = $state(true)

  // svelte-ignore state_referenced_locally
  const extraProjections = data.extraProjections

  const projections: Projection[] = [
    lonLatProjection,
    webMercatorProjection,
    ...extraProjections
  ]

  onMount(async () => {
    annotation = await fetch(annotationUrl).then((response) => response.json())

    warpedMapList = new WarpedMapList()
    warpedMapList.addGeoreferenceAnnotation(annotation)
    const bbox = warpedMapList.getMapsBbox()

    options = mergeOptions(
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
      map.addLayer(warpedMapLayer)
      if (bbox) {
        map.fitBounds(bbox, { padding: 20, duration: 0 })
      }
    })

    map.on('error', (e) => {
      console.warn(e)
    })
  })

  $effect(() => {
    if (!warpedMapLayer || !options) {
      return
    }

    warpedMapLayer.setLayerOptions(
      $state.snapshot(options) as WebGL2WarpedMapOptions
    )
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
    warpedMapLayer.addGeoreferenceAnnotation(annotation)
    const bbox = warpedMapLayer.getBbox()
    if (bbox) {
      map.fitBounds(bbox, { padding: 20, duration: 0 })
    }
  })
</script>

<main class="grid grid-cols-1 grid-rows-1 h-dvh">
  <div bind:this={container}></div>

  <div class="absolute top-0 right-0 m-2" class:hidden={!showComponents}>
    <AnnotationSelector
      annotationObjects={[undefined, ...data.annotationObjects]}
      {annotationUrl}
      bind:annotation
    ></AnnotationSelector>
  </div>

  <div class="absolute top-0 m-2" class:hidden={!showComponents}>
    <OptionInputs bind:options {projections}></OptionInputs>
  </div>

  <div class="absolute bottom-0 right-0 m-2">
    <button
      onclick={() => {
        showComponents = !showComponents
      }}>⛶</button
    >
  </div>
</main>

<svelte:head>
  <title>Allmaps Maplibre plugin test</title>
  <meta
    name="Allmaps Maplibre plugin test"
    content="Test page for the Allmaps Maplibre plugin"
  />
</svelte:head>

<style>
  button {
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: 3px;
    background: white;
    font-size: 0.7rem;
    font-family: ui-monospace, monospace;
    padding: 0.1rem 0.35rem;
    cursor: pointer;
    line-height: 1;
  }
</style>
