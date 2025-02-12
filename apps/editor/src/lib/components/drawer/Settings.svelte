<script lang="ts">
  import { page } from '$app/state'

  import { Select } from 'bits-ui'
  import {
    Check as CheckIcon,
    CaretUpDown as CaretUpDownIcon
  } from 'phosphor-svelte'

  import { createRouteUrl, getRouteId, gotoRoute } from '$lib/shared/router.js'

  import { getUiState } from '$lib/state/ui.svelte.js'
  import { getUrlState } from '$lib/state/url.svelte.js'

  import type { Selected } from 'bits-ui'

  import type { PresetBaseMapID } from '$lib/types/shared.js'

  const uiState = getUiState()
  const urlState = getUrlState()

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

  function handleBasemapPresetChange(selected?: Selected<PresetBaseMapID>) {
    gotoRoute(
      createRouteUrl(page, getRouteId(page), {
        'basemap-preset': selected?.value
      })
    )
  }
</script>

<div class="grid grid-cols-1 gap-2 *:break-all">
  <label for="basemap-preset">Background map:</label>
  <Select.Root
    disabled={urlState.basemapUrl ? urlState.basemapUrl.length > 0 : false}
    items={uiState.basemapPresets}
    selected={uiState.basemapPreset}
    onSelectedChange={handleBasemapPresetChange}
  >
    <Select.Trigger
      id="basemap-preset"
      class="cursor-pointer inline-flex w-full items-center justify-between px-2 py-1 rounded-lg bg-white outline-none
    border-solid border-gray-100 border-1 transition-colors
    focus-within:border-pink inset-shadow-xs"
      aria-label="Select a base map"
    >
      <Select.Value class="text-sm" placeholder="Select a base map" />
      <CaretUpDownIcon class="size-6" />
    </Select.Trigger>
    <Select.Content
      class="w-full rounded-lg bg-white p-1 shadow-lg outline-hidden z-50"
      sideOffset={8}
    >
      {#each uiState.basemapPresets as basemapPreset}
        <Select.Item
          class="flex h-10 w-full text-sm select-none items-center rounded-sm py-3 pl-5 pr-1.5
        hover:bg-gray-100 cursor-pointer outline-hidden transition-all"
          value={basemapPreset.value}
          label={basemapPreset.label}
        >
          {basemapPreset.label}
          <Select.ItemIndicator class="ml-auto" asChild={false}>
            <CheckIcon />
          </Select.ItemIndicator>
        </Select.Item>
      {/each}
    </Select.Content>
    <Select.Input name="select-basemap" />
  </Select.Root>

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
