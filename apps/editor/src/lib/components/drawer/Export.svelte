<script lang="ts">
  import { getSourceState } from '$lib/state/source.svelte.js'
  import { getMapsState } from '$lib/state/maps.svelte.js'
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

  const sourceState = getSourceState()
  const mapsState = getMapsState()
  const scopeState = getScopeState()

  const type = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return sourceState.source?.type
    } else if (scopeState.scope === 'image') {
      return 'image'
    } else if (scopeState.scope === 'map') {
      return 'map'
    }
  })

  const allmapsId = $derived.by(() => {
    if (scopeState.scope === 'images') {
      return sourceState.source?.allmapsId
    } else if (scopeState.scope === 'image') {
      return sourceState.activeImageAllmapsId
    } else if (scopeState.scope === 'map') {
      return mapsState.activeMapId
    }
  })
</script>

{#if scopeState.mapsCountForScope}
  {#if type && allmapsId}
    <ExportItem
      url={getViewerUrl(type, allmapsId)}
      label="View in Allmaps Viewer"
    />

    <ExportItem
      url={getAnnotationUrl(type, allmapsId)}
      label="Georeference Annotation"
    />

    <ExportItem
      url={getGeoJsonUrl(type, allmapsId)}
      openUrl={`https://geojson.io/#data=data:text/x-url,${encodeURIComponent(getGeoJsonUrl(type, allmapsId))}`}
      label="GeoJSON"
    />

    <ExportItem url={getXyzTilesUrl(type, allmapsId)} label="XYZ map tiles" />

    <!-- TODO: add GeoTIFF script -->
    <!-- TODO: add code for OpenLayers/Leaflet/MapLibre plugins -->
  {/if}
{:else}
  <StartGeoreferencing />
{/if}
<Scope />
