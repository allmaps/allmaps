<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { Writable } from 'svelte/store'

  import type { Vector as VectorSource } from 'ol/source'
  import type Select from 'ol/interaction/Select.js'
  import type { SelectedMap } from '$lib/shared/types.js'

  export let vectorSource: VectorSource

  export let select: Select
  export let selectedMap: Writable<SelectedMap>

  const mapId = $selectedMap.mapId
  const selected = $selectedMap.selected

  selectedMap.subscribe(($selectedMap) => {
    const feature = vectorSource.getFeatureById($selectedMap.mapId)
    if (feature) {
      if ($selectedMap.selected) {
        select.getFeatures().push(feature)
      } else {
        select.getFeatures().remove(feature)
      }
    }
  })

  onMount(() => {
    console.log('nu maken ', mapId)
  })

  onDestroy(() => {
    console.log('nu weghalen ', mapId)
  })
</script>
