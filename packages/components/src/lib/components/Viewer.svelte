<script lang="ts">
  import { parseAnnotation } from '@allmaps/annotation'

  import projectionsData from '$lib/shared/projections/projections.json' with { type: 'json' }
  import {
    createSearchProjectionsWithFuse,
    createSuggestProjectionsWithFlatbush
  } from '$lib/shared/projections/projections.js'

  import { Menubar } from '$lib/components/ui/menubar'
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js'

  import {
    LayerOptionsState,
    MapOptionsState
  } from './options/OptionsState.svelte'
  import OptionsToggles from './options/OptionsToggles.svelte'
  import WarpedMapLayerMap from './maps/WarpedMapLayerMap.svelte'
  import MapOrImageTabs from './maps/MapOrImageTabs.svelte'
  import OptionsKeys from './options/OptionsKeys.svelte'
  import MapsCarets from './maps/MapsCarets.svelte'
  import MapsListButton from './maps/MapsListButton.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Bbox } from '@allmaps/types'

  import type { WarpedMapLayerMapComponentOptions } from './maps/WarpedMapLayerMap.svelte'

  export type ViewerComponentOptions = WarpedMapLayerMapComponentOptions

  let {
    annotations = [],
    layerOptionsState = new LayerOptionsState(),
    mapOptionsStateByMapId = new Map(),
    componentOptions = {}
  }: {
    annotations: unknown[]
    layerOptionsState?: LayerOptionsState
    mapOptionsStateByMapId?: Map<string, MapOptionsState>
    componentOptions?: Partial<ViewerComponentOptions>
  } = $props()

  let geoBbox: Bbox | undefined = $state()
  let selectedMapId: string | undefined = $state(undefined)
  let selectedMapOptionsState = $derived(
    selectedMapId ? mapOptionsStateByMapId.get(selectedMapId) : undefined
  )
  let mapOrImage: 'map' | 'image' = $state('map')

  let georeferencedMaps: GeoreferencedMap[] = $derived(
    annotations.reduce(
      (georeferencedMaps: GeoreferencedMap[], annotation) => [
        ...georeferencedMaps,
        ...parseAnnotation(annotation)
      ],
      []
    )
  )

  const projections = projectionsData.map((projectionData) => {
    return {
      code: projectionData.code,
      name: 'EPSG:' + projectionData.code + ' - ' + projectionData.name,
      definition: projectionData.definition,
      bbox: projectionData.bbox as [number, number, number, number]
    }
  })

  const searchProjectionsWithFuse = createSearchProjectionsWithFuse(projections)
  const suggestProjectionsWithFlatbush =
    createSuggestProjectionsWithFlatbush(projections)
</script>

<OptionsKeys bind:layerOptionsState />

<div class="w-full h-full relative">
  <ContextMenu.Root>
    <ContextMenu.Trigger class=" h-full w-full">
      <WarpedMapLayerMap
        {georeferencedMaps}
        {layerOptionsState}
        {mapOptionsStateByMapId}
        bind:selectedMapId
        bind:mapOrImage
        {componentOptions}
        bind:geoBbox
      />
    </ContextMenu.Trigger>
    {#if selectedMapId}
      <ContextMenu.Content class="p-0 border-none bg-transparent shadow-none">
        <Menubar class="flex h-11 select-none w-fit">
          {#if selectedMapOptionsState}
            <OptionsToggles
              bind:layerOptionsState={selectedMapOptionsState}
              {projections}
              searchProjections={searchProjectionsWithFuse}
              {geoBbox}
              suggestProjections={suggestProjectionsWithFlatbush}
              showTooltips={false}
            />
          {/if}
        </Menubar>
      </ContextMenu.Content>{/if}
  </ContextMenu.Root>

  <div class="absolute top-0 left-0 m-2 ml-12 flex space-x-2">
    <Menubar class="flex h-11 select-none w-fit">
      <OptionsToggles
        bind:layerOptionsState
        {projections}
        searchProjections={searchProjectionsWithFuse}
        {geoBbox}
        suggestProjections={suggestProjectionsWithFlatbush}
        showKeys={true}
      />
    </Menubar>
  </div>
  <div class="absolute top-0 right-0 m-2 flex space-x-2">
    <MapOrImageTabs bind:mapOrImage disabled={selectedMapId === undefined} />
  </div>
  <div class="absolute bottom-0 left-0 m-2 flex space-x-2"></div>
  <div class="absolute bottom-0 right-0 m-2 flex space-x-2">
    <MapsCarets {georeferencedMaps} bind:selectedMapId {mapOrImage} />
    <MapsListButton
      {georeferencedMaps}
      bind:selectedMapId
      {mapOptionsStateByMapId}
      {projections}
      searchProjections={searchProjectionsWithFuse}
      {geoBbox}
      suggestProjections={suggestProjectionsWithFlatbush}
    />
  </div>
</div>
