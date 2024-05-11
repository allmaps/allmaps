<script lang="ts">
  import { toLonLat } from 'ol/proj.js'

  import { MapMonster } from '@allmaps/ui'
  import { darkblue } from '@allmaps/tailwind'

  import { view } from '$lib/shared/stores/view.js'

  let zoom: number | undefined
  let center: number[] | undefined

  $: {
    if ($view) {
      const viewZoom = $view.getZoom()
      if (viewZoom) {
        zoom = Math.round(viewZoom)
      }

      const viewCenter = $view.getCenter()
      if (viewCenter) {
        center = toLonLat(viewCenter)
      }
    }
  }

  export let tileUrl: string | undefined

  const speechBalloonBackgroundColor = darkblue
  const speechBalloonTextColor = 'white'
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

      {#if zoom && center && tileUrl}
        <a
          class="underline"
          href="https://www.openhistoricalmap.org/edit#map={zoom}/{center[1]}/{center[0]}&background=custom:{encodeURIComponent(
            tileUrl
          )}">OpenHistoricalMap</a
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
