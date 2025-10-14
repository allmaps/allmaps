<script lang="ts">
  import { untrack } from 'svelte'
  import { page } from '$app/state'

  import { Label } from 'bits-ui'
  import { Slider, Select, Checkbox } from '@allmaps/components'

  import { createRouteUrl, getView, gotoRoute } from '$lib/shared/router.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'

  import type { BasemapPresetItem } from '$lib/types/shared.js'

  const uiState = getUiState()
  const urlState = getUrlState()

  let basemapPresetId = $state(uiState.basemapPreset.value)

  let backgroundGeoreferenceAnnotationUrl = $state(
    urlState.backgroundGeoreferenceAnnotationUrl
  )
  let basemapUrl = $state(urlState.basemapUrl)

  function handleBasemapUrlSubmit(event: Event) {
    event.preventDefault()

    gotoRoute(
      createRouteUrl(page, getView(page), {
        'basemap-url': basemapUrl
      })
    )
  }

  function handleBackgroundGeoreferenceAnnotationUrlSubmit(event: Event) {
    event.preventDefault()

    gotoRoute(
      createRouteUrl(page, getView(page), {
        'background-georeference-annotation-url':
          backgroundGeoreferenceAnnotationUrl
      })
    )
  }

  function handleBasemapPresetChange(item: BasemapPresetItem) {
    untrack(() => {
      gotoRoute(
        createRouteUrl(page, getView(page), {
          'basemap-preset': item.value
        })
      )
    })
  }
</script>

<div class="grid grid-cols-1 gap-2 *:break-all">
  <h3 class="font-bold text-lg">Georeference</h3>

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

  <h3 class="font-bold text-lg">Results</h3>

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

  <h3 class="font-bold text-lg">Global:</h3>

  <label for="basemap-preset">Background map:</label>
  <Select
    items={uiState.basemapPresets}
    bind:value={basemapPresetId}
    onselect={handleBasemapPresetChange}
  />

  <form class="contents" onsubmit={handleBasemapUrlSubmit}>
    <label for="background-xyz-url">Custom XYZ layer:</label>
    <div class="flex gap-2">
      <input
        bind:value={basemapUrl}
        id="basemap-url"
        type="text"
        autocomplete="off"
        placeholder="XYZ template URL"
        class="w-full px-2 py-1 rounded-lg bg-white outline-none border-solid border-gray-100 border-1 transition-colors
      focus-visible:border-pink inset-shadow-xs"
      />
      <button
        class="cursor-pointer shrink-0 px-2 py-1 border border-gray-100 rounded-md hover:bg-gray-100"
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
        class="w-full px-2 py-1 rounded-lg bg-white outline-none border-solid border-gray-100 border-1 transition-colors
      focus-visible:border-pink inset-shadow-xs"
      />
      <button
        class="cursor-pointer shrink-0 px-2 py-1 border border-gray-100 rounded-md hover:bg-gray-100"
        type="submit">Load</button
      >
    </div>
  </form>
</div>
