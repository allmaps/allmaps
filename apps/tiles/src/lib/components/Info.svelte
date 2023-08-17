<script lang="ts">
  import { MapMonster } from '@allmaps/ui'
  import { darkblue } from '@allmaps/tailwind'

  const speechBalloonBackgroundColor = darkblue
  const speechBalloonTextColor = 'white'
</script>

<div class="p-4">
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
      or
      <a
        class="underline"
        href="https://docs.qgis.org/3.28/en/docs/user_manual/managing_data_source/opening_data.html#using-xyz-tile-services"
        >QGIS</a
      >.
    </p>
    <p>
      To use this map in another application, copy the XYZ template URL from the
      header!
    </p>
  </MapMonster>
</div>
