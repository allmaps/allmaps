<script lang="ts">
  import CoordinateExample from './CoordinateExample.svelte'
  import type { CoordinateExampleInitialView } from '../lib/coordinates.ts'

  let {
    annotationUrl,
    geojsonUrl,
    initialView,
    imageAttribution
  }: {
    annotationUrl: string
    geojsonUrl: string
    initialView: CoordinateExampleInitialView
    imageAttribution: string
  } = $props()
</script>

<CoordinateExample
  {annotationUrl}
  {geojsonUrl}
  {initialView}
  {imageAttribution}
  showPoint={false}
  showFooter={false}
/>
