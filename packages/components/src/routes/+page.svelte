<script lang="ts">
  import ProjectionPicker from '$lib/components/ProjectionPicker.svelte'
  import projectionsData from '$lib/shared/projections/projections.json' with { type: 'json' }
  import {
    createSearchProjectionsWithFuse,
    createSuggestProjectionsWithFlatbush
  } from '$lib/shared/projections/projections.js'

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
</script>

<main class="container mx-auto p-4 space-y-8">
  <h1 class="text-2xl font-bold mb-4">@allmaps/components</h1>

  <section>
    <h1 class="text-xl font-bold mb-4">Projections</h1>
    <ProjectionPicker
      {projections}
      bind:selectedProjection
      searchProjections={searchProjectionsWithFuse}
      bbox={[4.01001, 50.762522, 4.523621, 51.024121]}
      suggestProjections={suggestProjectionsWithFlatbush}
    ></ProjectionPicker>
  </section>
</main>
