<script lang="ts">
  import { MapMonster } from '@allmaps/ui'
</script>

<div class="p-4 flex flex-col justify-end items-end gap-4">
  <div
    class="p-4 relative
    pointer-events-auto
    w-[30rem]
    max-w-[90%]
    bg-[#3B44AD]
    after:border-t-[#3B44AD]
    text-white
    rounded-md
    shadow-md
    after:content-[''] after:absolute
    after:bottom-0
    after:right-28
    after:w-0
    after:h-0
    after:border-[1.2em]
    after:border-solid
    after:border-transparent
    after:border-b-0
    after:border-r-0
    after:ml-[-0.5em]
    after:mb-[-1.2em]
    "
  >
    <p class="pb-4">
      Looks like you've opened an XYZ template URL of an Allmaps Tile Server map in the
      browser. This page shows a preview of this map, but the purpose of these
      URLs is to be used in other GIS libraries or applications like <a
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
    <p>To use this map in another application, copy the XYZ template URL from the header!</p>
  </div>
  <MapMonster color="orange" mood="confused" />
</div>
