<script lang="ts">
  import proj4 from 'proj4'

  import { onMount } from 'svelte'

  import OpenLayersMap from 'ol/Map'
  import View from 'ol/View'
  import OSM from 'ol/source/OSM'
  import Tile from 'ol/layer/Tile'
  import { register } from 'ol/proj/proj4'

  import OptionInputs from '$lib/components/OptionInputs.svelte'
  import AnnotationSelector from '$lib/components/AnnotationSelector.svelte'

  import { WarpedMapLayer } from '@allmaps/openLayers'
  import { WarpedMapList } from '@allmaps/render'
  import { WebGL2WarpedMap } from '@allmaps/render/webgl2'
  import { mergeOptions } from '@allmaps/stdlib'
  import { lonLatProjection, webMercatorProjection } from '@allmaps/project'

  import type { Bbox } from '@allmaps/types'

  import type {
    WebGL2WarpedMapOptions,
    WebGL2WarpedMapWithoutGeoreferencedMapOptions
  } from '@allmaps/render/webgl2'
  import type { Projection } from '@allmaps/project'

  let { data } = $props()

  let container: HTMLElement

  let map: OpenLayersMap
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
  let bbox = $derived<Bbox | undefined>(
    warpedMapLayer?.getBbox({ projection: options.projection })
  )

  // svelte-ignore state_referenced_locally
  const extraProjections = data.extraProjections

  const projections: Projection[] = [
    lonLatProjection,
    webMercatorProjection,
    ...extraProjections
  ]

  for (const projection of extraProjections) {
    proj4.defs(projection.id as string, projection.definition)
  }
  register(proj4)
  // Optional: register projections with warpedmaplayer to use existing projections instead of creating new ones from their definition
  // warpedMapLayer.registerProjections(extraProjections)

  onMount(async () => {
    annotation = await fetch(annotationUrl).then((response) => response.json())

    warpedMapList = new WarpedMapList()
    warpedMapList.addGeoreferenceAnnotation(annotation)
    bbox = warpedMapList.getMapsBbox({
      projection: { definition: 'EPSG:3857' }
    })

    options = mergeOptions(
      WebGL2WarpedMap.getDefaultWithoutGeoreferencedMapOptions(),
      testDefaultOptions
    )

    map = new OpenLayersMap({
      target: container,
      layers: [
        new Tile({
          source: new OSM()
        })
      ],
      controls: []
    })

    map.on('error', (e) => {
      console.warn(e)
    })

    warpedMapLayer = new WarpedMapLayer({ warpedMapList })
    map.addLayer(warpedMapLayer)
    bbox = warpedMapLayer.getBbox({ projection: options.projection })
  })

  $effect(() => {
    if (bbox) {
      map.setView(
        new View({
          projection: options.projection.id
        })
      )
      map.getView().fit(bbox, { padding: [20, 20, 20, 20] })
    }
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
    const bbox = warpedMapLayer?.getBbox({ projection: options.projection })
    if (bbox) {
      map.getView().fit(bbox, { padding: [20, 20, 20, 20] })
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
    {#if projections}
      <OptionInputs bind:options {projections}></OptionInputs>
    {/if}
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
  <title>Allmaps Openlayers plugin test</title>
  <meta
    name="Allmaps Openlayers plugin test"
    content="Test page for the Allmaps Openlayers plugin"
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
