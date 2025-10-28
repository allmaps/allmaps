<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import { getAnnotationUrl, getGeoJsonUrl } from '$lib/shared/urls.js'

  import { Select } from '@allmaps/components'

  import Scope from '$lib/components/Scope.svelte'
  import ExportUrl from '$lib/components/ExportUrl.svelte'
  import Highlight from '$lib/components/Highlight.svelte'

  import { Modal } from '@allmaps/components'

  import {
    generateLeafletExample,
    generateOpenLayersExample,
    generateMapLibreExample
  } from '@allmaps/io'

  const uiState = getUiState()
  const scopeState = getScopeState()

  let geotiffScript = $derived(
    scopeState.allmapsId
      ? `curl "${getAnnotationUrl(scopeState.allmapsId)}" | \\\n  allmaps script geotiff`
      : ''
  )

  let generateAllmapsPluginCodeExample = $derived.by(() => {
    switch (uiState.selectedAllmapsPluginId) {
      case 'leaflet':
        return generateLeafletExample
      case 'openlayers':
        return generateOpenLayersExample
      case 'maplibre':
        return generateMapLibreExample
    }
  })

  let selectPortal = $state<HTMLElement>()
</script>

<Modal bind:open={uiState.modalOpen.export} class="flex flex-col gap-2">
  <div bind:this={selectPortal}></div>
  {#snippet title()}
    <div class="flex flex-col items-center gap-2 sm:flex-row">
      <span class="shrink-0 text-sm md:text-base">Export options for </span>
      <div class="w-48 text-base font-normal">
        <!-- Somehow, selectPortal is set to null when the modal closes,
         which causes an error in the bits-ui component -->
        <Scope to={selectPortal ? selectPortal : undefined} />
      </div>
    </div>
  {/snippet}

  {#if scopeState.allmapsId}
    <ExportUrl
      url={getGeoJsonUrl(scopeState.allmapsId)}
      openUrl={`https://geojson.io/#data=data:text/x-url,${encodeURIComponent(getGeoJsonUrl(scopeState.allmapsId))}`}
      label="GeoJSON"
    >
      <p>Export the mask of current map view as a GeoJSON file.</p>
    </ExportUrl>

    <div class="flex items-center gap-2">
      <h3 class="shrink-0 text-lg font-bold">Web mapping libraries</h3>
      <div class="w-42">
        <Select
          items={uiState.allmapsPlugins}
          bind:value={uiState.selectedAllmapsPluginId}
          to={selectPortal}
        />
      </div>
    </div>

    <Highlight
      value={generateAllmapsPluginCodeExample(
        getAnnotationUrl(scopeState.allmapsId),
        [0, 0],
        14
      )}
      lang="javascript"
    />

    <h3 class="text-lg font-bold">GeoTIFF</h3>

    <p>
      It's possible to turn Georeference Annotations into GeoTIFFs. To do this,
      you need to install GDAL. Install Allmaps CLI.
    </p>
    <Highlight value={geotiffScript} lang="bash" />
  {/if}
</Modal>
