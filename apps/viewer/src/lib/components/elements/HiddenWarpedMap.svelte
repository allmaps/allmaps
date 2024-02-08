<script lang="ts">
  import { onMount } from 'svelte'

  import type VectorSource from 'ol/source/Vector.js'
  import type Select from 'ol/interaction/Select.js'
  import type { ViewerMap } from '$lib/shared/types.js'

  import type Feature from 'ol/Feature.js'
  import type Geometry from 'ol/geom/Geometry.js'

  export let vectorSource: VectorSource

  export let select: Select
  export let viewerMap: ViewerMap

  const feature = vectorSource.getFeatureById(
    viewerMap.mapId
  ) as Feature<Geometry>

  onMount(() => {
    if (feature) {
      select.getFeatures().push(feature)
    }

    return () => {
      if (feature) {
        select.getFeatures().remove(feature)
      }
    }
  })
</script>
