<script lang="ts">
  import { page } from '$app/state'

  import { Label } from 'bits-ui'
  import { Slider, Select, Checkbox } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'

  import { gotoRoute } from '$lib/shared/router.js'

  import type { BasemapPresetId, BasemapPresetItem } from '$lib/types/shared.js'

  const uiState = getUiState()
  const urlState = getUrlState()

  let basemapPresetId = $state<BasemapPresetId>(
    uiState.basemapPreset.value || 'protomaps'
  )

  let backgroundGeoreferenceAnnotationUrl = $state(
    urlState.params.backgroundGeoreferenceAnnotationUrl
  )
  let basemapXyzUrl = $state(urlState.params.basemapXyzUrl)

  function handleBasemapXyzUrlSubmit(event: Event) {
    event.preventDefault()
    urlState.params.basemapXyzUrl = basemapXyzUrl || undefined
  }

  function handleBackgroundGeoreferenceAnnotationUrlSubmit(event: Event) {
    event.preventDefault()

    urlState.params.backgroundGeoreferenceAnnotationUrl =
      backgroundGeoreferenceAnnotationUrl || undefined
  }

  function handleBasemapPresetChange(item: BasemapPresetItem) {
    if (item.value !== urlState.params.basemapPresetId) {
      urlState.params.basemapPresetId = item.value
    }
  }
</script>

<div class="grid grid-cols-1 gap-2 *:break-all">
  <h3 class="text-lg font-bold">Georeference</h3>

  <Label.Root for="georeference-warped-map-layer-opacity" class="text-sm ">
    Opacity:
  </Label.Root>

  <Slider
    id="georeference-warped-map-layer-opacity"
    bind:value={uiState.georeferenceOptions.warpedMapLayerOpacity}
  />

  <Checkbox bind:checked={uiState.georeferenceOptions.renderMasks}
    >Show mask</Checkbox
  >

  <h3 class="text-lg font-bold">Results</h3>

  <Label.Root for="results-warped-map-layer-opacity" class="text-sm ">
    Opacity:
  </Label.Root>
  <Slider
    id="results-warped-map-layer-opacity"
    bind:value={uiState.resultsOptions.warpedMapLayerOpacity}
  />

  <Checkbox bind:checked={uiState.resultsOptions.renderMasks}
    >Show masks</Checkbox
  >

  <h3 class="text-lg font-bold">Global:</h3>

  <label for="basemap-preset">Background map:</label>
  <Select
    items={uiState.basemapPresets}
    bind:value={basemapPresetId}
    onselect={handleBasemapPresetChange}
  />

  <form class="contents" onsubmit={handleBasemapXyzUrlSubmit}>
    <label for="background-xyz-url">Custom XYZ layer:</label>
    <div class="flex gap-2">
      <input
        bind:value={basemapXyzUrl}
        id="basemap-url"
        type="text"
        autocomplete="off"
        placeholder="XYZ template URL"
        class="border-1 focus-visible:border-pink inset-shadow-xs w-full rounded-lg border-solid border-gray-100 bg-white px-2 py-1
      outline-none transition-colors"
      />
      <button
        class="shrink-0 cursor-pointer rounded-md border border-gray-100 px-2 py-1 hover:bg-gray-100"
        type="submit">Load</button
      >
    </div>
  </form>

  <form
    class="contents"
    onsubmit={handleBackgroundGeoreferenceAnnotationUrlSubmit}
  >
    <label for="background-georeference-annotation-url"
      >Background Georeference Annotation:</label
    >
    <div class="flex gap-2">
      <input
        bind:value={backgroundGeoreferenceAnnotationUrl}
        id="background-georeference-annotation-url"
        type="text"
        autocomplete="off"
        placeholder="Georeference Annotation URL"
        class="border-1 focus-visible:border-pink inset-shadow-xs w-full rounded-lg border-solid border-gray-100 bg-white px-2 py-1
      outline-none transition-colors"
      />
      <button
        class="shrink-0 cursor-pointer rounded-md border border-gray-100 px-2 py-1 hover:bg-gray-100"
        type="submit">Load</button
      >
    </div>
  </form>
</div>
