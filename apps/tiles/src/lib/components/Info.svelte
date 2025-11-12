<script lang="ts">
  import { MapMonster } from '@allmaps/ui'

  import { getUiState } from '$lib/state/ui.svelte.js'

  const uiState = getUiState()

  type Props = {
    tileUrl?: string
  }

  let { tileUrl }: Props = $props()

  const speechBalloonBackgroundColor = 'white'
  const speechBalloonTextColor = 'black'
</script>

<div class="p-4 drop-shadow-md">
  <MapMonster
    color="green"
    mood="happy"
    {speechBalloonBackgroundColor}
    {speechBalloonTextColor}
  >
    <p class="pb-4">
      Looks like you've opened an XYZ template URL of an Allmaps Tile Server map
      in the browser. This page shows a preview of this map, but the purpose of
      these URLs is to be used in other GIS libraries or applications like <a
        class="underline"
        href="https://leafletjs.com/reference.html#tilelayer">Leaflet</a
      >,
      <a
        class="underline"
        href="https://openlayers.org/en/latest/examples/xyz.html">OpenLayers</a
      >
      ,
      <a
        class="underline"
        href="https://docs.qgis.org/3.28/en/docs/user_manual/managing_data_source/opening_data.html#using-xyz-tile-services"
        >QGIS</a
      >
      or

      {#if uiState.zoom && uiState.center && tileUrl}
        <a
          class="underline"
          href="https://www.openhistoricalmap.org/edit#map={uiState.zoom}/{uiState
            .center[1]}/{uiState
            .center[0]}&background=custom:{encodeURIComponent(tileUrl)}"
          >OpenHistoricalMap</a
        >
      {:else}
        OpenHistoricalMap
      {/if}.
    </p>
    <p>
      To use this map in another application, copy the XYZ template URL from the
      header!
    </p>
  </MapMonster>
</div>
