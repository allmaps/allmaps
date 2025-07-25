<script lang="ts">
  import { Plus } from 'phosphor-svelte'

  import { parseAnnotation } from '@allmaps/annotation'

  import { OptionsState } from './options/OptionsState.svelte'
  import OptionsButton from './options/OptionsButton.svelte'
  import OptionsBar from './options/OptionsBar.svelte'
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
    componentOptions: Partial<ViewerComponentOptions>
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
</script>

<OptionsKeys bind:optionsState />

<div class="w-full h-full">
  <WarpedMapLayerMap
    {georeferencedMaps}
    {optionsState}
    {mapOptionsStateByMapId}
    bind:selectedMapId
    {mapOrImage}
    {componentOptions}
    bind:geoBbox
  />
</div>

<div class="absolute top-0 left-0 m-2 ml-12 flex">
  <OptionsBar bind:optionsState {geoBbox} />
  <OptionsButton bind:optionsState {geoBbox} />
  {#if selectedMapOptionsState}
    <!-- <OptionsBar bind:optionsState={selectedMapOptionsState} /> -->
    <OptionsButton bind:optionsState={selectedMapOptionsState} {geoBbox} />
  {/if}
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
    <MapsListButton
      {georeferencedMaps}
      {selectedMapId}
      optionsStateByMapId={mapOptionsStateByMapId}
    />
    <Button><Plus />Add</Button>
  </div>
</div>
