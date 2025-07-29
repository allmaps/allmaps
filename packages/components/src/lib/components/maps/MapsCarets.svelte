<script lang="ts">
  import { CaretLeft, CaretRight } from 'phosphor-svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import Button from '../ui/button/button.svelte'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    mapOrImage = 'map'
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    mapOrImage: 'map' | 'image'
  } = $props()

  let selectedIndex: number | undefined = $derived.by(() => {
    const index = georeferencedMaps.findIndex(
      (georeferencedMap) => georeferencedMap.id == selectedMapId
    )
    return index !== -1 ? index : undefined
  })

  function selectPrevious() {
    if (georeferencedMaps.length == 0) {
      return
    }
    if (selectedIndex === undefined) {
      selectedMapId = georeferencedMaps[georeferencedMaps.length - 1].id
    } else if (selectedIndex - 1 == -1 && mapOrImage == 'map') {
      selectedMapId = undefined
    } else {
      selectedMapId =
        georeferencedMaps[
          (selectedIndex + georeferencedMaps.length - 1) %
            georeferencedMaps.length
        ].id
    }
  }

  function selectNext() {
    if (georeferencedMaps.length == 0) {
      return
    }
    if (selectedIndex === undefined) {
      selectedMapId = georeferencedMaps[0].id
    } else if (
      selectedIndex + 1 == georeferencedMaps.length &&
      mapOrImage == 'map'
    ) {
      selectedMapId = undefined
    } else {
      selectedMapId =
        georeferencedMaps[(selectedIndex + 1) % georeferencedMaps.length].id
    }
  }
</script>

<div class="pointer-events-auto flex space-x-1">
  {#if georeferencedMaps.length > 0}
    <div class="flex h-9">
      <Button
        onclick={selectPrevious}
        variant="outline"
        class="w-8 rounded-r-none"><CaretLeft /></Button
      >
      <Button
        onclick={selectNext}
        variant="outline"
        class="w-8 rounded-l-none border-l-0"><CaretRight /></Button
      >
    </div>
  {/if}
</div>
