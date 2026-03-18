<script lang="ts">
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'

  import { onMount } from 'svelte'

  import { WarpedMapLayer } from '@allmaps/leaflet'
  import { WarpedMapList } from '@allmaps/render'
  import { WebGL2WarpedMap } from '@allmaps/render/webgl2'
  import { mergeOptions } from '@allmaps/stdlib'

  import OptionInputs from '$lib/components/OptionInputs.svelte'
  import AnnotationSelector from '$lib/components/AnnotationSelector.svelte'

  import type {
    WebGL2WarpedMapOptions,
    WebGL2WarpedMapWithoutGeoreferencedMapOptions
  } from '@allmaps/render/webgl2'

  let { data } = $props()

  let container: HTMLElement

  let map: L.Map
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

  onMount(async () => {
    annotation = await fetch(annotationUrl).then((response) => response.json())

    warpedMapList = new WarpedMapList()
    await warpedMapList.addGeoreferenceAnnotation(annotation)
    const bbox = warpedMapList.getMapsBbox()

    options = mergeOptions(
      WebGL2WarpedMap.getDefaultWithoutGeoreferencedMapOptions(),
      testDefaultOptions
    )

    map = L.map(container, {
      zoomAnimationThreshold: 1,
      zoomControl: false
    })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map)

    warpedMapLayer = new WarpedMapLayer(undefined, {
      warpedMapList
    }).addTo(map)
    if (bbox) {
      map.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ])
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
      const bounds = warpedMapLayer?.getBounds()
      if (bounds) {
        map.fitBounds(bounds)
      }
    })
  })
</script>

<main class="grid grid-cols-1 h-dvh">
  <div bind:this={container}></div>

  <div class="absolute top-0 right-0 m-2 z-500">
    <AnnotationSelector
      annotationObjects={[undefined, ...data.annotationObjects]}
      {annotationUrl}
      bind:annotation
    ></AnnotationSelector>
  </div>

  <div class="absolute top-0 m-2 z-500">
    <OptionInputs bind:options></OptionInputs>
  </div>
</main>
