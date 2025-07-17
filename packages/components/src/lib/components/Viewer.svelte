<script lang="ts">
  import { parseAnnotation } from '@allmaps/annotation'

  import WarpedMapLayerMap from './WarpedMapLayerMap.svelte'
  import MapsOverview from './MapsOverview.svelte'
  import MapOrImage from './MapOrImage.svelte'

  import type { GeoreferencedMap } from '@allmaps/annotation'

  import type { WarpedMapLayerMapComponentOptions } from './WarpedMapLayerMap.svelte'
  import OptionsButton from './options/OptionsButton.svelte'
  import { OptionsState } from './options/OptionsState.svelte'

  export type ViewerComponentOptions = WarpedMapLayerMapComponentOptions

  let {
    annotations = [],
    optionsState = $bindable(new OptionsState()),
    componentOptions = {}
  }: {
    annotations: unknown[]
    optionsState: OptionsState
    componentOptions: Partial<ViewerComponentOptions>
  } = $props()

  let selectedMapId: string | undefined = $state(undefined)
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

<div class="w-full h-full">
  <WarpedMapLayerMap
    {georeferencedMaps}
    {optionsState}
    {selectedMapId}
    {mapOrImage}
    {componentOptions}
  />
</div>

<div class="absolute z-50 top-0 w-full p-2 grid grid-cols-3">
  <div class="flex justify-start"></div>
  <div class="flex justify-center"></div>
  <div class="flex justify-end">
    <MapOrImage bind:mapOrImage disabled={selectedMapId === undefined} />
  </div>
</div>
<div class="absolute z-50 bottom-0 w-full p-2 grid grid-cols-3">
  <div class="flex justify-start">
    <OptionsButton bind:optionsState />
  </div>
  <div class="flex justify-center">
    <MapsOverview
      {georeferencedMaps}
      bind:selectedMapId
      {annotations}
      {mapOrImage}
    />
  </div>
  <div class="flex justify-end"></div>
</div>

<!--
<div class="absolute z-50 top-0 w-full h-full flex justify-center items-center">
  <MapsList {annotations} {selectedMapId} />
</div> -->
