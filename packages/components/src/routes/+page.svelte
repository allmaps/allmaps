<script lang="ts">
  import { ProjectionPicker } from '$lib/index.js'
  import { getProjectionsState } from '$lib/state.js'

  import {
    createFullTextIndex,
    createBboxIndex
  } from '$lib/shared/projections/projections.js'

  import type { PickerProjection } from '@allmaps/components/projections'

  const projectionsState = getProjectionsState()

  let value = $state<PickerProjection>()

  const fullTextIndex = createFullTextIndex(projectionsState.projections)
  const bboxIndex = createBboxIndex(projectionsState.projections)
</script>

<main class="container mx-auto p-4 space-y-8">
  <h1 class="text-2xl font-bold mb-4">@allmaps/components</h1>

  <section>
    <h1 class="text-xl font-bold mb-4">Projections</h1>
    <ProjectionPicker
      projections={projectionsState.projections}
      bind:value
      {fullTextIndex}
      {bboxIndex}
      bbox={[4.01001, 50.762522, 4.523621, 51.024121]}
    ></ProjectionPicker>
  </section>
</main>
