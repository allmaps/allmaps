<script lang="ts">
  import { parseAnnotation } from '@allmaps/annotation'

  import OptionsButton from './options/OptionsButton.svelte'
  import WarpedMapLayerMap from './WarpedMapLayerMap.svelte'
  import MapsOverview from './MapsOverview.svelte'
  import MapOrImage from './MapOrImage.svelte'
  import OptionsKeys from './options/OptionsKeys.svelte'
  import Button from './ui/button/button.svelte'
  import { Plus } from 'phosphor-svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { WarpedMapLayerMapComponentOptions } from './WarpedMapLayerMap.svelte'
  import { OptionsState } from './options/OptionsState.svelte'
  import MapsListButton from './MapsListButton.svelte'
  import OptionsBar from './options/OptionsBar.svelte'

  export type ViewerComponentOptions = WarpedMapLayerMapComponentOptions

  let {
    annotations = [],
    optionsState = new OptionsState(),
    optionsStateByMapId = new Map(),
    componentOptions = {}
  }: {
    annotations: unknown[]
    optionsState?: OptionsState
    optionsStateByMapId?: Map<string, OptionsState>
    componentOptions: Partial<ViewerComponentOptions>
  } = $props()

  let selectedMapId: string | undefined = $state(undefined)
  let selectedMapOptionsState = $derived(
    selectedMapId ? optionsStateByMapId.get(selectedMapId) : undefined
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
    mapOptionsStateByMapId={optionsStateByMapId}
    bind:selectedMapId
    {mapOrImage}
    {componentOptions}
  />
</div>

<div class="absolute top-0 left-0 m-2 ml-12 flex">
  <OptionsBar bind:optionsState />
  <OptionsButton bind:optionsState />
  {#if selectedMapOptionsState}
    <!-- <OptionsBar bind:optionsState={selectedMapOptionsState} /> -->
    <OptionsButton bind:optionsState={selectedMapOptionsState} />
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
    <MapsListButton {georeferencedMaps} {selectedMapId} {optionsStateByMapId} />
    <Button><Plus />Add</Button>
  </div>
</div>
