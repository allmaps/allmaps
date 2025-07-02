<script lang="ts">
  import { parseAnnotation } from '@allmaps/annotation'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  let {
    annotations = [],
    selectedMapId = $bindable(undefined)
  }: {
    annotations: unknown[]
    selectedMapId?: string
  } = $props()

  let georeferencedMaps: GeoreferencedMap[] = $derived(
    annotations.reduce(
      (georeferencedMaps: GeoreferencedMap[], annotation) => [
        ...georeferencedMaps,
        ...parseAnnotation(annotation)
      ],
      []
    )
  )
</script>

<ul>
  {#each georeferencedMaps as georeferencedMap, g}
    <li>{georeferencedMap.id}</li>
  {/each}
</ul>
