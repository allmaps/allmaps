<script lang="ts">
  import { Label, Switch } from 'bits-ui'
  import { Code as CodeIcon } from 'phosphor-svelte'

  import { getScopeState } from '$lib/state/scope.svelte.js'
  import { getUiState } from '$lib/state/ui.svelte.js'

  import {
    getAnnotationUrl,
    getViewerUrl,
    getGeoJsonUrl,
    getXyzTilesUrl
  } from '$lib/shared/urls.js'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Scope from '$lib/components/Scope.svelte'
  import ExportItem from '$lib/components/ExportItem.svelte'
  import Cloud from '$lib/components/Cloud.svelte'

  const scopeState = getScopeState()
  const uiState = getUiState()
</script>

<div class="flex flex-col gap-4">
  {#if scopeState.mapsCount}
    <div class="flex items-center gap-2">
      <span class="shrink-0">Export options for</span>
      <div class="w-48">
        <Scope />
      </div>
    </div>

    {#if scopeState.allmapsId}
      <ExportItem
        url={getViewerUrl(scopeState.allmapsId)}
        label="View in Allmaps Viewer"
      />

      <ExportItem
        url={getAnnotationUrl(scopeState.allmapsId)}
        label="Georeference Annotation"
      >
        <button
          onclick={() => (uiState.modalsVisible.annotation = true)}
          class="hidden md:flex flex-row gap-1.5 px-3 py-2 rounded-full cursor-pointer
        items-center text-sm font-medium text-white
      bg-darkblue/90 hover:bg-darkblue/100 shadow-none hover:shadow-md transition-all"
        >
          <CodeIcon class="size-5 shrink-0" size="100%" weight="bold" /><span
            class="hidden sm:inline-block"
            >Code
          </span>
        </button>
      </ExportItem>

      <ExportItem
        url={getGeoJsonUrl(scopeState.allmapsId)}
        openUrl={`https://geojson.io/#data=data:text/x-url,${encodeURIComponent(getGeoJsonUrl(scopeState.allmapsId))}`}
        label="GeoJSON"
      />

      <ExportItem
        url={getXyzTilesUrl(scopeState.allmapsId, uiState.retinaTiles)}
        label="XYZ map tiles"
      >
        <div class="inline-flex items-center space-x-3">
          <Switch.Root
            bind:checked={uiState.retinaTiles}
            id="retina-tiles"
            class="focus-visible:ring-foreground focus-visible:ring-offset-background
            data-[state=checked]:bg-pink data-[state=unchecked]:bg-gray data-[state=unchecked]:shadow-md
            inset-shadow-md
            focus-visible:outline-hidden peer inline-flex h-6 min-h-6
            w-10 shrink-0 cursor-pointer items-center rounded-full px-[3px] transition-colors focus-visible:ring-2
            focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Switch.Thumb
              class="bg-white data-[state=unchecked]:shadow-md
              pointer-events-none block size-4 shrink-0 rounded-full transition-transform data-[state=checked]:translate-x-4
              data-[state=unchecked]:translate-x-0"
            />
          </Switch.Root>
          <Label.Root for="retina-tiles" class="text-sm font-medium"
            >2x resolution</Label.Root
          >
        </div>
      </ExportItem>

      <!-- TODO: add GeoTIFF script -->
      <!-- TODO: add code for OpenLayers/Leaflet/MapLibre plugins -->
    {/if}
  {:else}
    <StartGeoreferencing />
  {/if}
  <Cloud />
</div>
