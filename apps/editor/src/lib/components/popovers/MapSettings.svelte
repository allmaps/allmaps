<script lang="ts">
  import { page } from '$app/state'

  import { Select } from '@allmaps/components'

  import { createRouteUrl, getRouteId, gotoRoute } from '$lib/shared/router.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'

  const uiState = getUiState()
  const urlState = getUrlState()

  let basemapPreset = $state(uiState.basemapPreset.value)

  let backgroundGeoreferenceAnnotationUrl = $state(
    urlState.backgroundGeoreferenceAnnotationUrl
  )
  let basemapUrl = $state(urlState.basemapUrl)

  function handleBasemapUrlSubmit(event: Event) {
    event.preventDefault()

    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        'basemap-url': basemapUrl
      })
    )
  }

  function handleBackgroundGeoreferenceAnnotationUrlSubmit(event: Event) {
    event.preventDefault()

    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        'background-georeference-annotation-url':
          backgroundGeoreferenceAnnotationUrl
      })
    )
  }

  function handleBasemapPresetChange() {
    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        'basemap-preset': basemapPreset
      })
    )
  }
</script>

<div class="grid grid-cols-1 gap-2 *:break-all">
  <label for="basemap-preset">Background map:</label>
  <Select
    items={uiState.basemapPresets}
    bind:value={basemapPreset}
    onValueChange={handleBasemapPresetChange}
    type="single"
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
