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
  let bbox = $derived<Bbox | undefined>(
    warpedMapLayer?.getBbox({ projection: options.projection })
  )

  const projections: Projection[] = [
    lonLatProjection,
    webMercatorProjection,
    // svelte-ignore state_referenced_locally
    ...data.extraProjections
  ]

  // svelte-ignore state_referenced_locally
  for (const projection of data.extraProjections) {
    proj4.defs(projection.id as string, projection.definition)
  }
  register(proj4)
  // Optional: register projections with warpedmaplayer to use existing projections instead of creating new ones from their definition
  // warpedMapLayer.registerProjections(data.extraProjections)

  onMount(async () => {
    annotation = await fetch(annotationUrl).then((response) => response.json())

    warpedMapList = new WarpedMapList()
    await warpedMapList.addGeoreferenceAnnotation(annotation)
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
      bbox = warpedMapLayer?.getBbox({ projection: options.projection })
    })
  })
</script>

<main class="relative grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>
  <div class="absolute top-0 right-0 m-2">
    <AnnotationSelector
      annotationObjects={[undefined, ...data.annotationObjects]}
      {annotationUrl}
      bind:annotation
    ></AnnotationSelector>
  </div>

  <div class="absolute top-0 m-2">
    {#if projections}
      <OptionInputs bind:options {projections}></OptionInputs>
    {/if}
  </div>
</main>
