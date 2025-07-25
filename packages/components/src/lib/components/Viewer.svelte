<script lang="ts">
  import { Plus, ShareNetwork } from 'phosphor-svelte'

  import { parseAnnotation } from '@allmaps/annotation'

  import projectionsData from '$lib/shared/projections/projections.json' with { type: 'json' }
  import {
    createSearchProjectionsWithFuse,
    createSuggestProjectionsWithFlatbush
  } from '$lib/shared/projections/projections.js'

  import { Menubar } from './ui/menubar'
  import * as ContextMenu from '$lib/components/ui/context-menu/index.js'
  import { OptionsState } from './options/OptionsState.svelte'
  import OptionsToggles from './options/OptionsToggles.svelte'
  import WarpedMapLayerMap from './WarpedMapLayerMap.svelte'
  import MapOrImage from './MapOrImage.svelte'
  import OptionsKeys from './options/OptionsKeys.svelte'
  import MapsOverview from './MapsOverview.svelte'
  import Button from './ui/button/button.svelte'
  import MapsListButton from './MapsListButton.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'
  import type { Bbox } from '@allmaps/types'

  import type { WarpedMapLayerMapComponentOptions } from './WarpedMapLayerMap.svelte'

  export type ViewerComponentOptions = WarpedMapLayerMapComponentOptions

  let {
    annotations = [],
    optionsState = new OptionsState(),
    mapOptionsStateByMapId = new Map(),
    componentOptions = {}
  }: {
    annotations: unknown[]
    optionsState?: OptionsState
    mapOptionsStateByMapId?: Map<string, OptionsState>
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

<OptionsKeys bind:optionsState />

<ContextMenu.Root>
  <ContextMenu.Trigger class="h-full w-full">
    <div class="w-full h-full relative">
      <WarpedMapLayerMap
        {georeferencedMaps}
        {optionsState}
        {mapOptionsStateByMapId}
        bind:selectedMapId
        {mapOrImage}
        {componentOptions}
        bind:geoBbox
      />

      <div class="absolute top-0 left-0 m-2 ml-12 flex">
        <Menubar class="flex h-11 select-none w-fit">
          <OptionsToggles
            bind:optionsState
            {projections}
            searchProjections={searchProjectionsWithFuse}
            {geoBbox}
            suggestProjections={suggestProjectionsWithFlatbush}
          />
        </Menubar>
      </div>
      <div class="absolute top-0 right-0 m-2 flex">
        <MapOrImage bind:mapOrImage disabled={selectedMapId === undefined} />
      </div>
      <div class="absolute bottom-0 left-0 m-2 flex"></div>
      <div class="absolute bottom-0 right-0 m-2 flex">
        <div class="space-x-2">
          <!-- <MapsOverview
      {georeferencedMaps}
      bind:selectedMapId
      {annotations}
      {mapOrImage}
      /> -->
          <Button variant="outline"><ShareNetwork />Share</Button>
          <MapsListButton
            {georeferencedMaps}
            bind:selectedMapId
            optionsStateByMapId={mapOptionsStateByMapId}
            {projections}
            searchProjections={searchProjectionsWithFuse}
            {geoBbox}
            suggestProjections={suggestProjectionsWithFlatbush}
          />
        </div>
      </div>
    </div>
  </ContextMenu.Trigger>
  {#if selectedMapId}
    <ContextMenu.Content class="p-0 border-none bg-transparent shadow-none">
      <Menubar class="flex h-11 select-none w-fit">
        {#if selectedMapOptionsState}
          <OptionsToggles
            bind:optionsState={selectedMapOptionsState}
            {projections}
            searchProjections={searchProjectionsWithFuse}
            {geoBbox}
            suggestProjections={suggestProjectionsWithFlatbush}
          />
        {/if}
      </Menubar>
    </ContextMenu.Content>
  {/if}
</ContextMenu.Root>
