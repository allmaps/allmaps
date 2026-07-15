<script lang="ts">
  import { Label } from 'bits-ui'
  import { Slider, Select, Checkbox } from '@allmaps/components'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/shared/params.js'
  import { m } from '$lib/paraglide/messages.js'

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

<div
  data-tour="editor-map-settings-popover"
  class="grid grid-cols-1 gap-2 *:break-all"
>
  <h3 class="text-lg font-bold">{m.georeference()}</h3>

  <Label.Root for="georeference-warped-map-layer-opacity" class="text-sm "
    >{m.opacity_label()}</Label.Root
  >

  <Slider
    id="georeference-warped-map-layer-opacity"
    bind:value={uiState.georeferenceOptions.warpedMapLayerOpacity}
  />

  <Checkbox bind:checked={uiState.georeferenceOptions.renderMasks}
    >{m.show_mask()}</Checkbox
  >

  <h3 class="text-lg font-bold">{m.results()}</h3>

  <Label.Root for="results-warped-map-layer-opacity" class="text-sm "
    >{m.opacity_label()}</Label.Root
  >
  <Slider
    id="results-warped-map-layer-opacity"
    bind:value={uiState.resultsOptions.warpedMapLayerOpacity}
  />

  <Checkbox bind:checked={uiState.resultsOptions.renderMasks}
    >{m.show_masks()}</Checkbox
  >

  <h3 class="text-lg font-bold">{m.global_label()}</h3>

  <label for="basemap-preset">{m.background_map_label()}</label>
  <Select
    items={uiState.basemapPresets}
    bind:value={basemapPresetId}
    onselect={handleBasemapPresetChange}
  />

  <form class="contents" onsubmit={handleBasemapXyzUrlSubmit}>
    <label for="background-xyz-url">{m.custom_xyz_layer_label()}</label>
    <div class="flex gap-2">
      <input
        bind:value={basemapXyzUrl}
        id="basemap-url"
        type="text"
        autocomplete="off"
        placeholder={m.xyz_template_url()}
        class="w-full rounded-lg border-1 border-solid border-gray-100 bg-white px-2 py-1 inset-shadow-xs transition-colors
      outline-none focus-visible:border-pink"
      />
      <button
        class="shrink-0 cursor-pointer rounded-md border border-gray-100 px-2 py-1 hover:bg-gray-100"
        type="submit">{m.load()}</button
      >
    </div>
  </form>

  <form
    class="contents"
    onsubmit={handleBackgroundGeoreferenceAnnotationUrlSubmit}
  >
    <label for="background-georeference-annotation-url"
      >{m.background_annotation_label()}</label
    >
    <div class="flex gap-2">
      <input
        bind:value={backgroundGeoreferenceAnnotationUrl}
        id="background-georeference-annotation-url"
        type="text"
        autocomplete="off"
        placeholder={m.georeference_annotation_url()}
        class="w-full rounded-lg border-1 border-solid border-gray-100 bg-white px-2 py-1 inset-shadow-xs transition-colors
      outline-none focus-visible:border-pink"
      />
      <button
        class="shrink-0 cursor-pointer rounded-md border border-gray-100 px-2 py-1 hover:bg-gray-100"
        type="submit">{m.load()}</button
      >
    </div>
  </form>
</div>
