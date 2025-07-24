<script lang="ts">
  import { CaretLeft, CaretRight } from 'phosphor-svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  let {
    georeferencedMaps = [],
    selectedMapId = $bindable(undefined),
    annotations = [],
    mapOrImage = 'map'
  }: {
    georeferencedMaps: GeoreferencedMap[]
    selectedMapId?: string
    annotations?: unknown[]
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
  <div
    class="px-4 py-2 w-60 text-sm text-center font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-100 hover:cursor-pointer focus:z-10"
  >
    {#if georeferencedMaps.length}
      {#if selectedIndex !== undefined}
        {selectedIndex + 1} of
      {/if}
      {georeferencedMaps.length}
      {georeferencedMaps.length > 1 ? 'maps' : 'map'}
      from {annotations.length}
      {annotations.length > 1 ? 'annotations' : 'annotation'}
    {/if}
  </div>
  {#if georeferencedMaps.length > 0}
    <div class="flex h-9">
      <button
        onclick={selectPrevious}
        class="px-2 py-2 text-sm font-medium bg-white border border-gray-200 rounded-l-lg hover:bg-gray-100 hover:cursor-pointer focus:z-10"
        ><CaretLeft /></button
      >
      <button
        onclick={selectNext}
        class="px-2 py-2 text-sm font-medium bg-white border-t broder-b border-r border-gray-200 rounded-r-lg hover:bg-gray-100 hover:cursor-pointer focus:z-10"
        ><CaretRight /></button
      >
    </div>
  {/if}
</div>
