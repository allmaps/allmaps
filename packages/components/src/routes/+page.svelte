<script lang="ts">
  import { parseAnnotation } from '@allmaps/annotation'

  import ProjectionPicker from '$lib/components/options/ProjectionPicker.svelte'
  import projectionsData from '$lib/shared/projections/projections.json' with { type: 'json' }
  import {
    createSearchProjectionsWithFuse,
    createSuggestProjectionsWithFlatbush
  } from '$lib/shared/projections/projections.js'
  import WarpedMapLayerMap from '$lib/components/WarpedMapLayerMap.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import Viewer from '$lib/components/Viewer.svelte'

  const projections = projectionsData.map((projectionData) => {
    return {
      code: projectionData.code,
      name: 'EPSG:' + projectionData.code + ' - ' + projectionData.name,
      definition: projectionData.definition,
      bbox: projectionData.bbox as [number, number, number, number]
    }
  })

  let selectedProjection = $state(undefined)

  const searchProjectionsWithFuse = createSearchProjectionsWithFuse(projections)
  const suggestProjectionsWithFlatbush =
    createSuggestProjectionsWithFlatbush(projections)

  // Diemer meer
  const annotationUrl =
    'https://annotations.allmaps.org/manifests/a0d6d3379cfd9f0a'

  let annotations = $state<unknown[]>([])
  let georeferencedMaps = $state<GeoreferencedMap[]>([])

  fetch(annotationUrl)
    .then((response) => response.json())
    .then((response) => {
      annotations = [response]
      georeferencedMaps = parseAnnotation(response)
    })
</script>

<main class="container mx-auto p-4 space-y-8">
  <h1 class="text-2xl font-bold mb-4">@allmaps/components</h1>

  <section>
    <h1 class="text-xl font-bold mb-4">Projections</h1>
    <ProjectionPicker
      {projections}
      bind:selectedProjection
      searchProjections={searchProjectionsWithFuse}
      geoBbox={[4.01001, 50.762522, 4.523621, 51.024121]}
      suggestProjections={suggestProjectionsWithFlatbush}
    ></ProjectionPicker>
  </section>
  <section>
    <h1 class="text-xl font-bold mb-4">Map</h1>
    <div class="size-100">
      <WarpedMapLayerMap {georeferencedMaps} />
    </div>
  </section>

  <section>
    <h1 class="text-xl font-bold mb-4">Viewer</h1>
    <div class="size-200">
      <Viewer {annotations} />
    </div>
  </section>
</main>
