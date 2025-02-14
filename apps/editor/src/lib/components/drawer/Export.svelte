<script lang="ts">
  import { getScopeState } from '$lib/state/scope.svelte.js'

  import {
    getAnnotationUrl,
    getViewerUrl,
    getGeoJsonUrl,
    getXyzTilesUrl
  } from '$lib/shared/urls.js'

  import StartGeoreferencing from '$lib/components/StartGeoreferencing.svelte'
  import Scope from '$lib/components/drawer/Scope.svelte'
  import ExportItem from '$lib/components/ExportItem.svelte'

  const scopeState = getScopeState()
</script>

{#if scopeState.mapsCount}
  {#if scopeState.allmapsId}
    <ExportItem
      url={getViewerUrl(scopeState.allmapsId)}
      label="View in Allmaps Viewer"
    />

    <ExportItem
      url={getAnnotationUrl(scopeState.allmapsId)}
      label="Georeference Annotation"
    />

    <ExportItem
      url={getGeoJsonUrl(scopeState.allmapsId)}
      openUrl={`https://geojson.io/#data=data:text/x-url,${encodeURIComponent(getGeoJsonUrl(scopeState.allmapsId))}`}
      label="GeoJSON"
    />

    <ExportItem
      url={getXyzTilesUrl(scopeState.allmapsId)}
      label="XYZ map tiles"
    />

    <!-- TODO: add GeoTIFF script -->
    <!-- TODO: add code for OpenLayers/Leaflet/MapLibre plugins -->
  {/if}
{:else}
  <StartGeoreferencing />
{/if}
<Scope />
