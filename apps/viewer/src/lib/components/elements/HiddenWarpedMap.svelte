<script lang="ts">
  import { onMount, onDestroy } from 'svelte'

  import type { Vector as VectorSource } from 'ol/source'
  import type Select from 'ol/interaction/Select.js'
  import type { ViewerMap } from '$lib/shared/types.js'

  export let vectorSource: VectorSource

  export let select: Select
  export let viewerMap: ViewerMap

  const feature = vectorSource.getFeatureById(viewerMap.mapId)

  onMount(() => {
    if (feature) {
      select.getFeatures().push(feature)
    }
  })

  onDestroy(() => {
    if (feature) {
      select.getFeatures().remove(feature)
    }
  })
</script>
